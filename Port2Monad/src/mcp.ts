import {
  Server,
  Tool,
  McpError,
  ErrorCode,
  TextContent,
  ImageContent,
} from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { apiClient } from './server/http.js';
import { logger } from './utils/logger.js';
import type {
  ExplainValidateResponse,
  TransformResponse,
  PlanResponse,
  AnalyzeResponse,
  IngestResponse,
  ExplanationReport,
  ValidationReport,
} from './types/index.js';

// Initialize MCP Server
const server = new Server({
  name: 'monad-migration-mcp',
  version: '0.1.0',
});

/**
 * Tool: Ingest Repository
 * Download and parse a GitHub repository
 */
const ingestRepositoryTool: Tool = {
  name: 'ingestRepository',
  description: 'GitHub deposundan kod dosyalarını indirin ve yapı oluşturun',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryUrl: {
        type: 'string',
        description: 'GitHub repository URL (e.g., https://github.com/owner/repo)',
      },
      branch: {
        type: 'string',
        description: 'Branch name (default: main)',
        default: 'main',
      },
    },
    required: ['repositoryUrl'],
  },
};

/**
 * Tool: Analyze Solidity
 * Analyze Solidity smart contracts
 */
const analyzeSolidityTool: Tool = {
  name: 'analyzeSolidity',
  description: 'Solidity akıllı kontratlarını analiz edin ve sorunları tespit edin',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Repository ID (owner/repo format)',
      },
    },
    required: ['repositoryId'],
  },
};

/**
 * Tool: Plan Migration
 * Create migration recommendations
 */
const planMigrationTool: Tool = {
  name: 'planMigration',
  description: 'Ethereum kodunu Monad\'a uygun hale getirmek için migrasyon planı oluşturun',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Repository ID (owner/repo format)',
      },
    },
    required: ['repositoryId'],
  },
};

/**
 * Tool: Transform Code
 * Apply code transformations
 */
const transformCodeTool: Tool = {
  name: 'transformCode',
  description: 'Migrasyon planına göre kodu dönüştürün',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Repository ID (owner/repo format)',
      },
    },
    required: ['repositoryId'],
  },
};

/**
 * Tool: Explain and Validate
 * Generate explanations and validate transformed code
 */
const explainAndValidateTool: Tool = {
  name: 'explainAndValidate',
  description: 'Dönüştürülen kodu açıklayın ve doğrulayın',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Repository ID (owner/repo format)',
      },
    },
    required: ['repositoryId'],
  },
};

/**
 * Tool: Full Pipeline
 * Run the complete migration pipeline
 */
const fullPipelineTool: Tool = {
  name: 'runFullPipeline',
  description: 'Tam migrasyon pipeline\'ını çalıştırın (5 aşama)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryUrl: {
        type: 'string',
        description: 'GitHub repository URL',
      },
    },
    required: ['repositoryUrl'],
  },
};

/**
 * Tool: Query Results
 * Query previous migration results
 */
const queryResultsTool: Tool = {
  name: 'queryResults',
  description: 'Önceki migrasyon sonuçlarını sorgulayın',
  inputSchema: {
    type: 'object' as const,
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Repository ID (owner/repo format)',
      },
      stage: {
        type: 'string',
        description: 'Pipeline stage',
        enum: ['ingestion', 'analysis', 'planning', 'transformation', 'explanation'],
      },
    },
    required: ['repositoryId', 'stage'],
  },
};

// Register tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      ingestRepositoryTool,
      analyzeSolidityTool,
      planMigrationTool,
      transformCodeTool,
      explainAndValidateTool,
      fullPipelineTool,
      queryResultsTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: TextContent | ImageContent | null = null;

    switch (name) {
      case 'ingestRepository': {
        const { repositoryUrl, branch = 'main' } = args as {
          repositoryUrl: string;
          branch?: string;
        };
        logger.info({ repositoryUrl, branch }, 'MCP: Ingesting repository');

        const response = (await apiClient.api.post('/ingest', {
          repoUrl: repositoryUrl,
        })) as any;

        result = {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        };
        break;
      }

      case 'analyzeSolidity': {
        const { repositoryId } = args as { repositoryId: string };
        logger.info({ repositoryId }, 'MCP: Analyzing Solidity');

        const response = (await apiClient.api.post('/analyze/solidity', {
          repoId: repositoryId,
        })) as any;

        result = {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        };
        break;
      }

      case 'planMigration': {
        const { repositoryId } = args as { repositoryId: string };
        logger.info({ repositoryId }, 'MCP: Planning migration');

        const response = (await apiClient.api.post('/plan/migration', {
          repoId: repositoryId,
        })) as any;

        result = {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        };
        break;
      }

      case 'transformCode': {
        const { repositoryId } = args as { repositoryId: string };
        logger.info({ repositoryId }, 'MCP: Transforming code');

        const response = (await apiClient.api.post('/transform', {
          repoId: repositoryId,
        })) as any;

        result = {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        };
        break;
      }

      case 'explainAndValidate': {
        const { repositoryId } = args as { repositoryId: string };
        logger.info({ repositoryId }, 'MCP: Explaining and validating');

        const response = (await apiClient.api.post('/explain-validate', {
          repoId: repositoryId,
        })) as any;

        const data = response.data as ExplainValidateResponse;
        const summary = {
          success: data.success,
          validationReport: data.validationReport,
          explanationSummary: data.explanationJson?.entries.map((e) => ({
            file: e.filePath,
            summary: e.summary,
          })),
        };

        result = {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        };
        break;
      }

      case 'runFullPipeline': {
        const { repositoryUrl } = args as { repositoryUrl: string };
        logger.info({ repositoryUrl }, 'MCP: Running full pipeline');

        const results = await apiClient.runFullPipeline(repositoryUrl);

        const summary = {
          ingestion: results.ingest,
          analysis: results.analyze,
          planning: results.plan,
          transformation: results.transform,
          explanation: {
            success: results.explain.success,
            confidenceScore: results.explain.validationReport?.confidenceScore,
            errors: results.explain.validationReport?.errors.length || 0,
            warnings: results.explain.validationReport?.warnings.length || 0,
          },
        };

        result = {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        };
        break;
      }

      case 'queryResults': {
        const { repositoryId, stage } = args as {
          repositoryId: string;
          stage: string;
        };
        logger.info({ repositoryId, stage }, 'MCP: Querying results');

        // This would require implementing a results cache/database
        // For now, return a placeholder
        result = {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Results cache not yet implemented',
              repositoryId,
              stage,
            },
            null,
            2
          ),
        };
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [result || { type: 'text', text: 'No result' }],
    };
  } catch (error) {
    logger.error({ error, tool: name }, 'MCP tool call failed');
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Initialize server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Monad MCP Server initialized');
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start MCP server');
  process.exit(1);
});
