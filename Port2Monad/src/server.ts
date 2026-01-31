import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  StdioServerTransport,
} from '@modelcontextprotocol/sdk/server/stdio.js';
import { getHealthStatus } from './health.js';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';

let server: Server;

function setupHandlers(srv: Server): void {
  // Setup standard request handler for resources
  srv.setRequestHandler({ type: 'object', properties: {} } as any, async (request: any) => {
    // Handle resource listing
    if (request.method === 'resources/list') {
      return {
        resources: [
          {
            uri: 'health://',
            name: 'Health Check',
            description: 'Server health status and metrics',
            mimeType: 'application/json',
          },
        ],
      };
    }

    // Handle resource reading
    if (request.method === 'resources/read') {
      const { uri } = request.params as { uri: string };
      if (uri === 'health://') {
        const health = getHealthStatus();
        return {
          contents: [
            {
              uri: 'health://',
              mimeType: 'application/json',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }
    }

    return { contents: [] };
  });
}

export async function initMcpServer(): Promise<Server> {
  // Initialize MCP Server
  server = new Server({
    name: 'monad-mcp-server',
    version: '0.1.0',
  });

  setupHandlers(server);

  logger.info(
    { host: config.host, port: config.port, env: config.nodeEnv },
    'MCP Server initialized'
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();

    server = new Server({
      name: 'monad-mcp-server',
      version: '0.1.0',
    });

    setupHandlers(server);

    await server.connect(transport);

    logger.info('MCP Server connected and listening');
  } catch (error) {
    logger.error({ error }, 'Failed to start MCP server');
    throw error;
  }
}

export function getServer(): Server {
  if (!server) {
    throw new Error('Server not initialized. Call initMcpServer() first.');
  }
  return server;
}
