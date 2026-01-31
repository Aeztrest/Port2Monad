'use client';

import { MigrationPlanResult } from '@/types/api';
import { PlanSummary } from './plan-summary';
import { FileGroup } from './plan-file-group';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface PlanListProps {
  plan: MigrationPlanResult;
}

export function PlanList({ plan }: PlanListProps) {
  const [showSummary, setShowSummary] = useState(true);

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Migration Plan Generated
        </h2>
        <p className="text-sm text-muted-foreground">
          Target Version: <span className="font-semibold text-foreground">{plan.targetVersion}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          This is a detailed migration plan. Review each recommendation carefully before proceeding with code transformation.
        </p>
      </div>

      {/* Summary Section */}
      <div className="border border-border/40 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full px-4 py-3 bg-card hover:bg-card/80 transition-colors flex items-center justify-between"
        >
          <h3 className="font-semibold text-foreground">Plan Summary</h3>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform ${
              showSummary ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showSummary && (
          <div className="p-4 bg-background">
            <PlanSummary plan={plan} />
          </div>
        )}
      </div>

      {/* File Groups */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground text-lg">Recommendations by File</h3>
        <div className="space-y-4">
          {plan.fileGroups.map((fileGroup) => (
            <FileGroup key={fileGroup.filePath} fileGroup={fileGroup} />
          ))}
        </div>
      </div>

      {/* Next Steps */}
      {plan.nextSteps && plan.nextSteps.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Next Steps</h3>
          <ol className="space-y-2">
            {plan.nextSteps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-accent flex-shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-card border border-border/40 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Ready to proceed? Move to the transformation step to see code changes.
        </p>
      </div>
    </div>
  );
}
