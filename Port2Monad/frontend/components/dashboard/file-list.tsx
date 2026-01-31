'use client';

import { TransformedFile } from '@/types/api';
import { FileText, AlertCircle, CheckCircle, SkipForward } from 'lucide-react';

interface FileListProps {
  files: TransformedFile[];
  selectedFile?: TransformedFile;
  onSelectFile: (file: TransformedFile) => void;
}

const statusConfig = {
  modified: {
    icon: CheckCircle,
    label: 'Modified',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
  },
  unchanged: {
    icon: FileText,
    label: 'Unchanged',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30',
  },
  skipped: {
    icon: SkipForward,
    label: 'Skipped',
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
  },
};

const confidenceConfig = {
  high: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  low: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

export function FileList({ files, selectedFile, onSelectFile }: FileListProps) {
  return (
    <div className="space-y-2">
      {files.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-border/40">
          No files to display
        </div>
      ) : (
        files.map((file) => {
          const statusConfig_ = statusConfig[file.status];
          const StatusIcon = statusConfig_.icon;
          const isSelected = selectedFile?.path === file.path;

          return (
            <button
              key={file.path}
              onClick={() => onSelectFile(file)}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border/40 bg-card hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusConfig_.color.split(' ')[0]}`} />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold truncate">
                    {file.path}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusConfig_.color}`}>
                      {statusConfig_.label}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${confidenceConfig[file.confidence]}`}>
                      {file.confidence.charAt(0).toUpperCase() + file.confidence.slice(1)} Confidence
                    </span>
                  </div>

                  {/* Changes Count */}
                  <div className="text-xs text-muted-foreground mt-2">
                    {file.changes} {file.changes === 1 ? 'change' : 'changes'} applied
                  </div>

                  {/* Skip Reason */}
                  {file.skipReason && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded text-xs text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{file.skipReason}</span>
                    </div>
                  )}
                </div>

                {/* Arrow Indicator */}
                <div className="text-muted-foreground">
                  {isSelected ? '→' : ''}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
