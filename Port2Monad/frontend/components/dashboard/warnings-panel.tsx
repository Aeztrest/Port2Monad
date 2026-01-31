'use client';

import { SolidityAnalysisWarning } from '@/types/api';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface WarningsPanelProps {
  warnings: SolidityAnalysisWarning[];
}

const levelIcons = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

const levelColors = {
  info: 'bg-blue-500/10 border-blue-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  error: 'bg-red-500/10 border-red-500/20',
};

const levelTextColors = {
  info: 'text-blue-700 dark:text-blue-400',
  warning: 'text-amber-700 dark:text-amber-400',
  error: 'text-red-700 dark:text-red-400',
};

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold">No Issues Found</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This repository appears to be clean with no detected warnings or issues.
        </p>
      </div>
    );
  }

  const infoWarnings = warnings.filter(w => w.level === 'info');
  const warningWarnings = warnings.filter(w => w.level === 'warning');
  const errorWarnings = warnings.filter(w => w.level === 'error');

  return (
    <div className="space-y-3">
      {errorWarnings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Errors ({errorWarnings.length})
          </h4>
          <div className="space-y-2">
            {errorWarnings.map((warning, idx) => (
              <WarningItem key={idx} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {warningWarnings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Warnings ({warningWarnings.length})
          </h4>
          <div className="space-y-2">
            {warningWarnings.map((warning, idx) => (
              <WarningItem key={idx} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {infoWarnings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Information ({infoWarnings.length})
          </h4>
          <div className="space-y-2">
            {infoWarnings.map((warning, idx) => (
              <WarningItem key={idx} warning={warning} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WarningItem({ warning }: { warning: SolidityAnalysisWarning }) {
  return (
    <div
      className={`p-3 rounded-lg border ${levelColors[warning.level]}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {levelIcons[warning.level]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${levelTextColors[warning.level]}`}>
            {warning.contract}
          </p>
          <p className="text-sm text-foreground mt-1">{warning.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {warning.type}
          </p>
        </div>
      </div>
    </div>
  );
}
