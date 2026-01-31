/**
 * Transformer Agent
 * Applies migration plan recommendations to Solidity code
 * Operates file-by-file with per-file Claude reasoning
 * Generates diffs and maintains cross-file consistency
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import {
  SolidityAnalysisResult,
  MigrationPlan,
  MigrationRecommendation,
  RepositoryTree,
  TransformedFile,
  TransformationReport,
  FileTransformReport,
  AppliedChange,
  SkippedChange,
} from '../types/index.js';
import { GitHubClient } from '../github/client.js';

const TRANSFORMATION_SYSTEM_PROMPT = `You are an expert Solidity code transformer.

Your task is to apply SPECIFIC migration recommendations to Solidity source code.

CRITICAL RULES:
1. Only apply changes explicitly described in the recommendations
2. Do NOT invent functionality or make additional changes
3. Preserve formatting, indentation, and comments unless a change requires modification
4. If a recommendation is ambiguous or unclear, respond with {"action": "skip", "reason": "..."}
5. Always preserve the overall structure - never remove logic without explicit instruction
6. Respect existing code style and patterns

For each file transformation:
- Parse the original code
- Identify the specific lines/functions mentioned in recommendations
- Apply ONLY those changes
- Return the modified code with metadata

Respond with JSON:
{
  "action": "apply" | "skip",
  "reason": "Why (if skip)",
  "appliedChanges": [
    {
      "type": "gas-optimization" | "compatibility" | "architecture" | "performance" | "security",
      "description": "What was changed",
      "originalSnippet": "Original code (2-3 lines)",
      "transformedSnippet": "New code (2-3 lines)",
      "lineRange": {"start": 10, "end": 15}
    }
  ],
  "transformedCode": "Full transformed file content",
  "warnings": ["Any issues or concerns"]
}
`;

interface TransformationContext {
  filePath: string;
  originalContent: string;
  recommendations: MigrationRecommendation[];
  contractNames: string[];
  importedContracts: string[];
}

interface PerFileTransformation {
  action: 'apply' | 'skip';
  reason?: string;
  appliedChanges: Array<{
    type: string;
    description: string;
    originalSnippet: string;
    transformedSnippet: string;
    lineRange?: { start: number; end: number };
  }>;
  transformedCode?: string;
  warnings: string[];
}

export class TransformerAgent {
  private client: Anthropic;
  private githubClient: GitHubClient;
  private migrationPlan: MigrationPlan;
  private analysisResult: SolidityAnalysisResult;
  private repositoryTree: RepositoryTree;
  private transformedFiles: Map<string, TransformedFile> = new Map();

  constructor(
    plan: MigrationPlan,
    analysis: SolidityAnalysisResult,
    tree: RepositoryTree,
    apiKey?: string
  ) {
    this.migrationPlan = plan;
    this.analysisResult = analysis;
    this.repositoryTree = tree;
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.githubClient = new GitHubClient();
    logger.info('TransformerAgent initialized');
  }

  async transformRepository(): Promise<TransformationReport> {
    logger.info(
      {
        repoName: this.repositoryTree.metadata.fullName,
        recommendations: this.migrationPlan.recommendations.length,
      },
      'Starting repository transformation'
    );

    const report: TransformationReport = {
      repositoryName: this.repositoryTree.metadata.fullName,
      timestamp: new Date().toISOString(),
      transformationId: `${this.repositoryTree.metadata.fullName}-${Date.now()}`,
      filesProcessed: 0,
      filesModified: 0,
      filesSkipped: 0,
      totalAppliedChanges: 0,
      totalSkippedChanges: 0,
      fileReports: [],
      crossFileConsistency: {
        checked: false,
        importsValid: true,
        inheritanceValid: true,
        issues: [],
      },
      summary: {
        overallConfidence: 0,
        recommendations: [],
        nextSteps: [],
      },
      errors: [],
    };

    try {
      // Group recommendations by file
      const recommendationsByFile = this.groupRecommendationsByFile();

      // Transform each file
      for (const [filePath, recommendations] of recommendationsByFile.entries()) {
        try {
          const transformed = await this.transformFile(filePath, recommendations);
          report.filesProcessed++;

          if (transformed.hasChanges) {
            report.filesModified++;
          } else {
            report.filesSkipped++;
          }

          report.totalAppliedChanges += transformed.appliedChanges.length;
          report.totalSkippedChanges += transformed.skippedChanges.length;

          this.transformedFiles.set(filePath, transformed);

          // Build file report
          const fileReport: FileTransformReport = {
            filePath,
            success: true,
            appliedChangesCount: transformed.appliedChanges.length,
            skippedChangesCount: transformed.skippedChanges.length,
            confidenceScore: transformed.confidenceScore,
            warnings: transformed.warnings,
            diffPreview: this.generateDiffPreview(
              transformed.originalContent,
              transformed.transformedContent
            ),
          };
          report.fileReports.push(fileReport);
        } catch (error) {
          report.filesProcessed++;
          report.filesSkipped++;
          report.errors.push({
            filePath,
            error: error instanceof Error ? error.message : String(error),
          });
          logger.error({ filePath, error }, 'File transformation failed');
        }
      }

      // Check cross-file consistency
      await this.validateCrossFileConsistency(report);

      // Calculate summary
      report.summary.overallConfidence =
        report.filesModified > 0
          ? Math.round(
              (report.fileReports.reduce((sum, f) => sum + f.confidenceScore, 0) /
                report.fileReports.length) *
                100
            ) / 100
          : 0;

      report.summary.recommendations = this.generateRecommendations(report);
      report.summary.nextSteps = [
        'Review transformed code in diffs/',
        'Run test suite to verify functionality',
        'Check cross-file imports and references',
        'Deploy to Monad testnet',
        'Perform load testing for parallelization benefits',
        'Audit critical contracts pre-mainnet',
      ];

      logger.info(
        {
          processed: report.filesProcessed,
          modified: report.filesModified,
          applied: report.totalAppliedChanges,
          skipped: report.totalSkippedChanges,
        },
        'Repository transformation completed'
      );

      return report;
    } catch (error) {
      logger.error({ error }, 'Repository transformation failed');
      report.errors.push({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private groupRecommendationsByFile(): Map<string, MigrationRecommendation[]> {
    const grouped = new Map<string, MigrationRecommendation[]>();

    for (const rec of this.migrationPlan.recommendations) {
      if (!grouped.has(rec.filePath)) {
        grouped.set(rec.filePath, []);
      }
      grouped.get(rec.filePath)!.push(rec);
    }

    return grouped;
  }

  private async transformFile(
    filePath: string,
    recommendations: MigrationRecommendation[]
  ): Promise<TransformedFile> {
    logger.debug({ filePath, recommendations: recommendations.length }, 'Transforming file');

    // Get original content
    const originalContent = await this.getFileContent(filePath);
    if (!originalContent) {
      throw new Error(`Could not fetch file content: ${filePath}`);
    }

    // Extract contract info
    const contract = this.analysisResult.contracts.find((c) => c.filePath === filePath);
    const contractNames = contract ? [contract.name] : [];
    const importedContracts = contract?.imports || [];

    // Build context for Claude
    const context: TransformationContext = {
      filePath,
      originalContent,
      recommendations,
      contractNames,
      importedContracts,
    };

    // Call Claude for transformation
    const transformation = await this.performFileTransformation(context);

    // Build applied and skipped changes
    const appliedChanges: AppliedChange[] = [];
    const skippedChanges: SkippedChange[] = [];

    if (transformation.action === 'apply' && transformation.appliedChanges) {
      for (let i = 0; i < transformation.appliedChanges.length; i++) {
        const change = transformation.appliedChanges[i];
        appliedChanges.push({
          changeIndex: i,
          recommendationId: `${filePath}-${i}`,
          description: change.description,
          originalCode: change.originalSnippet,
          transformedCode: change.transformedSnippet,
          lineNumbers: change.lineRange,
        });
      }
    }

    // Track skipped recommendations
    if (transformation.action === 'skip') {
      for (let i = 0; i < recommendations.length; i++) {
        skippedChanges.push({
          changeIndex: i,
          recommendationId: `${filePath}-${i}`,
          description: recommendations[i].recommendedChange,
          reason: transformation.reason || 'Ambiguous or unsafe transformation',
        });
      }
    }

    const hasChanges = appliedChanges.length > 0;
    const transformedContent = hasChanges
      ? transformation.transformedCode || originalContent
      : originalContent;

    const confidenceScore = this.calculateConfidenceScore(appliedChanges, recommendations);

    return {
      filePath,
      originalContent,
      transformedContent,
      appliedChanges,
      skippedChanges,
      hasChanges,
      confidenceScore,
      warnings: transformation.warnings || [],
    };
  }

  private async performFileTransformation(context: TransformationContext): Promise<PerFileTransformation> {
    logger.debug({ filePath: context.filePath }, 'Calling Claude for file transformation');

    const recommendationsText = context.recommendations
      .map(
        (r, i) =>
          `${i + 1}. [${r.changeCategory}] ${r.recommendedChange}\n   Rationale: ${r.rationale}`
      )
      .join('\n\n');

    const userPrompt = `Transform this Solidity file according to these migration recommendations:

FILE: ${context.filePath}
CONTRACTS: ${context.contractNames.join(', ') || 'none'}
IMPORTS: ${context.importedContracts.join(', ') || 'none'}

RECOMMENDATIONS TO APPLY:
${recommendationsText}

ORIGINAL CODE:
\`\`\`solidity
${context.originalContent}
\`\`\`

Apply ONLY the changes described above. Preserve formatting and comments. Be conservative - skip ambiguous changes.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: TRANSFORMATION_SYSTEM_PROMPT,
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
          logger.warn({ filePath: context.filePath }, 'No JSON in Claude response');
          return {
            action: 'skip',
            reason: 'Failed to parse transformation response',
            appliedChanges: [],
            warnings: ['Claude response parsing failed'],
          };
        }

        const result: PerFileTransformation = JSON.parse(jsonMatch[0]);
        logger.info(
          { filePath: context.filePath, applied: result.appliedChanges?.length || 0 },
          'File transformation completed'
        );
        return result;
      } catch (parseError) {
        logger.error({ filePath: context.filePath, parseError }, 'Failed to parse JSON response');
        return {
          action: 'skip',
          reason: 'Failed to parse Claude JSON response',
          appliedChanges: [],
          warnings: ['JSON parsing error: ' + (parseError instanceof Error ? parseError.message : String(parseError))],
        };
      }
    } catch (error) {
      logger.error({ filePath: context.filePath, error }, 'Claude transformation call failed');
      throw error;
    }
  }

  private calculateConfidenceScore(
    appliedChanges: AppliedChange[],
    recommendations: MigrationRecommendation[]
  ): number {
    if (appliedChanges.length === 0) {
      return 0;
    }

    // Base confidence on recommendation confidence levels
    const avgConfidence = recommendations.reduce((sum, r) => {
      const confidence = r.confidenceLevel === 'high' ? 0.9 : r.confidenceLevel === 'medium' ? 0.6 : 0.3;
      return sum + confidence;
    }, 0) / recommendations.length;

    // Reduce if we only applied some changes
    const applicationRate = appliedChanges.length / recommendations.length;

    return Math.round((avgConfidence * applicationRate) * 100) / 100;
  }

  private generateDiffPreview(original: string, transformed: string): string {
    if (original === transformed) {
      return '';
    }

    const originalLines = original.split('\n');
    const transformedLines = transformed.split('\n');

    const diffs: string[] = [];
    const maxLines = Math.max(originalLines.length, transformedLines.length);

    for (let i = 0; i < Math.min(maxLines, 10); i++) {
      if (originalLines[i] !== transformedLines[i]) {
        diffs.push(`-  ${originalLines[i]}`);
        diffs.push(`+  ${transformedLines[i]}`);
      }
    }

    return diffs.join('\n').substring(0, 500);
  }

  private async validateCrossFileConsistency(report: TransformationReport): Promise<void> {
    logger.debug('Validating cross-file consistency');

    report.crossFileConsistency.checked = true;
    const issues: string[] = [];

    // Check imports
    for (const [filePath, transformed] of this.transformedFiles.entries()) {
      const importMatches = transformed.transformedContent.match(/import\s+["{]([^"}]+)["}]/g) || [];

      for (const importStatement of importMatches) {
        const importPath = importStatement.match(/["']([^"']+)["']/)?.[1];
        if (importPath && !importPath.startsWith('http')) {
          // Resolve relative import
          const resolvedPath = this.resolveImport(filePath, importPath);
          if (!this.fileExists(resolvedPath) && !importPath.includes('@')) {
            issues.push(`File ${filePath}: Import not found: ${importPath}`);
            report.crossFileConsistency.importsValid = false;
          }
        }
      }
    }

    // Check inheritance consistency
    for (const contract of this.analysisResult.contracts) {
      for (const parentName of contract.inherits) {
        const parentContract = this.analysisResult.contracts.find((c) => c.name === parentName);
        if (!parentContract && !parentName.includes('@')) {
          issues.push(`Contract ${contract.name}: Parent contract not found: ${parentName}`);
          report.crossFileConsistency.inheritanceValid = false;
        }
      }
    }

    report.crossFileConsistency.issues = issues;
    if (issues.length > 0) {
      logger.warn({ issues }, 'Cross-file consistency issues detected');
    }
  }

  private resolveImport(fromFile: string, importPath: string): string {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    if (importPath.startsWith('./')) {
      return `${fromDir}/${importPath.substring(2)}`;
    }
    if (importPath.startsWith('../')) {
      const parent = fromDir.substring(0, fromDir.lastIndexOf('/'));
      return `${parent}/${importPath.substring(3)}`;
    }
    return importPath;
  }

  private fileExists(path: string): boolean {
    // Check if file exists in analyzed contracts
    return this.analysisResult.contracts.some((c) => c.filePath === path);
  }

  private generateRecommendations(report: TransformationReport): string[] {
    const recommendations: string[] = [];

    if (report.filesModified === 0) {
      recommendations.push('No transformations applied - review migration plan');
    }

    if (report.summary.overallConfidence < 0.7) {
      recommendations.push('Low confidence in transformations - manual review recommended');
    }

    if (report.crossFileConsistency.issues.length > 0) {
      recommendations.push(`Fix ${report.crossFileConsistency.issues.length} cross-file consistency issues`);
    }

    if (report.errors.length > 0) {
      recommendations.push(`Review ${report.errors.length} transformation errors`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Transformations completed successfully - ready for testing');
    }

    return recommendations;
  }

  private async getFileContent(filePath: string): Promise<string | null> {
    try {
      // Try to find in repository tree first
      const content = this.findFileInTree(this.repositoryTree.root, filePath);
      if (content) {
        return content;
      }

      // Fall back to GitHub API
      return await this.githubClient.getFileContent(
        this.repositoryTree.metadata.owner,
        this.repositoryTree.metadata.name,
        filePath
      );
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to get file content');
      return null;
    }
  }

  private findFileInTree(dir: any, targetPath: string): string | null {
    // Simple tree search - would need actual implementation
    // For now, return null to trigger GitHub API fallback
    return null;
  }
}

export async function transformRepository(
  plan: MigrationPlan,
  analysis: SolidityAnalysisResult,
  tree: RepositoryTree,
  apiKey?: string
): Promise<TransformationReport> {
  const transformer = new TransformerAgent(plan, analysis, tree, apiKey);
  return transformer.transformRepository();
}

