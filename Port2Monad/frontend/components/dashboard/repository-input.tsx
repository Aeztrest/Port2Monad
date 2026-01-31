'use client';

import { useState } from 'react';
import { Loader2, GitBranch } from 'lucide-react';

interface RepositoryInputProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export function RepositoryInput({
  onSubmit,
  isLoading,
  error,
}: RepositoryInputProps) {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(undefined);

    // Basic validation
    if (!url.trim()) {
      setLocalError('Repository URL is required');
      return;
    }

    if (!url.includes('github.com')) {
      setLocalError('Please enter a valid GitHub repository URL');
      return;
    }

    try {
      await onSubmit(url);
      setUrl('');
    } catch (err) {
      // Error is handled by parent
    }
  };

  const displayError = error || localError;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <GitBranch className="w-6 h-6 text-primary" />
          Ingest Repository
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter a GitHub repository URL to analyze smart contracts and plan migrations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium mb-2">
            Repository URL
          </label>
          <input
            id="repo-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Example: https://github.com/ethereum/go-ethereum
          </p>
        </div>

        {displayError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{displayError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ingesting...
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4" />
              Ingest Repository
            </>
          )}
        </button>
      </form>
    </div>
  );
}
