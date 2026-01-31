'use client';

import { SolidityContract } from '@/types/api';
import { Code2, Package, BookOpen, Library } from 'lucide-react';

interface ContractListProps {
  contracts: SolidityContract[];
}

const typeIcons: Record<string, React.ReactNode> = {
  contract: <Code2 className="w-4 h-4" />,
  abstract: <Package className="w-4 h-4" />,
  interface: <BookOpen className="w-4 h-4" />,
  library: <Library className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  abstract: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  interface: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  library: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
};

export function ContractList({ contracts }: ContractListProps) {
  if (contracts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No contracts found in this repository
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contracts.map((contract, idx) => (
        <div
          key={idx}
          className="p-4 bg-background rounded-lg border border-border/40 hover:border-border transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-foreground font-semibold">{contract.name}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${typeColors[contract.type]}`}
                >
                  {typeIcons[contract.type]}
                  {contract.type}
                </span>
                {contract.isEntryPoint && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                    Entry Point
                  </span>
                )}
                {contract.isProxy && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                    Proxy
                  </span>
                )}
                {contract.hasAssembly && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                    Assembly
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {contract.filePath}
              </p>
            </div>
          </div>

          {/* Inheritance and Imports */}
          <div className="mt-3 space-y-1 text-xs">
            {contract.inherits.length > 0 && (
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">Inherits:</span>{' '}
                {contract.inherits.join(', ')}
              </div>
            )}
            {contract.imports.length > 0 && (
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">Imports:</span>{' '}
                <div className="flex flex-wrap gap-1 mt-1">
                  {contract.imports.map((imp, i) => (
                    <code
                      key={i}
                      className="bg-muted px-2 py-1 rounded text-xs break-all"
                    >
                      {imp}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
