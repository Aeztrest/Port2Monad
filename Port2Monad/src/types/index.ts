/**
 * Centralized type definitions for the MCP server
 */

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  agents: {
    analyzer: boolean;
    planner: boolean;
    transformer: boolean;
  };
  uptime: number;
}

export interface AgentConfig {
  name: string;
  enabled: boolean;
  maxContextSize: number;
  timeout: number;
}

export interface MigrationRequest {
  repositoryUrl: string;
  targetChain: 'monad';
  analysisDepth: 'quick' | 'standard' | 'deep';
}

export interface MigrationResult {
  requestId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  analysisData?: Record<string, unknown>;
  migrationPlan?: Record<string, unknown>;
  transformedCode?: Record<string, unknown>;
  errors: string[];
}

// ==================== Repository Ingestion Types ====================

export type FileType =
  | 'solidity'
  | 'typescript'
  | 'javascript'
  | 'config'
  | 'markdown'
  | 'other';

export interface RepositoryFile {
  path: string;
  name: string;
  extension: string;
  type: FileType;
  size: number;
  sha?: string;
}

export interface RepositoryDirectory {
  path: string;
  name: string;
  files: RepositoryFile[];
  subdirectories: RepositoryDirectory[];
}

export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description?: string;
  defaultBranch: string;
  isPrivate: boolean;
  size: number;
}

export interface RepositoryTree {
  metadata: RepositoryMetadata;
  root: RepositoryDirectory;
  stats: {
    totalFiles: number;
    solidityFiles: number;
    typescriptFiles: number;
    javascriptFiles: number;
    configFiles: number;
    otherFiles: number;
    totalSize: number;
  };
  fetchedAt: string;
}

export interface IngestRequest {
  repoUrl: string;
}

export interface IngestResponse {
  success: boolean;
  metadata?: {
    owner: string;
    name: string;
    fullName: string;
  };
  stats?: {
    totalFiles: number;
    solidityFiles: number;
    typescriptFiles: number;
    javascriptFiles: number;
    configFiles: number;
    totalSize: number;
  };
  preview?: {
    root: RepositoryDirectory;
    maxDepth?: number;
  };
  error?: string;
}

// ==================== Solidity Analysis Types ====================

export type ContractType = 'contract' | 'abstract' | 'interface' | 'library';

export interface SolidityFunction {
  name: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  stateMutability?: 'pure' | 'view' | 'payable' | 'nonpayable';
  parameters: string[];
  returns: string[];
}

export interface StateVariable {
  name: string;
  type: string;
  visibility: 'public' | 'internal' | 'private';
  constant?: boolean;
  immutable?: boolean;
}

export interface SolidityContract {
  name: string;
  type: ContractType;
  filePath: string;
  imports: string[];
  inherits: string[];
  functions: SolidityFunction[];
  stateVariables: StateVariable[];
  usesUpgradeablePattern: boolean;
}

export interface DependencyEdge {
  from: string; // contract name or file path
  to: string;
  type: 'import' | 'inheritance';
}

export interface DependencyGraph {
  nodes: string[]; // contract names or file paths
  edges: DependencyEdge[];
}

export interface SolidityAnalysisResult {
  contracts: SolidityContract[];
  dependencyGraph: DependencyGraph;
  entryPointContracts: string[]; // deployable contracts
  upgradeableContracts: string[];
  stats: {
    totalContracts: number;
    abstractContracts: number;
    interfaces: number;
    libraries: number;
    totalFunctions: number;
    parseErrors: number;
  };
  parseErrors: Array<{
    filePath: string;
    error: string;
  }>;
}

export interface AnalyzeSolidityRequest {
  repoUrl: string;
}

export interface AnalyzeSolidityResponse {
  success: boolean;
  result?: SolidityAnalysisResult;
  error?: string;
}

// ==================== Migration Planning Types ====================

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface MigrationRecommendation {
  filePath: string;
  contractName: string;
  changeCategory: 
    | 'gas-optimization'
    | 'monad-feature'
    | 'evm-compatibility'
    | 'performance'
    | 'architecture'
    | 'security-consideration';
  recommendedChange: string;
  rationale: string;
  confidenceLevel: ConfidenceLevel;
  affectedContracts?: string[];
  references?: string[];
}

export interface MigrationPlan {
  repositoryName: string;
  timestamp: string;
  analysisId: string;
  monadVersion: string;
  
  recommendations: MigrationRecommendation[];
  
  summary: {
    totalFilesAnalyzed: number;
    totalContractsAnalyzed: number;
    totalRecommendations: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
  };
  
  assumptions: string[];
  limitations: string[];
  nextSteps: string[];
}

export interface PlanMigrationRequest {
  repoUrl?: string;
  repoId?: string;
}

export interface PlanMigrationResponse {
  success: boolean;
  plan?: MigrationPlan;
  error?: string;
}
// ==================== Code Transformation Types ====================

export interface AppliedChange {
  changeIndex: number;
  recommendationId: string;
  description: string;
  originalCode?: string;
  transformedCode?: string;
  lineNumbers?: {
    start: number;
    end: number;
  };
}

export interface SkippedChange {
  changeIndex: number;
  recommendationId: string;
  description: string;
  reason: string;
}

export interface TransformedFile {
  filePath: string;
  originalContent: string;
  transformedContent: string;
  appliedChanges: AppliedChange[];
  skippedChanges: SkippedChange[];
  hasChanges: boolean;
  confidenceScore: number; // 0-100
  warnings: string[];
}

export interface FileTransformReport {
  filePath: string;
  success: boolean;
  appliedChangesCount: number;
  skippedChangesCount: number;
  confidenceScore: number;
  warnings: string[];
  diffPreview?: string; // First 500 chars of diff
}

export interface CrossFileReference {
  source: string; // importing file
  target: string; // imported contract/file
  type: 'import' | 'inheritance' | 'interface';
}

export interface TransformationReport {
  repositoryName: string;
  timestamp: string;
  transformationId: string;
  
  filesProcessed: number;
  filesModified: number;
  filesSkipped: number;
  
  totalAppliedChanges: number;
  totalSkippedChanges: number;
  
  fileReports: FileTransformReport[];
  
  crossFileConsistency: {
    checked: boolean;
    importsValid: boolean;
    inheritanceValid: boolean;
    issues: string[];
  };
  
  summary: {
    overallConfidence: number;
    recommendations: string[];
    nextSteps: string[];
  };
  
  errors: Array<{
    filePath?: string;
    error: string;
  }>;
}

export interface TransformRequest {
  repoUrl?: string;
  repoId?: string;
  strict?: boolean; // If true, skip ambiguous changes
}

export interface TransformResponse {
  success: boolean;
  report?: TransformationReport;
  modifiedFiles?: string[];
  sampleDiffPreview?: string;
  error?: string;
}
// ==================== Explanation & Validation Types ====================

export interface ExplanationEntry {
  filePath: string;
  summary: string;
  detailedExplanation: string;
  relatedDiff: string;
}

export interface ExplanationReport {
  repositoryName: string;
  timestamp: string;
  entries: ExplanationEntry[];
}

export interface ValidationReport {
  repositoryName: string;
  timestamp: string;
  compilationStatus: 'success' | 'failed' | 'not-attempted';
  errors: string[];
  warnings: string[];
  confidenceScore: number;
  notes: string[];
}

export interface ExplainValidateRequest {
  repoUrl?: string;
  repoId?: string;
}

export interface ExplainValidateResponse {
  success: boolean;
  explanationMd?: string;
  explanationJson?: ExplanationReport;
  validationReport?: ValidationReport;
  error?: string;
}
