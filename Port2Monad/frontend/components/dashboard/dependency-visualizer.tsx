'use client';

import { SolidityContract } from '@/types/api';
import { ChevronRight, Zap } from 'lucide-react';
import { useState } from 'react';

interface DependencyVisualizerProps {
  contracts: SolidityContract[];
  entryPoints?: string[];
}

export function DependencyVisualizer({
  contracts,
  entryPoints = [],
}: DependencyVisualizerProps) {
  const contractMap = new Map(contracts.map(c => [c.name, c]));
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(
    new Set(entryPoints)
  );

  const toggleExpanded = (contractName: string) => {
    const newExpanded = new Set(expandedContracts);
    if (newExpanded.has(contractName)) {
      newExpanded.delete(contractName);
    } else {
      newExpanded.add(contractName);
    }
    setExpandedContracts(newExpanded);
  };

  const entryPointContracts = contracts.filter(c => c.isEntryPoint);

  if (entryPointContracts.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No entry-point contracts found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entryPointContracts.map((contract) => (
        <ContractNode
          key={contract.name}
          contract={contract}
          contractMap={contractMap}
          expanded={expandedContracts.has(contract.name)}
          onToggle={toggleExpanded}
          level={0}
        />
      ))}
    </div>
  );
}

interface ContractNodeProps {
  contract: SolidityContract;
  contractMap: Map<string, SolidityContract>;
  expanded: boolean;
  onToggle: (name: string) => void;
  level: number;
}

function ContractNode({
  contract,
  contractMap,
  expanded,
  onToggle,
  level,
}: ContractNodeProps) {
  const hasChildren = contract.inherits.length > 0 || contract.imports.length > 0;
  const indent = level * 20;

  return (
    <div>
      <div
        className="p-3 bg-background rounded-lg border border-border/40 hover:border-border transition-colors cursor-pointer flex items-center gap-2"
        style={{ marginLeft: `${indent}px` }}
        onClick={() => hasChildren && onToggle(contract.name)}
      >
        {hasChildren ? (
          <div className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-4" />
        )}
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm font-semibold flex-1">{contract.name}</span>
        <span className="text-xs text-muted-foreground">{contract.type}</span>
      </div>

      {expanded && hasChildren && (
        <ExpandedSection contract={contract} contractMap={contractMap} indent={indent} />
      )}
    </div>
  );
}

interface ExpandedSectionProps {
  contract: SolidityContract;
  contractMap: Map<string, SolidityContract>;
  indent: number;
}

function ExpandedSection({
  contract,
  contractMap,
  indent,
}: ExpandedSectionProps) {
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

  const toggleExpanded = (contractName: string) => {
    const newExpanded = new Set(expandedContracts);
    if (newExpanded.has(contractName)) {
      newExpanded.delete(contractName);
    } else {
      newExpanded.add(contractName);
    }
    setExpandedContracts(newExpanded);
  };

  return (
    <div>
      {/* Inherited contracts */}
      {contract.inherits.length > 0 && (
        <div style={{ marginLeft: `${indent + 20}px` }} className="mt-2 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            ↳ Inherits from:
          </div>
          {contract.inherits.map((parentName) => {
            const parentContract = contractMap.get(parentName);
            if (parentContract) {
              return (
                <ContractNode
                  key={parentName}
                  contract={parentContract}
                  contractMap={contractMap}
                  expanded={expandedContracts.has(parentName)}
                  onToggle={toggleExpanded}
                  level={1}
                />
              );
            }
            return (
              <div
                key={parentName}
                className="p-2 bg-background rounded text-xs text-muted-foreground"
                style={{ marginLeft: '20px' }}
              >
                <code>{parentName}</code> (external)
              </div>
            );
          })}
        </div>
      )}

      {/* Imports */}
      {contract.imports.length > 0 && (
        <div style={{ marginLeft: `${indent + 20}px` }} className="mt-2">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            ↳ Imports:
          </div>
          <div className="space-y-1">
            {contract.imports.map((importPath, i) => (
              <div
                key={i}
                className="p-2 bg-background rounded border border-border/40 text-xs text-muted-foreground"
              >
                <code className="break-all">{importPath}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

