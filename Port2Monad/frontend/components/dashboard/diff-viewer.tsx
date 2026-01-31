'use client';

import { DiffEntry } from '@/types/api';
import { Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  filePath: string;
  diffs: DiffEntry[];
}

export function DiffViewer({ filePath, diffs }: DiffViewerProps) {
  // Group diffs into hunks for readability
  const renderDiffLine = (diff: DiffEntry, index: number) => {
    const baseClasses = 'font-mono text-sm p-3 border-l-4 flex gap-3 items-start';
    
    if (diff.type === 'add') {
      return (
        <div
          key={index}
          className={`${baseClasses} bg-green-500/10 border-l-green-500 text-green-700 dark:text-green-400`}
        >
          <Plus className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{diff.newLine}</span>
        </div>
      );
    }

    if (diff.type === 'remove') {
      return (
        <div
          key={index}
          className={`${baseClasses} bg-red-500/10 border-l-red-500 text-red-700 dark:text-red-400`}
        >
          <Minus className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="line-through">{diff.oldLine}</span>
        </div>
      );
    }

    // Context line (no change)
    return (
      <div
        key={index}
        className={`${baseClasses} bg-slate-50 dark:bg-slate-900 border-l-slate-300 dark:border-l-slate-700 text-slate-600 dark:text-slate-400`}
      >
        <span className="w-4 flex-shrink-0">&nbsp;</span>
        <span>{diff.oldLine || diff.newLine}</span>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border/40 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/40 bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-sm font-semibold truncate">{filePath}</h4>
          <div className="text-xs text-muted-foreground ml-4">
            {diffs.filter(d => d.type === 'add').length} additions •{' '}
            {diffs.filter(d => d.type === 'remove').length} deletions
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-x-auto">
        <div className="divide-y divide-border/20">
          {diffs.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No changes detected
            </div>
          ) : (
            diffs.map((diff, index) => renderDiffLine(diff, index))
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-3 bg-muted/20 border-t border-border/20 text-xs text-muted-foreground flex gap-4">
        <span className="flex items-center gap-1">
          <Plus className="w-3 h-3 text-green-600 dark:text-green-400" />
          {diffs.filter(d => d.type === 'add').length}
        </span>
        <span className="flex items-center gap-1">
          <Minus className="w-3 h-3 text-red-600 dark:text-red-400" />
          {diffs.filter(d => d.type === 'remove').length}
        </span>
        <span className="text-slate-500">
          {diffs.length} total lines
        </span>
      </div>
    </div>
  );
}
