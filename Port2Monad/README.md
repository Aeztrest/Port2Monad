# Monad: AI-Powered Blockchain Migration Platform

Monad is a full-stack, AI-driven platform for safe, automated migration of smart contract codebases to the Monad blockchain. It provides a seamless workflow for ingesting repositories, analyzing Solidity contracts, generating migration plans, and performing code transformations with developer-friendly diffs and safety signals.

## Features

- **Repository Ingestion**: Import any public smart contract repository from GitHub.
- **Solidity Analysis**: Visualize contract structure, dependencies, and warnings.
- **Migration Planning**: Get an AI-generated, risk-aware migration plan grouped by file.
- **Code Transformation**: Run safe, automated code transformations with unified git-style diffs.
- **Developer UX**: All steps in a single dashboard, with clear state transitions and safety indicators.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript
- **Backend**: Node.js, Express, TypeScript, PM2
- **AI Agents**: Modular MCP (Model Context Protocol) agents for analysis, planning, and transformation

## Quickstart

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/monad-migration-platform.git
   cd monad-migration-platform
   ```
2. **Install dependencies:**
   ```bash
   cd frontend && npm install
   cd ../ && npm install
   ```
3. **Start backend:**
   ```bash
   pm2 start src/server.ts --name monad-backend
   ```
4. **Start frontend:**
   ```bash
   cd frontend && pm2 start npm --name monad-frontend -- run start
   ```
5. **Open the dashboard:**
   - Visit [http://localhost:8092/dashboard](http://localhost:8092/dashboard)

## Workflow

1. **Ingest**: Enter a GitHub repo URL to import code.
2. **Analyze**: Run Solidity analysis for structure and warnings.
3. **Plan**: Generate a migration plan with risk/confidence signals.
4. **Transform**: Apply code transformations and review diffs.

## Example Use Case

- Migrate a Solidity project to Monad with full visibility into risks, changes, and AI recommendations—no manual code editing required.

## License

MIT

## Legacy content

## Project Structure

```
monad-mcp-server/
├── src/
│   ├── agents/               # Multi-agent workflow implementations
│   │   ├── analyzer.ts       # Code analysis agent
│   │   ├── planner.ts        # Migration planning agent
│   │   └── transformer.ts    # Code transformation agent
│   ├── github/               # GitHub repository interaction
│   │   └── client.ts         # GitHub API client
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/                # Shared utilities
│   │   ├── config.ts         # Configuration management
│   │   └── logger.ts         # Logging setup
│   ├── health.ts             # Health check endpoint
│   ├── server.ts             # MCP server initialization
│   └── index.ts              # Application entry point
├── tests/                    # Test suites
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Architecture Decisions

### 1. **Agent-based Architecture**
- **Analyzer**: Performs static and dynamic code analysis
- **Planner**: Creates structured migration plans from analysis
- **Transformer**: Executes the migration plan and generates migrated code

Each agent is independently configurable for timeout, context size, and enabled status.

### 2. **MCP Protocol Integration**
- Built on `@modelcontextprotocol/sdk` for standard AI integration
- Health check exposed as a Resource for monitoring
- Ready for Tools and Prompts registration as features are added

### 3. **Configuration Management**
- Environment-based configuration via `.env` files
- Per-agent tuning (context size, timeout, enabled state)
- Development vs production modes

### 4. **Logging & Observability**
- Pino logger for structured logging
- Pretty-printing in development, JSON in production
- Configurable log levels

### 5. **Extensibility**
- `src/tools/` directory prepared for MCP tool registration
- `src/github/` module isolated for repository interaction
- Clear separation of concerns for agent implementations

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your GitHub token

# Build
npm run build

# Run
npm start

# Development (watch mode)
npm run watch

# In another terminal
npm run dev
```

## Health Check

Query the health endpoint via MCP:
```
GET health://
```

Response includes:
- Server status (healthy/degraded/unhealthy)
- Agent availability
- Server uptime
- Version info

## Next Steps

1. **Add Agent Logic**: Implement analysis, planning, and transformation in respective agent files
2. **GitHub Integration**: Complete repository fetching and code extraction
3. **Tool Registration**: Define MCP tools for external agents to interact with
4. **Testing**: Add unit and integration tests
5. **Prompts**: Register system prompts for consistent agent behavior

## Configuration

### Environment Variables

```
NODE_ENV          - Server environment (development/production)
PORT              - Server port (default: 8000)
GITHUB_TOKEN      - GitHub API token for private repos
AGENT_*_ENABLED   - Enable/disable each agent
AGENT_*_TIMEOUT   - Agent timeout in ms
AGENT_*_MAX_CONTEXT - Max context size for agent
```

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.3+
- GitHub Token (for repository access)

## License

MIT
