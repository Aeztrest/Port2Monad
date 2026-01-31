import { startMcpServer } from './server.js';
import { createAndStartHttpServer } from './server/http.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';

let httpServer: any;

async function main(): Promise<void> {
  logger.info('Starting Monad MCP Server...');
  logger.debug({ config }, 'Configuration loaded');

  try {
    // Start HTTP server for ingestion API
    httpServer = await createAndStartHttpServer(config.port, config.host);

    // Start MCP server (optional - for stdio communication)
    try {
      await startMcpServer();
      logger.info('✓ MCP Server started (stdio mode)');
    } catch (mcpError) {
      logger.warn({ error: mcpError }, 'MCP Server failed to start (continuing with HTTP only)');
    }

    logger.info('✓ Monad HTTP Server running successfully');

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      shutdown();
    });
  } catch (error) {
    logger.error({ error }, 'Fatal error');
    process.exit(1);
  }
}

function shutdown(): void {
  if (httpServer) {
    httpServer.stop().finally(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Unhandled error');
  process.exit(1);
});
