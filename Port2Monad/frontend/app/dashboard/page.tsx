'use client';

import { useState } from 'react';
import { RepositoryInput } from '@/components/dashboard/repository-input';
import { IngestResult } from '@/components/dashboard/ingest-result';
import { ContractList } from '@/components/dashboard/contract-list';
import { WarningsPanel } from '@/components/dashboard/warnings-panel';
import { DependencyVisualizer } from '@/components/dashboard/dependency-visualizer';
import { PlanList } from '@/components/dashboard/plan-list';
import { TransformationSummary } from '@/components/dashboard/transformation-summary';
import { FileList } from '@/components/dashboard/file-list';
import { DiffViewer } from '@/components/dashboard/diff-viewer';
import { ingestRepository, analyzeSolidity, planMigration, runTransformation } from '@/lib/api-client';
import { IngestResponse, SolidityAnalysisResult, MigrationPlanResult, TransformReport, TransformedFile } from '@/types/api';
import { Loader2, CheckCircle, AlertCircle, Rocket, Wand2 } from 'lucide-react';

export default function DashboardPage() {
  // Ingestion state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<IngestResponse>();

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>();
  const [analysisResult, setAnalysisResult] = useState<SolidityAnalysisResult>();

  // Planning state
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string>();
  const [planResult, setPlanResult] = useState<MigrationPlanResult>();

  // Transformation state
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformingError, setTransformingError] = useState<string>();
  const [transformResult, setTransformResult] = useState<TransformReport>();
  const [selectedFile, setSelectedFile] = useState<TransformedFile>();

  const handleIngest = async (url: string) => {
    setIsLoading(true);
    setError(undefined);
    setAnalysisResult(undefined);
    setAnalysisError(undefined);
    setPlanResult(undefined);
    setPlanningError(undefined);
    setTransformResult(undefined);
    setTransformingError(undefined);
    setSelectedFile(undefined);

    try {
      const response = await ingestRepository({ repoUrl: url });
      
      if (!response.success) {
        setError(response.error || 'Ingestion failed');
        return;
      }

      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!result) return;

    setIsAnalyzing(true);
    setAnalysisError(undefined);
    setPlanResult(undefined);
    setPlanningError(undefined);
    setTransformResult(undefined);
    setTransformingError(undefined);
    setSelectedFile(undefined);
    setPlanningError(undefined);

    try {
      const response = await analyzeSolidity({
        repoId: result.repositoryId,
      });

      if (!response.success) {
        setAnalysisError(response.error || 'Analysis failed');
        return;
      }

      setAnalysisResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlan = async () => {
    if (!result) return;

    setIsPlanning(true);
    setPlanningError(undefined);
    setTransformResult(undefined);
    setTransformingError(undefined);
    setSelectedFile(undefined);

    try {
      const response = await planMigration({
        repoId: result.repositoryId,
      });

      if (!response.success) {
        setPlanningError(response.error || 'Planning failed');
        return;
      }

      setPlanResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Planning failed';
      setPlanningError(message);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleTransform = async () => {
    if (!result) return;

    setIsTransforming(true);
    setTransformingError(undefined);
    setSelectedFile(undefined);

    try {
      const response = await runTransformation({
        repoId: result.repositoryId,
      });

      if (!response.success) {
        setTransformingError(response.error || 'Transformation failed');
        return;
      }

      setTransformResult(response);
      // Auto-select first modified file
      const firstModified = response.filesModified.find(f => f.status === 'modified');
      if (firstModified) {
        setSelectedFile(firstModified);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transformation failed';
      setTransformingError(message);
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Repository Ingestion</h1>
          <p className="text-muted-foreground">
            Analyze your smart contract repositories for migration planning
          </p>
        </div>

        {/* Input Form */}
        <RepositoryInput
          onSubmit={handleIngest}
          isLoading={isLoading}
          error={error}
        />

        {/* Result Display */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Ingestion Result</h2>
              <button
                onClick={() => {
                  setResult(undefined);
                  setAnalysisResult(undefined);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <IngestResult data={result} />

            {/* Analysis Section */}
            <div className="mt-8 pt-8 border-t border-border/40">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Solidity Analysis</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Analyze the smart contracts in this repository
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !!analysisResult}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : analysisResult ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Analysis Complete
                      </>
                    ) : (
                      'Analyze Solidity'
                    )}
                  </button>
                </div>

                {/* Analysis Error */}
                {analysisError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">{analysisError}</div>
                  </div>
                )}

                {/* Analysis Results */}
                {analysisResult && (
                  <div className="space-y-6">
                    {/* Contracts Table */}
                    <div className="bg-card border border-border/40 rounded-lg overflow-hidden">
                      <div className="p-4 border-b border-border/40">
                        <h4 className="font-semibold">Detected Contracts ({analysisResult.contracts.length})</h4>
                      </div>
                      <ContractList contracts={analysisResult.contracts} />
                    </div>

                    {/* Warnings Panel */}
                    {analysisResult.warnings.length > 0 && (
                      <div className="bg-card border border-border/40 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-border/40">
                          <h4 className="font-semibold">Analysis Warnings ({analysisResult.warnings.length})</h4>
                        </div>
                        <div className="p-4">
                          <WarningsPanel warnings={analysisResult.warnings} />
                        </div>
                      </div>
                    )}

                    {/* Dependency Visualization */}
                    {analysisResult.contracts.length > 0 && (
                      <div className="bg-card border border-border/40 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-border/40">
                          <h4 className="font-semibold">Contract Dependencies</h4>
                        </div>
                        <div className="p-4">
                          <DependencyVisualizer contracts={analysisResult.contracts} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Planning Section */}
            {analysisResult && (
              <div className="mt-8 pt-8 border-t border-border/40">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Migration Planning</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate an AI-powered migration plan with recommendations
                      </p>
                    </div>
                    <button
                      onClick={handlePlan}
                      disabled={isPlanning || !!planResult}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isPlanning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Plan...
                        </>
                      ) : planResult ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Plan Generated
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Generate Migration Plan
                        </>
                      )}
                    </button>
                  </div>

                  {/* Planning Error */}
                  {planningError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-destructive">{planningError}</div>
                    </div>
                  )}

                  {/* Plan Results */}
                  {planResult && (
                    <div className="bg-background rounded-lg border border-border/40 p-6">
                      <PlanList plan={planResult} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transformation Section */}
            {planResult && (
              <div className="mt-8 pt-8 border-t border-border/40">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Code Transformation</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Apply transformations to your smart contracts
                      </p>
                    </div>
                    <button
                      onClick={handleTransform}
                      disabled={isTransforming || !!transformResult}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isTransforming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Transforming...
                        </>
                      ) : transformResult ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Transformation Complete
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Run Transformation
                        </>
                      )}
                    </button>
                  </div>

                  {/* Transformation Error */}
                  {transformingError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-destructive">{transformingError}</div>
                    </div>
                  )}

                  {/* Transformation Results */}
                  {transformResult && (
                    <div className="space-y-6">
                      {/* Summary */}
                      <TransformationSummary report={transformResult} />

                      {/* Files and Diff Viewer */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* File List */}
                        <div className="lg:col-span-1">
                          <div className="sticky top-8">
                            <h4 className="text-sm font-semibold mb-3">Modified Files</h4>
                            <FileList
                              files={transformResult.filesModified}
                              selectedFile={selectedFile}
                              onSelectFile={setSelectedFile}
                            />
                          </div>
                        </div>

                        {/* Diff Viewer */}
                        <div className="lg:col-span-2">
                          {selectedFile ? (
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Diff Preview</h4>
                              <DiffViewer
                                filePath={selectedFile.path}
                                diffs={selectedFile.diffs}
                              />
                            </div>
                          ) : (
                            <div className="p-12 bg-muted/30 border border-border/40 rounded-lg text-center">
                              <p className="text-muted-foreground">
                                Select a file to view its changes
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="p-12 bg-muted/30 border border-border/40 rounded-lg text-center">
            <p className="text-muted-foreground">
              Enter a GitHub repository URL above to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
