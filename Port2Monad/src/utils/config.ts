import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  githubToken?: string;
  agents: {
    analyzer: {
      enabled: boolean;
      maxContextSize: number;
      timeout: number;
    };
    planner: {
      enabled: boolean;
      maxContextSize: number;
      timeout: number;
    };
    transformer: {
      enabled: boolean;
      maxContextSize: number;
      timeout: number;
    };
  };
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '8000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  githubToken: process.env.GITHUB_TOKEN,
  agents: {
    analyzer: {
      enabled: process.env.AGENT_ANALYZER_ENABLED !== 'false',
      maxContextSize: parseInt(
        process.env.AGENT_ANALYZER_MAX_CONTEXT || '32768',
        10
      ),
      timeout: parseInt(process.env.AGENT_ANALYZER_TIMEOUT || '60000', 10),
    },
    planner: {
      enabled: process.env.AGENT_PLANNER_ENABLED !== 'false',
      maxContextSize: parseInt(
        process.env.AGENT_PLANNER_MAX_CONTEXT || '32768',
        10
      ),
      timeout: parseInt(process.env.AGENT_PLANNER_TIMEOUT || '60000', 10),
    },
    transformer: {
      enabled: process.env.AGENT_TRANSFORMER_ENABLED !== 'false',
      maxContextSize: parseInt(
        process.env.AGENT_TRANSFORMER_MAX_CONTEXT || '32768',
        10
      ),
      timeout: parseInt(process.env.AGENT_TRANSFORMER_TIMEOUT || '60000', 10),
    },
  },
};

// Validate required configuration
if (!config.githubToken && config.nodeEnv === 'production') {
  logger.warn('GITHUB_TOKEN not set - GitHub operations may be limited');
}

export default config;
