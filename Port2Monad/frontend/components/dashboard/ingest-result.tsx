'use client';

import { IngestResponse } from '@/types/api';
import { CheckCircle2, FileJson, Code2, Folder } from 'lucide-react';

interface IngestResultProps {
  data: IngestResponse;
}

export function IngestResult({ data }: IngestResultProps) {
  const fileTreePreview = data.fileTree?.slice(0, 8) || [];

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Repository Ingested Successfully</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ID: <code className="bg-background px-2 py-1 rounded text-xs">{data.repositoryId}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Repository Name</p>
          <p className="font-mono font-bold text-lg">{data.repositoryName}</p>
        </div>
        <div className="p-4 bg-background rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Owner</p>
          <p className="font-mono font-bold text-lg">{data.repositoryOwner}</p>
        </div>
        <div className="p-4 bg-background rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <FileJson className="w-3 h-3" /> Total Files
          </p>
          <p className="font-mono font-bold text-lg">{data.totalFiles}</p>
        </div>
        <div className="p-4 bg-background rounded-lg border border-border/40">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Code2 className="w-3 h-3" /> Solidity Files
          </p>
          <p className="font-mono font-bold text-lg">{data.solidityFiles}</p>
        </div>
      </div>

      {/* File Tree Preview */}
      {fileTreePreview.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            File Tree Preview
          </h4>
          <div className="bg-background rounded-lg border border-border/40 p-4 font-mono text-xs space-y-1">
            {fileTreePreview.map((file, i) => (
              <div key={i} className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="text-primary/60">
                  {file.type === 'directory' ? '📁' : '📄'}
                </span>
                {' '}
                <span className={file.type === 'directory' ? 'text-primary' : ''}>
                  {file.path}
                </span>
              </div>
            ))}
            {data.fileTree && data.fileTree.length > 8 && (
              <div className="text-muted-foreground pt-2 border-t border-border/40">
                ... and {data.fileTree.length - 8} more files
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repository URL */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Repository URL</p>
        <a
          href={data.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm break-all"
        >
          {data.repositoryUrl}
        </a>
      </div>
    </div>
  );
}
