/**
 * Repository Ingestion API Types
 */

export interface RepositoryFile {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface IngestResponse {
  success: boolean;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryUrl: string;
  totalFiles: number;
  solidityFiles: number;
  language: string;
  fileTree: RepositoryFile[];
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface IngestRequest {
  repoUrl: string;
}

export interface IngestError {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Solidity Analysis API Types
 */

export interface ContractDependency {
  type: 'import' | 'inheritance';
  name: string;
  path?: string;
}

export interface SolidityContract {
  name: string;
  type: 'contract' | 'abstract' | 'interface' | 'library';
  filePath: string;
  inherits: string[];
  imports: string[];
  dependencies: ContractDependency[];
  isEntryPoint: boolean;
  hasAssembly: boolean;
  isProxy: boolean;
  lineCount?: number;
}

export interface SolidityAnalysisWarning {
  level: 'info' | 'warning' | 'error';
  contract: string;
  message: string;
  type: string;
}

export interface SolidityAnalysisResult {
  success: boolean;
  repositoryId: string;
  contracts: SolidityContract[];
  entryPoints: string[];
  warnings: SolidityAnalysisWarning[];
  totalContracts: number;
  totalWarnings: number;
  analysisTime?: number;
  error?: string;
  timestamp?: string;
}

export interface AnalyzeRequest {
  repoId: string;
}
/**
 * Migration Planning API Types
 */

export interface MigrationRecommendation {
  id: string;
  title: string;
  description: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  risk: 'safe' | 'warning' | 'critical';
  targetVersion?: string;
  estimatedEffort?: 'low' | 'medium' | 'high';
  affectedContracts?: string[];
  codeSnippet?: string;
  examples?: string[];
}

export interface MigrationFileGroup {
  filePath: string;
  recommendations: MigrationRecommendation[];
  priority: 'low' | 'medium' | 'high';
  estimatedLines?: number;
}

export interface MigrationPlanResult {
  success: boolean;
  error?: string;
  repositoryId: string;
  targetVersion: string;
  totalRecommendations: number;
  fileGroups: MigrationFileGroup[];
  summary: {
    overview: string;
    keyPhases: string[];
    estimatedDuration?: string;
    criticalItems: number;
    warningItems: number;
    infoItems: number;
  };
  nextSteps?: string[];
  timestamp?: string;
}

export interface PlanMigrationRequest {
  repoId: string;
}

/**
 * Code Transformation API Types
 */

export interface DiffEntry {
  oldLine?: string;
  newLine?: string;
  type: 'add' | 'remove' | 'context';
  lineNumber?: number;
}

export interface TransformedFile {
  path: string;
  status: 'modified' | 'unchanged' | 'skipped';
  confidence: 'low' | 'medium' | 'high';
  changes: number;
  diffs: DiffEntry[];
  skipReason?: string;
}

export interface TransformReport {
  success: boolean;
  error?: string;
  repositoryId: string;
  transformationId: string;
  filesModified: TransformedFile[];
  summary: {
    totalFiles: number;
    filesChanged: number;
    changesApplied: number;
    changesSkipped: number;
    overallConfidence: 'low' | 'medium' | 'high';
  };
  warnings?: Array<{
    file: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  timestamp?: string;
}

export interface TransformRequest {
  repoId: string;
}