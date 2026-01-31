'use client';

import { MigrationFileGroup } from '@/types/api';
import { PlanItem } from './plan-item';
import { ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';

interface FileGroupProps {
  fileGroup: MigrationFileGroup;
}

export function FileGroup({ fileGroup }: FileGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const priorityColor = {
    low: 'text-gray-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  }[fileGroup.priority];

  const priorityLabel = {
    low: 'Low Priority',
    medium: 'Medium Priority',
    high: 'High Priority',
  }[fileGroup.priority];

  return (
    <div className="space-y-3">
      {/* File Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border/40 rounded-lg hover:bg-card/80 transition-colors"
      >
        <ChevronRight
          className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 text-left">
          <h3 className="font-mono text-sm font-semibold text-foreground break-all">
            {fileGroup.filePath}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fileGroup.recommendations.length} recommendation
            {fileGroup.recommendations.length !== 1 ? 's' : ''}
            {fileGroup.estimatedLines && ` • ~${fileGroup.estimatedLines} lines`}
          </p>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${priorityColor}`}>
          {priorityLabel}
        </div>
      </button>

      {/* Recommendations List */}
      {expanded && (
        <div className="ml-4 space-y-3">
          {fileGroup.recommendations.map((recommendation) => (
            <PlanItem key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      )}
    </div>
  );
}
