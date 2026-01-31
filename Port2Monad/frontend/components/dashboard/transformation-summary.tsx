'use client';

import { TransformReport } from '@/types/api';
import { Check, AlertCircle, Zap } from 'lucide-react';

interface TransformationSummaryProps {
  report: TransformReport;
}

const confidenceColors = {
  high: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
  medium: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
  low: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
};

export function TransformationSummary({ report }: TransformationSummaryProps) {
  const { summary, warnings } = report;
  const confidenceLevel = summary.overallConfidence;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold">Transformation Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Code transformation completed successfully
            </p>
          </div>
          <Check className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Files Modified */}
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Files Modified</span>
            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold">{summary.filesChanged}</div>
          <div className="text-xs text-muted-foreground mt-1">
            of {summary.totalFiles} files
          </div>
        </div>

        {/* Changes Applied */}
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Changes Applied</span>
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold">{summary.changesApplied}</div>
          <div className="text-xs text-muted-foreground mt-1">
            successful transformations
          </div>
        </div>

        {/* Changes Skipped */}
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Changes Skipped</span>
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="text-2xl font-bold">{summary.changesSkipped}</div>
          <div className="text-xs text-muted-foreground mt-1">
            require manual review
          </div>
        </div>

        {/* Overall Confidence */}
        <div className={`bg-card border rounded-lg p-4 ${confidenceColors[confidenceLevel].split(' ').slice(0, -1).join(' ')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Confidence</span>
            <Zap className="w-4 h-4 flex-shrink-0" />
          </div>
          <div className="text-2xl font-bold capitalize">{confidenceLevel}</div>
          <div className="text-xs mt-1">
            transformation reliability
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-300">
              {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'} Found
            </h4>
          </div>
          <div className="space-y-2 ml-7">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="text-sm text-yellow-800 dark:text-yellow-400 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded border border-yellow-200/50 dark:border-yellow-800/30"
              >
                <div className="font-mono text-xs text-yellow-700 dark:text-yellow-500">
                  {warning.file}
                </div>
                <div className="mt-1">{warning.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Transformation ID:</span>
            <div className="font-mono text-xs mt-1 break-all">
              {report.transformationId}
            </div>
          </div>
          {report.timestamp && (
            <div>
              <span className="text-muted-foreground">Timestamp:</span>
              <div className="text-xs mt-1">
                {new Date(report.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
