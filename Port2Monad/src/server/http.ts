/**
 * HTTP API Server
 * Temporary development server for testing ingestion
 */

import express, { Express, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { ingestRepository } from '../ingestion/repository.js';
import { analyzeSolidityRepository } from '../analysis/solidityAnalyzer.js';
import { planRepositoryMigration } from '../agents/migrationPlanner.js';
import { transformRepository } from '../agents/transformer.js';
import { explainAndValidateTransformation } from '../agents/explainerValidator.js';
import {
  IngestRequest, 
  IngestResponse, 
  RepositoryDirectory,
  AnalyzeSolidityRequest,
  AnalyzeSolidityResponse,
  RepositoryTree,
  PlanMigrationRequest,
  PlanMigrationResponse,
  TransformRequest,
  TransformResponse,
  ExplainValidateRequest,
  ExplainValidateResponse,
} from '../types/index.js';

// In-memory cache for ingested repositories (temporary)
const repoCache = new Map<string, RepositoryTree>();

// In-memory cache for analysis results
interface AnalysisCache {
  analysisResult: any;
  repoMetadata: any;
  timestamp: number;
}
const analysisCache = new Map<string, AnalysisCache>();

// In-memory cache for migration plans
interface PlanCache {
  plan: any;
  timestamp: number;
}
const planCache = new Map<string, PlanCache>();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class HttpServer {
  private app: Express;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug({ method: req.method, path: req.path }, 'Incoming request');
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // Repository ingestion endpoint
    this.app.post('/ingest', this.handleIngestRequest.bind(this));

    // Solidity analysis endpoint
    this.app.post('/analyze/solidity', this.handleAnalyzeSolidityRequest.bind(this));

    // Migration planning endpoint
    this.app.post('/plan/migration', this.handlePlanMigrationRequest.bind(this));

    // Code transformation endpoint
    this.app.post('/transform', this.handleTransformRequest.bind(this));

    // Explanation and validation endpoint
    this.app.post('/explain-validate', this.handleExplainValidateRequest.bind(this));

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        service: 'monad-mcp-server',
        version: '0.1.0',
        endpoints: {
          health: 'GET /health',
          ingest: 'POST /ingest',
          analyzeSolidity: 'POST /analyze/solidity',
          planMigration: 'POST /plan/migration',
          transform: 'POST /transform',
          explainValidate: 'POST /explain-validate',
        },
      });
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
      });
    });
  }

  private async handleIngestRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as IngestRequest;

      if (!body.repoUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: repoUrl',
        } as IngestResponse);
        return;
      }

      logger.info({ repoUrl: body.repoUrl }, 'Ingest request received');

      const tree = await ingestRepository(
        body.repoUrl,
        config.githubToken
      );

      // Build preview (limit depth to 2 levels)
      const preview = this.buildPreview(tree.root, 0, 2);

      // Cache the tree for later analysis
      const cacheKey = `${tree.metadata.owner}/${tree.metadata.name}`;
      repoCache.set(cacheKey, tree);
      logger.debug({ cacheKey }, 'Repository cached');

      const response: IngestResponse = {
        success: true,
        metadata: {
          owner: tree.metadata.owner,
          name: tree.metadata.name,
          fullName: tree.metadata.fullName,
        },
        stats: {
          totalFiles: tree.stats.totalFiles,
          solidityFiles: tree.stats.solidityFiles,
          typescriptFiles: tree.stats.typescriptFiles,
          javascriptFiles: tree.stats.javascriptFiles,
          configFiles: tree.stats.configFiles,
          totalSize: tree.stats.totalSize,
        },
        preview: {
          root: preview,
          maxDepth: 2,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Ingest request failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as IngestResponse);
    }
  }

  private async handleAnalyzeSolidityRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as AnalyzeSolidityRequest;

      if (!body.repoUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: repoUrl',
        } as AnalyzeSolidityResponse);
        return;
      }

      logger.info({ repoUrl: body.repoUrl }, 'Analyze Solidity request received');

      // Check cache first, otherwise ingest
      let repoTree: RepositoryTree;
      const urlParts = body.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlParts) {
        res.status(400).json({
          success: false,
          error: 'Invalid GitHub repository URL',
        } as AnalyzeSolidityResponse);
        return;
      }

      const cacheKey = `${urlParts[1]}/${urlParts[2].replace(/\.git$/, '')}`;
      
      if (repoCache.has(cacheKey)) {
        logger.info({ cacheKey }, 'Using cached repository');
        repoTree = repoCache.get(cacheKey)!;
      } else {
        logger.info({ cacheKey }, 'Ingesting repository for analysis');
        repoTree = await ingestRepository(body.repoUrl, config.githubToken);
        repoCache.set(cacheKey, repoTree);
      }

      // Analyze Solidity code
      const analysisResult = await analyzeSolidityRepository(
        repoTree,
        config.githubToken
      );

      const response: AnalyzeSolidityResponse = {
        success: true,
        result: analysisResult,
      };

      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Analyze Solidity request failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AnalyzeSolidityResponse);
    }
  }

  private async handlePlanMigrationRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as PlanMigrationRequest;

      if (!body.repoUrl && !body.repoId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: repoUrl or repoId',
        } as PlanMigrationResponse);
        return;
      }

      logger.info({ repoUrl: body.repoUrl, repoId: body.repoId }, 'Plan migration request received');

      let cacheKey: string | null = null;

      if (body.repoId) {
        cacheKey = body.repoId;
      } else if (body.repoUrl) {
        // Parse repo info
        const urlParts = body.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlParts) {
          res.status(400).json({
            success: false,
            error: 'Invalid GitHub repository URL',
          } as PlanMigrationResponse);
          return;
        }
        cacheKey = `${urlParts[1]}/${urlParts[2].replace(/\.git$/, '')}`;
      }

      if (!cacheKey) {
        res.status(400).json({
          success: false,
          error: 'Unable to resolve repository identifier',
        } as PlanMigrationResponse);
        return;
      }

      // Check if we have cached analysis
      const cached = analysisCache.get(cacheKey);
      let analysisResult = cached?.analysisResult;
      let repoMetadata = cached?.repoMetadata;

      if (!analysisResult) {
        logger.info({ cacheKey }, 'Analysis not cached, running ingestion and analysis');

        // Ingest repository if not cached
        let repoTree: RepositoryTree;
        if (repoCache.has(cacheKey)) {
          logger.info({ cacheKey }, 'Using cached repository');
          repoTree = repoCache.get(cacheKey)!;
        } else {
          if (!body.repoUrl) {
            res.status(400).json({
              success: false,
              error: 'Repository not cached; provide repoUrl to ingest',
            } as PlanMigrationResponse);
            return;
          }
          logger.info({ cacheKey }, 'Ingesting repository for analysis');
          repoTree = await ingestRepository(body.repoUrl, config.githubToken);
          repoCache.set(cacheKey, repoTree);
        }

        // Analyze Solidity code
        analysisResult = await analyzeSolidityRepository(repoTree, config.githubToken);
        repoMetadata = repoTree.metadata;
        analysisCache.set(cacheKey, {
          analysisResult,
          repoMetadata,
          timestamp: Date.now(),
        });
      } else {
        logger.info({ cacheKey }, 'Using cached analysis');
        if (!repoMetadata && repoCache.has(cacheKey)) {
          repoMetadata = repoCache.get(cacheKey)!.metadata;
        }
      }

      if (!repoMetadata) {
        res.status(500).json({
          success: false,
          error: 'Repository metadata unavailable for migration planning',
        } as PlanMigrationResponse);
        return;
      }

      // Plan migration using Claude
      const migrationPlan = await planRepositoryMigration(
        repoMetadata,
        analysisResult,
        process.env.ANTHROPIC_API_KEY
      );

      // Truncate recommendations if large
      const MAX_RECOMMENDATIONS = 200;
      if (migrationPlan.recommendations.length > MAX_RECOMMENDATIONS) {
        migrationPlan.recommendations = migrationPlan.recommendations.slice(0, MAX_RECOMMENDATIONS);
        migrationPlan.limitations.push(
          `Recommendations truncated to first ${MAX_RECOMMENDATIONS} items for response size limits`
        );
      }

      // Cache the plan for transformation
      planCache.set(cacheKey, { plan: migrationPlan, timestamp: Date.now() });

      const response: PlanMigrationResponse = {
        success: true,
        plan: migrationPlan,
      };

      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Plan migration request failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as PlanMigrationResponse);
    }
  }

  private async handleTransformRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as TransformRequest;

      if (!body.repoUrl && !body.repoId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: repoUrl or repoId',
        } as TransformResponse);
        return;
      }

      logger.info({ repoUrl: body.repoUrl, repoId: body.repoId }, 'Transform request received');

      let cacheKey: string | null = null;

      if (body.repoId) {
        cacheKey = body.repoId;
      } else if (body.repoUrl) {
        const urlParts = body.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlParts) {
          res.status(400).json({
            success: false,
            error: 'Invalid GitHub repository URL',
          } as TransformResponse);
          return;
        }
        cacheKey = `${urlParts[1]}/${urlParts[2].replace(/\.git$/, '')}`;
      }

      if (!cacheKey) {
        res.status(400).json({
          success: false,
          error: 'Unable to resolve repository identifier',
        } as TransformResponse);
        return;
      }

      // Get cached repository tree
      let tree = repoCache.get(cacheKey);
      if (!tree) {
        const repoUrl = body.repoUrl || `https://github.com/${cacheKey}`;
        logger.info({ repoUrl }, 'Repository not in cache, fetching');
        tree = await ingestRepository(repoUrl, config.githubToken);
        repoCache.set(cacheKey, tree);
      }

      // Get or generate analysis
      let analysisCache_ = analysisCache.get(cacheKey);
      if (!analysisCache_ || Date.now() - analysisCache_.timestamp > CACHE_TTL_MS) {
        logger.info({ cacheKey }, 'Analysis not in cache or expired, analyzing');
        const analysisResult = await analyzeSolidityRepository(tree);
        analysisCache.set(cacheKey, {
          analysisResult,
          repoMetadata: tree.metadata,
          timestamp: Date.now(),
        });
        analysisCache_ = analysisCache.get(cacheKey)!;
      }

      const { analysisResult, repoMetadata } = analysisCache_;

      // Get or generate migration plan
      let planCache_ = planCache.get(cacheKey);
      if (!planCache_ || Date.now() - planCache_.timestamp > CACHE_TTL_MS) {
        logger.info({ cacheKey }, 'Plan not in cache or expired, planning');
        const migrationPlan = await planRepositoryMigration(
          repoMetadata,
          analysisResult,
          process.env.ANTHROPIC_API_KEY
        );
        planCache.set(cacheKey, { plan: migrationPlan, timestamp: Date.now() });
        planCache_ = planCache.get(cacheKey)!;
      }

      const migrationPlan = planCache_.plan;

      // Perform transformation
      logger.info({ cacheKey, recommendations: migrationPlan.recommendations.length }, 'Starting transformation');
      const report = await transformRepository(
        migrationPlan,
        analysisResult,
        tree,
        process.env.ANTHROPIC_API_KEY
      );

      // Get modified files
      const modifiedFiles = report.fileReports
        .filter((f) => f.appliedChangesCount > 0)
        .map((f) => f.filePath);

      // Get sample diff from first modified file
      const sampleFile = report.fileReports.find((f) => f.diffPreview);
      const sampleDiffPreview = sampleFile?.diffPreview || '';

      const response: TransformResponse = {
        success: true,
        report,
        modifiedFiles,
        sampleDiffPreview,
      };

      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Transform request failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as TransformResponse);
    }
  }

  private async handleExplainValidateRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as ExplainValidateRequest;

      if (!body.repoUrl && !body.repoId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: repoUrl or repoId',
        } as ExplainValidateResponse);
        return;
      }

      logger.info(
        { repoUrl: body.repoUrl, repoId: body.repoId },
        'Explain-validate request received'
      );

      let cacheKey: string | null = null;

      if (body.repoId) {
        cacheKey = body.repoId;
      } else if (body.repoUrl) {
        const urlParts = body.repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!urlParts) {
          res.status(400).json({
            success: false,
            error: 'Invalid GitHub repository URL',
          } as ExplainValidateResponse);
          return;
        }
        cacheKey = `${urlParts[1]}/${urlParts[2].replace(/\.git$/, '')}`;
      }

      if (!cacheKey) {
        res.status(400).json({
          success: false,
          error: 'Unable to resolve repository identifier',
        } as ExplainValidateResponse);
        return;
      }

      // Get cached data (build it if needed)
      let tree = repoCache.get(cacheKey);
      if (!tree) {
        const repoUrl = body.repoUrl || `https://github.com/${cacheKey}`;
        logger.info({ repoUrl }, 'Repository not in cache, fetching');
        tree = await ingestRepository(repoUrl, config.githubToken);
        repoCache.set(cacheKey, tree);
      }

      let analysisCache_ = analysisCache.get(cacheKey);
      if (!analysisCache_ || Date.now() - analysisCache_.timestamp > CACHE_TTL_MS) {
        logger.info({ cacheKey }, 'Analysis not in cache, analyzing');
        const analysisResult = await analyzeSolidityRepository(tree);
        analysisCache.set(cacheKey, {
          analysisResult,
          repoMetadata: tree.metadata,
          timestamp: Date.now(),
        });
        analysisCache_ = analysisCache.get(cacheKey)!;
      }

      const { analysisResult, repoMetadata } = analysisCache_;

      let planCache_ = planCache.get(cacheKey);
      if (!planCache_ || Date.now() - planCache_.timestamp > CACHE_TTL_MS) {
        logger.info({ cacheKey }, 'Plan not in cache, planning');
        const migrationPlan = await planRepositoryMigration(
          repoMetadata,
          analysisResult,
          process.env.ANTHROPIC_API_KEY
        );
        planCache.set(cacheKey, { plan: migrationPlan, timestamp: Date.now() });
        planCache_ = planCache.get(cacheKey)!;
      }

      const migrationPlan = planCache_.plan;

      // Get or generate transformation
      logger.info({ cacheKey }, 'Transforming repository');
      const transformationReport = await transformRepository(
        migrationPlan,
        analysisResult,
        tree,
        process.env.ANTHROPIC_API_KEY
      );

      // Get modified files and create diffs map
      const modifiedFiles = transformationReport.fileReports
        .filter((f) => f.appliedChangesCount > 0)
        .map((f) => f.filePath);

      const diffs = new Map<string, string>();
      transformationReport.fileReports.forEach((f) => {
        if (f.diffPreview) {
          diffs.set(f.filePath, f.diffPreview);
        }
      });

      // Perform explanation and validation
      logger.info(
        { modifiedFiles: modifiedFiles.length },
        'Generating explanations and validating'
      );
      const { explanationReport, validationReport } = await explainAndValidateTransformation(
        transformationReport,
        migrationPlan,
        analysisResult,
        modifiedFiles,
        diffs,
        process.env.ANTHROPIC_API_KEY
      );

      // Convert explanation to markdown
      const explanationMd = this.convertExplanationToMarkdown(explanationReport);

      const response: ExplainValidateResponse = {
        success: true,
        explanationMd,
        explanationJson: explanationReport,
        validationReport,
      };

      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Explain-validate request failed');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ExplainValidateResponse);
    }
  }

  private convertExplanationToMarkdown(explanationReport: any): string {
    let md = `# Migration Explanation Report\n\n`;
    md += `**Repository:** ${explanationReport.repositoryName}\n`;
    md += `**Generated:** ${explanationReport.timestamp}\n\n`;

    if (explanationReport.entries.length === 0) {
      md += `No explanations available.\n`;
      return md;
    }

    for (const entry of explanationReport.entries) {
      md += `## ${entry.filePath}\n\n`;
      md += `### Summary\n${entry.summary}\n\n`;
      md += `### Detailed Explanation\n${entry.detailedExplanation}\n\n`;
      md += `### Related Change\n\`\`\`\n${entry.relatedDiff}\n\`\`\`\n\n`;
    }

    return md;
  }

  private buildPreview(
    dir: RepositoryDirectory,
    currentDepth: number,
    maxDepth: number
  ): RepositoryDirectory {
    // Limit preview to maxDepth levels
    if (currentDepth >= maxDepth) {
      return {
        path: dir.path,
        name: dir.name,
        files: dir.files.slice(0, 10), // Show max 10 files per directory
        subdirectories: [],
      };
    }

    return {
      path: dir.path,
      name: dir.name,
      files: dir.files.slice(0, 10), // Show max 10 files per directory
      subdirectories: dir.subdirectories
        .slice(0, 5) // Show max 5 subdirectories
        .map((subdir) => this.buildPreview(subdir, currentDepth + 1, maxDepth)),
    };
  }

  async start(port: number = 8000, host: string = '0.0.0.0'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          logger.info({ host, port }, 'HTTP Server started');
          resolve();
        });
      } catch (error) {
        logger.error({ error }, 'Failed to start HTTP server');
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: any) => {
          if (error) {
            logger.error({ error }, 'Error closing HTTP server');
            reject(error);
          } else {
            logger.info('HTTP Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

export async function createAndStartHttpServer(
  port: number = 8000,
  host: string = '0.0.0.0'
): Promise<HttpServer> {
  const server = new HttpServer();
  await server.start(port, host);
  return server;
}
