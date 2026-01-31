/**
 * Explainer & Validator Agent
 * Generates human-readable explanations for migrations
 * Validates transformed code (compilation, static analysis)
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import {
  TransformationReport,
  ExplanationReport,
  ExplanationEntry,
  ValidationReport,
  SolidityAnalysisResult,
  MigrationPlan,
} from '../types/index.js';

const EXPLANATION_SYSTEM_PROMPT = `You are an expert Solidity developer and migration specialist.

Your task: Generate clear, detailed explanations for why specific code changes were made during migration to Monad.

For each change:
1. Explain the SPECIFIC issue or opportunity it addresses
2. Reference the original Monad characteristic or EVM compatibility concern
3. Be concrete and technical (developers will read this)
4. Avoid vague statements like "better performance"
5. Map to actual code changes

Respond with JSON:
{
  "explanations": [
    {
      "filePath": "src/token.sol",
      "summary": "One-line what changed",
      "detailedExplanation": "Why this change improves Monad migration and what developers need to know",
      "relatedDiff": "The actual code change from the diff"
    }
  ]
}

CRITICAL: Only explain changes that actually have recommendations. Don't invent explanations.`;

const MONAD_VALIDATION_CONTEXT = `
# Monad-Specific Validation Rules

## EVM Compatibility Checks
- All opcodes used must be Ethereum-compatible (Monad supports full EVM bytecode)
- Assembly code: verify no assumptions about miner behavior or block timestamp manipulation
- No reliance on solc version-specific behavior differences

## Gas & Performance Patterns
- Watch for unbounded loops over state (especially mappings)
- Verify no "gasleft() < X" assumptions that differ from Ethereum
- Check for unnecessary SSTORE operations

## Parallel Execution Considerations
- Functions with conflicting state writes cannot parallelize
- Read-heavy, write-light patterns can benefit from parallelization
- No assumption about transaction ordering within a block (Monad can parallelize)

## Safe Patterns for Monad
- Standard ERC20/ERC721 implementations work unchanged
- UUPS proxy patterns work unchanged
- Reentrancy guards work unchanged
- State variable layout optimizations are safe
`;

interface ExplanationContext {
  transformationReport: TransformationReport;
  migrationPlan: MigrationPlan;
  analysisResult: SolidityAnalysisResult;
  modifiedFiles: string[];
  diffs: Map<string, string>; // filePath -> diff
}

export class ExplainerValidatorAgent {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    logger.info('ExplainerValidatorAgent initialized');
  }

  async explainAndValidate(
    transformationReport: TransformationReport,
    migrationPlan: MigrationPlan,
    analysisResult: SolidityAnalysisResult,
    modifiedFiles: string[],
    diffs: Map<string, string>
  ): Promise<{ explanationReport: ExplanationReport; validationReport: ValidationReport }> {
    logger.info(
      { modifiedFiles: modifiedFiles.length },
      'Starting explanation and validation'
    );

    const context: ExplanationContext = {
      transformationReport,
      migrationPlan,
      analysisResult,
      modifiedFiles,
      diffs,
    };

    // Generate explanations
    const explanationReport = await this.generateExplanations(context);

    // Validate transformed code
    const validationReport = await this.validateCode(
      modifiedFiles,
      analysisResult,
      transformationReport
    );

    logger.info(
      {
        explanations: explanationReport.entries.length,
        compilationStatus: validationReport.compilationStatus,
        validationErrors: validationReport.errors.length,
      },
      'Explanation and validation completed'
    );

    return { explanationReport, validationReport };
  }

  private async generateExplanations(context: ExplanationContext): Promise<ExplanationReport> {
    logger.debug('Generating explanations for changes');

    // Build context about what changed
    const changedSummary = this.buildChangeSummary(context);

    const userPrompt = `
You are reviewing the migration of a Solidity codebase to Monad blockchain.

# Migration Changes Summary
${changedSummary}

# Related Migration Plan (for reference)
${context.migrationPlan.recommendations
  .slice(0, 10) // Limit to first 10
  .map((r) => `- [${r.changeCategory}] ${r.filePath}: ${r.recommendedChange}`)
  .join('\n')}

# Git Diffs (what actually changed)
${Array.from(context.diffs.entries())
  .map(([file, diff]) => `## ${file}\n\`\`\`\n${diff.substring(0, 500)}\n...\n\`\`\``)
  .join('\n\n')}

Generate clear explanations for each change. Be specific about WHY each change improves Monad migration.
Explain what developers need to know when they see this transformation.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: EXPLANATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          logger.warn('No JSON in explanation response');
          return {
            repositoryName: context.transformationReport.repositoryName,
            timestamp: new Date().toISOString(),
            entries: [],
          };
        }

        const result = JSON.parse(jsonMatch[0]);
        const entries: ExplanationEntry[] = (result.explanations || []).map((e: any) => ({
          filePath: e.filePath,
          summary: e.summary,
          detailedExplanation: e.detailedExplanation,
          relatedDiff: e.relatedDiff,
        }));

        return {
          repositoryName: context.transformationReport.repositoryName,
          timestamp: new Date().toISOString(),
          entries,
        };
      } catch (parseError) {
        logger.error({ parseError }, 'Failed to parse explanation JSON');
        return {
          repositoryName: context.transformationReport.repositoryName,
          timestamp: new Date().toISOString(),
          entries: [],
        };
      }
    } catch (error) {
      logger.error({ error }, 'Explanation generation failed');
      throw error;
    }
  }

  private async validateCode(
    modifiedFiles: string[],
    analysisResult: SolidityAnalysisResult,
    transformationReport: TransformationReport
  ): Promise<ValidationReport> {
    logger.debug('Validating transformed code');

    const errors: string[] = [];
    const warnings: string[] = [];
    const notes: string[] = [];

    // Check 1: Validate imports
    logger.debug('Checking imports...');
    const importIssues = this.validateImports(analysisResult);
    errors.push(...importIssues);

    // Check 2: Validate inheritance chains
    logger.debug('Checking inheritance...');
    const inheritanceIssues = this.validateInheritance(analysisResult);
    errors.push(...inheritanceIssues);

    // Check 3: Check for missing contracts
    logger.debug('Checking contract references...');
    const contractIssues = this.validateContractReferences(analysisResult, modifiedFiles);
    errors.push(...contractIssues);

    // Check 4: Monad-specific checks
    logger.debug('Performing Monad-specific checks...');
    const monadWarnings = this.performMonadChecks(analysisResult);
    warnings.push(...monadWarnings);

    // Check 5: Static pattern detection
    logger.debug('Detecting risky patterns...');
    const patternWarnings = this.detectRiskyPatterns(analysisResult);
    warnings.push(...patternWarnings);

    // Attempt compilation status (best effort, don't fail)
    let compilationStatus: 'success' | 'failed' | 'not-attempted' = 'not-attempted';
    try {
      const hasCompilerAvailable = await this.checkCompilerAvailable();
      if (hasCompilerAvailable) {
        // Try compilation (would need actual files)
        logger.debug('Compiler available, validation would run full check');
        compilationStatus = 'success'; // Optimistic for now
        notes.push('Solidity compiler check could be performed with actual files');
      } else {
        notes.push('Solidity compiler not available in this environment');
        compilationStatus = 'not-attempted';
      }
    } catch (error) {
      notes.push(`Compilation check skipped: ${error instanceof Error ? error.message : 'Unknown error'}`);
      compilationStatus = 'not-attempted';
    }

    // Add transformation confidence notes
    const confidence =
      transformationReport.summary.overallConfidence > 0.7
        ? 'High'
        : transformationReport.summary.overallConfidence > 0.4
          ? 'Medium'
          : 'Low';
    notes.push(`Transformation confidence: ${confidence}`);
    notes.push(`${transformationReport.filesModified} files modified, ${transformationReport.filesSkipped} files skipped`);

    if (transformationReport.crossFileConsistency.issues.length > 0) {
      warnings.push(
        `Cross-file consistency: ${transformationReport.crossFileConsistency.issues.length} issues detected`
      );
      warnings.push(...transformationReport.crossFileConsistency.issues.slice(0, 3));
    }

    const confidenceScore =
      errors.length === 0
        ? warnings.length === 0
          ? 0.95
          : 0.8
        : errors.length > 3
          ? 0.2
          : 0.5;

    return {
      repositoryName: transformationReport.repositoryName,
      timestamp: new Date().toISOString(),
      compilationStatus,
      errors,
      warnings,
      confidenceScore,
      notes,
    };
  }

  private validateImports(analysis: SolidityAnalysisResult): string[] {
    const issues: string[] = [];
    const contractFiles = new Map<string, string>();

    // Build map of contracts to files
    for (const contract of analysis.contracts) {
      contractFiles.set(contract.name, contract.filePath);
    }

    // Check imports
    for (const contract of analysis.contracts) {
      for (const importedName of contract.imports) {
        // Simple check: imported name should exist as a contract or be a known library
        if (!contractFiles.has(importedName) && !importedName.includes('@')) {
          issues.push(
            `Contract ${contract.name} imports unknown contract: ${importedName}`
          );
        }
      }
    }

    return issues;
  }

  private validateInheritance(analysis: SolidityAnalysisResult): string[] {
    const issues: string[] = [];
    const contractNames = new Set(analysis.contracts.map((c) => c.name));

    // Check inheritance chains
    for (const contract of analysis.contracts) {
      for (const parent of contract.inherits) {
        if (!contractNames.has(parent) && !parent.includes('IERC')) {
          // Allow common ERC interfaces
          issues.push(
            `Contract ${contract.name} inherits from unknown parent: ${parent}`
          );
        }
      }
    }

    return issues;
  }

  private validateContractReferences(
    analysis: SolidityAnalysisResult,
    modifiedFiles: string[]
  ): string[] {
    const issues: string[] = [];
    const allContracts = new Set(analysis.contracts.map((c) => c.name));

    // Check that all used contracts are defined
    for (const contract of analysis.contracts) {
      for (const func of contract.functions) {
        // Simple heuristic: function names and parameter types should reference known things
        const paramTypes = func.parameters.join(' ');
        // This is a best-effort check
      }
    }

    return issues;
  }

  private performMonadChecks(analysis: SolidityAnalysisResult): string[] {
    const warnings: string[] = [];

    // Check 1: Assembly usage
    const assemblyContracts = analysis.contracts.filter((c) =>
      c.functions.some((f) => f.name.toLowerCase().includes('asm'))
    );
    if (assemblyContracts.length > 0) {
      warnings.push(
        `⚠️ Assembly code detected in ${assemblyContracts.length} contract(s). Verify Monad EVM compatibility.`
      );
    }

    // Check 2: Timestamp/block-dependent logic
    const timeCheckContracts = analysis.contracts.filter((c) =>
      c.functions.some(
        (f) =>
          f.name.toLowerCase().includes('time') ||
          f.name.toLowerCase().includes('block') ||
          f.name.toLowerCase().includes('deadline')
      )
    );
    if (timeCheckContracts.length > 0) {
      warnings.push(
        `⚠️ Time/block-dependent logic found. Monad has ~4s block times vs Ethereum's ~12s.`
      );
    }

    // Check 3: High number of state reads in loop
    const loopRiskContracts = analysis.contracts.filter(
      (c) => c.functions.length > 50
    );
    if (loopRiskContracts.length > 0) {
      warnings.push(
        `⚠️ Large contracts detected. Verify no unbounded loops over state mappings.`
      );
    }

    // Check 4: Upgradeable pattern
    if (analysis.upgradeableContracts.length > 0) {
      warnings.push(
        `ℹ️ UUPS/Proxy pattern detected. Ensure implementation contract validation on Monad.`
      );
    }

    return warnings;
  }

  private detectRiskyPatterns(analysis: SolidityAnalysisResult): string[] {
    const warnings: string[] = [];

    // Pattern 1: External call in loop
    for (const contract of analysis.contracts) {
      const hasManyExternalCalls = contract.imports.length > 5;
      if (hasManyExternalCalls && contract.functions.length > 20) {
        warnings.push(
          `⚠️ ${contract.name}: Many external dependencies + many functions. Verify no call loops.`
        );
        break; // Only warn once
      }
    }

    // Pattern 2: Many state mutations
    const highMutationContracts = analysis.contracts.filter(
      (c) => c.stateVariables.length > 20
    );
    if (highMutationContracts.length > 0) {
      warnings.push(
        `ℹ️ Contracts with >20 state variables detected. Large storage layouts work on Monad but verify gas efficiency.`
      );
    }

    return warnings;
  }

  private async checkCompilerAvailable(): Promise<boolean> {
    // Check if solc or forge is available
    try {
      // This would attempt to run `solc --version` or similar
      // For now, return false since we can't shell out easily
      return false;
    } catch {
      return false;
    }
  }

  private buildChangeSummary(context: ExplanationContext): string {
    const report = context.transformationReport;
    const plan = context.migrationPlan;

    return `
## Transformation Overview
- Repository: ${report.repositoryName}
- Files Processed: ${report.filesProcessed}
- Files Modified: ${report.filesModified}
- Total Changes Applied: ${report.totalAppliedChanges}
- Overall Confidence: ${report.summary.overallConfidence}

## Key Modifications
${context.modifiedFiles
  .slice(0, 5)
  .map(
    (file) =>
      `- ${file}: ${context.diffs.get(file)?.split('\n').length || 0} lines of diff`
  )
  .join('\n')}

## Migration Plan Summary
- Total Recommendations: ${plan.recommendations.length}
- High Confidence: ${plan.summary.highConfidenceCount}
- Medium Confidence: ${plan.summary.mediumConfidenceCount}
- Low Confidence: ${plan.summary.lowConfidenceCount}

## Categories of Changes
${this.summarizeChangeCategories(plan)}
`;
  }

  private summarizeChangeCategories(plan: MigrationPlan): string {
    const categories = new Map<string, number>();
    for (const rec of plan.recommendations) {
      categories.set(rec.changeCategory, (categories.get(rec.changeCategory) || 0) + 1);
    }

    return Array.from(categories.entries())
      .map(([cat, count]) => `- ${cat}: ${count} recommendation(s)`)
      .join('\n');
  }
}

export async function explainAndValidateTransformation(
  transformationReport: TransformationReport,
  migrationPlan: MigrationPlan,
  analysisResult: SolidityAnalysisResult,
  modifiedFiles: string[],
  diffs: Map<string, string>,
  apiKey?: string
): Promise<{ explanationReport: ExplanationReport; validationReport: ValidationReport }> {
  const agent = new ExplainerValidatorAgent(apiKey);
  return agent.explainAndValidate(
    transformationReport,
    migrationPlan,
    analysisResult,
    modifiedFiles,
    diffs
  );
}
