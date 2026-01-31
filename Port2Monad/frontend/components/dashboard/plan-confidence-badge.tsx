'use client';

import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: 'low' | 'medium' | 'high';
  risk: 'safe' | 'warning' | 'critical';
}

export function ConfidenceBadge({ confidence, risk }: ConfidenceBadgeProps) {
  const confidenceMap = {
    low: { label: 'Low', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    high: { label: 'High', color: 'bg-green-100 text-green-700 border-green-200' },
  };

  const riskMap = {
    safe: { icon: CheckCircle, color: 'text-green-600', label: 'Safe' },
    warning: { icon: AlertCircle, color: 'text-yellow-600', label: 'Review' },
    critical: { icon: Shield, color: 'text-red-600', label: 'Critical' },
  };

  const confidenceConfig = confidenceMap[confidence];
  const riskConfig = riskMap[risk];
  const RiskIcon = riskConfig.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`px-2 py-1 rounded border text-xs font-medium ${confidenceConfig.color}`}>
        {confidenceConfig.label} confidence
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${riskConfig.color}`}>
        <RiskIcon className="w-3 h-3" />
        {riskConfig.label}
      </div>
    </div>
  );
}
