'use client';

import { MigrationPlanResult } from '@/types/api';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface PlanSummaryProps {
  plan: MigrationPlanResult;
}

export function PlanSummary({ plan }: PlanSummaryProps) {
  const { summary } = plan;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="bg-card border border-border/40 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">{summary.overview}</p>
      </div>

      {/* Key Phases */}
      {summary.keyPhases && summary.keyPhases.length > 0 && (
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">Key Phases</h3>
          <ol className="space-y-2">
            {summary.keyPhases.map((phase, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-primary flex-shrink-0">{idx + 1}.</span>
                <span>{phase}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Critical */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Critical</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{summary.criticalItems}</p>
        </div>

        {/* Warnings */}
        <div className="bg-yellow-100/40 border border-yellow-200/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{summary.warningItems}</p>
        </div>

        {/* Info */}
        <div className="bg-blue-100/40 border border-blue-200/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Info</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.infoItems}</p>
        </div>

        {/* Total */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Total</span>
          </div>
          <p className="text-2xl font-bold text-primary">{plan.totalRecommendations}</p>
        </div>
      </div>

      {/* Estimated Duration */}
      {summary.estimatedDuration && (
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Estimated Duration</h3>
          <p className="text-sm text-muted-foreground">{summary.estimatedDuration}</p>
        </div>
      )}
    </div>
  );
}
