/**
 * Migration Planner Agent
 * Uses Claude to generate Monad-specific migration recommendations
 * based on deterministic Solidity AST analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import {
  SolidityAnalysisResult,
  MigrationPlan,
  MigrationRecommendation,
  ConfidenceLevel,
  RepositoryMetadata,
} from '../types/index.js';

const MONAD_KNOWLEDGE_BASE = `
# Monad Blockchain - Migration Context

## About Monad
Monad is a high-performance, EVM-equivalent blockchain designed for scalability and throughput.
- EVM bytecode compatible (all existing contracts should work)
- Consensus: Proof of Stake with novel parallelization
- Execution: Parallel transaction execution with deterministic ordering
- Gas model: Similar to Ethereum with potential optimizations

## Key Characteristics
1. **Parallelization**: Contracts can be parallelized if they don't have conflicting state writes
2. **Performance**: Lower latency block times (estimated 1-4 seconds vs 12s Ethereum)
3. **Gas Efficiency**: Potential for slight gas improvements due to parallelization
4. **Compatibility**: Full EVM bytecode compatibility (no recompilation needed)

## Migration Considerations
- No language changes needed (Solidity works unchanged)
- Consider state access patterns for parallelization benefits
- Assembly code compatibility needs verification
- Proxy patterns and UUPS are compatible
- Verify external dependencies are available on Monad

## Optimization Opportunities
1. **State Access Patterns**: Minimize cross-contract state reads in hot paths
2. **Storage Layout**: Consider field ordering for gas efficiency
3. **Event Emission**: Indexing strategy same as Ethereum
4. **Gas Limits**: Block gas limit on Monad (to be confirmed)
5. **Timestamp/Block**: Use same assumptions as Ethereum

## Risk Areas
- External calls to non-migratable contracts
- Time-dependent logic (miner/validator behavior)
- Memory access in assembly
- Storage collision patterns
- Flash loan attacks (still possible)
`;

const SYSTEM_PROMPT = `You are an expert Solidity smart contract architect specializing in blockchain migration.

Your role is to analyze a Solidity codebase's AST and dependency graph, then produce migration recommendations 
for deploying to Monad blockchain.

IMPORTANT CONSTRAINTS:
1. Do NOT generate or rewrite any Solidity code
2. Do NOT make formatting or stylistic recommendations
3. Be CONSERVATIVE in recommendations - only suggest changes that improve correctness or safety
4. Use the provided AST analysis instead of re-analyzing code
5. Reason across files using the dependency graph
6. Explicitly state assumptions where information is incomplete
7. Do NOT hallucinate Monad features - stick to known capabilities

Your recommendations should be:
- Specific and actionable
- Grounded in the actual code structure (from AST)
- Justified with clear rationale
- Confidence-rated (low/medium/high)

${MONAD_KNOWLEDGE_BASE}

Respond with a JSON array of migration recommendations following this schema:
[
  {
    "filePath": "contracts/Token.sol",
    "contractName": "Token",
    "changeCategory": "gas-optimization|monad-feature|evm-compatibility|performance|architecture|security-consideration",
    "recommendedChange": "Brief description of what should change (NOT code)",
    "rationale": "Why this change improves migration to Monad",
    "confidenceLevel": "low|medium|high",
    "affectedContracts": ["OtherContract"],
    "references": ["Section 3.2 of Monad spec"]
  }
]

Only output valid JSON, no additional text.
`;

export class MigrationPlanner {
  private client: Anthropic;
  private monadVersion: string = '1.0.0';

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    logger.info('MigrationPlanner initialized with Claude backend');
  }

  async planMigration(
    repoMetadata: RepositoryMetadata,
    analysisResult: SolidityAnalysisResult
  ): Promise<MigrationPlan> {
    logger.info(
      { repo: repoMetadata.fullName, contracts: analysisResult.stats.totalContracts },
      'Starting migration planning'
    );

    try {
      // Build context from analysis
      const context = this.buildContext(repoMetadata, analysisResult);

      // Call Claude with context
      const recommendations = await this.generateRecommendations(context);

      // Structure the plan
      const plan: MigrationPlan = {
        repositoryName: repoMetadata.fullName,
        timestamp: new Date().toISOString(),
        analysisId: `${repoMetadata.fullName}-${Date.now()}`,
        monadVersion: this.monadVersion,
        recommendations,
        summary: {
          totalFilesAnalyzed: analysisResult.contracts.length,
          totalContractsAnalyzed: analysisResult.stats.totalContracts,
          totalRecommendations: recommendations.length,
          highConfidenceCount: recommendations.filter((r) => r.confidenceLevel === 'high').length,
          mediumConfidenceCount: recommendations.filter((r) => r.confidenceLevel === 'medium').length,
          lowConfidenceCount: recommendations.filter((r) => r.confidenceLevel === 'low').length,
        },
        assumptions: this.buildAssumptions(analysisResult),
        limitations: this.buildLimitations(analysisResult),
        nextSteps: [
          'Review recommendations and categorize by priority',
          'Create a deployment checklist based on high-confidence items',
          'Set up testnet environment on Monad',
          'Deploy and test each contract migration in isolation',
          'Perform load testing for parallelization scenarios',
          'Audit critical contracts pre-mainnet deployment',
        ],
      };

      logger.info({ recommendations: plan.summary }, 'Migration planning completed');

      return plan;
    } catch (error) {
      logger.error({ error, repo: repoMetadata.fullName }, 'Migration planning failed');
      throw error;
    }
  }

  private buildContext(
    repoMetadata: RepositoryMetadata,
    analysis: SolidityAnalysisResult
  ): string {
    const contractSummary = analysis.contracts
      .map((c) => {
        return `
Contract: ${c.name}
  Type: ${c.type}
  File: ${c.filePath}
  Functions: ${c.functions.length} (${c.functions.filter((f) => f.visibility === 'public').length} public/external)
  State Variables: ${c.stateVariables.length}
  Imports: ${c.imports.join(', ') || 'none'}
  Inherits: ${c.inherits.join(', ') || 'none'}
  Upgradeable Pattern: ${c.usesUpgradeablePattern ? 'yes' : 'no'}
`;
      })
      .join('\n');

    const dependencySummary = this.summarizeDependencies(analysis);

    const riskFlags = this.identifyRiskFlags(analysis);

    return `
  REPOSITORY: ${repoMetadata.fullName}
  URL: ${repoMetadata.url}
  DEFAULT BRANCH: ${repoMetadata.defaultBranch}
  PRIVATE: ${repoMetadata.isPrivate ? 'yes' : 'no'}
  DESCRIPTION: ${repoMetadata.description || 'none'}

## Contract Summary
${contractSummary}

## Dependency Graph
${dependencySummary}

## Risk Flags Detected
${riskFlags.length > 0 ? riskFlags.map((f) => `- ${f}`).join('\n') : 'None identified'}

## Analysis Stats
- Total Contracts: ${analysis.stats.totalContracts}
- Abstract Contracts: ${analysis.stats.abstractContracts}
- Interfaces: ${analysis.stats.interfaces}
- Libraries: ${analysis.stats.libraries}
- Parse Errors: ${analysis.stats.parseErrors}

## Entry Points (Deployable)
${analysis.entryPointContracts.join('\n') || 'None identified'}

## Upgradeable Contracts
${analysis.upgradeableContracts.join('\n') || 'None detected'}
`;
  }

  private summarizeDependencies(analysis: SolidityAnalysisResult): string {
    const imports = analysis.contracts
      .flatMap((c) => c.imports.map((imp) => `${c.name} → ${imp}`))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    const inheritance = analysis.contracts
      .flatMap((c) => c.inherits.map((inh) => `${c.name} extends ${inh}`))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    return `
Imports (top 10):
${imports.join('\n') || 'None'}

Inheritance (top 10):
${inheritance.join('\n') || 'None'}

Cross-contract dependencies: ${analysis.dependencyGraph.edges.length} edges
`;
  }

  private identifyRiskFlags(analysis: SolidityAnalysisResult): string[] {
    const flags: string[] = [];

    // Check for assembly usage (from function names with 'asm' or similar)
    const hasAssembly = analysis.contracts.some((c) =>
      c.functions.some((f) => f.name.toLowerCase().includes('asm'))
    );
    if (hasAssembly) {
      flags.push('Assembly code detected - requires verification for bytecode compatibility');
    }

    // Check for upgradeable patterns
    if (analysis.upgradeableContracts.length > 0) {
      flags.push(
        `Proxy pattern detected (${analysis.upgradeableContracts.length} upgradeable contracts) - ensure implementation compatibility`
      );
    }

    // High number of external calls
    const highExternalCallCount = analysis.contracts.filter(
      (c) => c.imports.length > 5
    ).length;
    if (highExternalCallCount > 0) {
      flags.push(
        `${highExternalCallCount} contracts with multiple external dependencies - verify all are available on Monad`
      );
    }

    // Parse errors
    if (analysis.parseErrors.length > 0) {
      flags.push(
        `${analysis.parseErrors.length} parse errors detected - some contracts could not be analyzed`
      );
    }

    return flags;
  }

  private async generateRecommendations(context: string): Promise<MigrationRecommendation[]> {
    logger.debug('Calling Claude for migration recommendations');

    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this Solidity codebase for Monad migration and provide recommendations:\n\n${context}`,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Try to parse JSON
    let recommendations: MigrationRecommendation[] = [];

    try {
      // Extract JSON array from response (might have extra text)
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      recommendations = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Response is not an array');
      }

      logger.info(
        { count: recommendations.length },
        'Generated migration recommendations from Claude'
      );

      return recommendations;
    } catch (error) {
      logger.error({ error, response: content.text }, 'Failed to parse Claude response');

      // Return empty recommendations with log for debugging
      return [
        {
          filePath: 'general',
          contractName: 'General',
          changeCategory: 'architecture',
          recommendedChange: 'Review Claude response for detailed recommendations',
          rationale: 'LLM analysis completed but response parsing requires verification',
          confidenceLevel: 'low',
        },
      ];
    }
  }

  private buildAssumptions(analysis: SolidityAnalysisResult): string[] {
    const assumptions: string[] = [
      'Monad maintains full EVM bytecode compatibility',
      'Solidity compiler versions used are compatible with EVM target',
      'External dependencies exist or will be deployed to Monad',
      'Block time and gas model assumptions match Ethereum',
      'No reliance on specific validator/miner behavior (MEV)',
    ];

    if (analysis.parseErrors.length > 0) {
      assumptions.push(
        'Some contracts could not be fully analyzed due to parse errors - manual review recommended'
      );
    }

    if (analysis.contracts.some((c) => c.usesUpgradeablePattern)) {
      assumptions.push('UUPS/proxy patterns are compatible with Monad as-is');
    }

    return assumptions;
  }

  private buildLimitations(analysis: SolidityAnalysisResult): string[] {
    const limitations: string[] = [
      'AST analysis does not include runtime behavior or potential exploits',
      'Gas optimization suggestions are estimates - actual gas costs may vary',
      'Assembly code analysis is limited - manual review required',
      'External library compatibility cannot be fully determined from source analysis',
    ];

    if (analysis.parseErrors.length > 0) {
      limitations.push(`${analysis.parseErrors.length} contracts could not be analyzed`);
    }

    return limitations;
  }
}

export async function planRepositoryMigration(
  repoMetadata: RepositoryMetadata,
  analysisResult: SolidityAnalysisResult,
  apiKey?: string
): Promise<MigrationPlan> {
  const planner = new MigrationPlanner(apiKey);
  return planner.planMigration(repoMetadata, analysisResult);
}
