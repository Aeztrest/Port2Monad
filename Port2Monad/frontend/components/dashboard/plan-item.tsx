'use client';

import { MigrationRecommendation } from '@/types/api';
import { ConfidenceBadge } from './plan-confidence-badge';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface PlanItemProps {
  recommendation: MigrationRecommendation;
}

export function PlanItem({ recommendation }: PlanItemProps) {
  const [expanded, setExpanded] = useState(false);

  const riskColor = {
    safe: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-yellow-500',
    critical: 'border-l-4 border-l-red-500',
  }[recommendation.risk];

  return (
    <div className={`bg-background rounded-lg border border-border/40 ${riskColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              {recommendation.title}
              {recommendation.targetVersion && (
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  {recommendation.targetVersion}
                </span>
              )}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {recommendation.description}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Badges */}
        <div className="mt-3">
          <ConfidenceBadge confidence={recommendation.confidence} risk={recommendation.risk} />
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 py-4 bg-muted/30 border-t border-border/40 space-y-4">
          {/* Rationale */}
          <div>
            <h5 className="text-sm font-semibold text-foreground mb-1">Rationale</h5>
            <p className="text-sm text-muted-foreground">{recommendation.rationale}</p>
          </div>

          {/* Affected Contracts */}
          {recommendation.affectedContracts && recommendation.affectedContracts.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-foreground mb-2">Affected Contracts</h5>
              <div className="flex flex-wrap gap-2">
                {recommendation.affectedContracts.map((contract) => (
                  <span
                    key={contract}
                    className="px-2 py-1 bg-background border border-border/40 rounded text-xs text-muted-foreground"
                  >
                    {contract}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Effort */}
          {recommendation.estimatedEffort && (
            <div>
              <h5 className="text-sm font-semibold text-foreground mb-1">Estimated Effort</h5>
              <p className="text-sm text-muted-foreground capitalize">{recommendation.estimatedEffort}</p>
            </div>
          )}

          {/* Code Snippet */}
          {recommendation.codeSnippet && (
            <div>
              <h5 className="text-sm font-semibold text-foreground mb-2">Code Reference</h5>
              <pre className="bg-background p-3 rounded border border-border/40 text-xs overflow-x-auto">
                <code className="text-muted-foreground">{recommendation.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* Examples */}
          {recommendation.examples && recommendation.examples.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-foreground mb-2">Examples</h5>
              <ul className="space-y-2">
                {recommendation.examples.map((example, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
