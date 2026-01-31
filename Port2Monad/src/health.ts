import { HealthCheckResponse } from './types/index.js';
import { config } from './utils/config.js';

const startTime = Date.now();

export function getHealthStatus(): HealthCheckResponse {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    agents: {
      analyzer: config.agents.analyzer.enabled,
      planner: config.agents.planner.enabled,
      transformer: config.agents.transformer.enabled,
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

export function checkAgentHealth(agentName: string): boolean {
  const agent = config.agents[agentName as keyof typeof config.agents];
  return agent?.enabled ?? false;
}
