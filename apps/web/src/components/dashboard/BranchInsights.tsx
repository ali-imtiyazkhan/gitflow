'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Trash2, AlertTriangle, CheckCircle2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { fetchBranchHealth } from '@/lib/apiClient';
import type { StaleBranchReport } from '@gitflow/shared';

interface BranchInsightsProps {
  owner: string;
  repo: string;
  onDeleteBranch?: (name: string) => void;
}

export function BranchInsights({ owner, repo, onDeleteBranch }: BranchInsightsProps) {
  const [reports, setReports] = useState<StaleBranchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBranchHealth(owner, repo);
      setReports(data);
    } catch (err) {
      console.error('Failed to load branch health', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, [owner, repo]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-purple-500" />
        <p className="text-sm font-medium">Analyzing repository health...</p>
      </div>
    );
  }

  const staleBranches = reports.filter(r => r.status === 'stale');
  const riskyBranches = reports.filter(r => r.status === 'risky');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Repository Insights
          </h2>
          <p className="text-sm text-gray-500">AI-powered analysis of your branches and potential risks.</p>
        </div>
        <button 
          onClick={loadHealth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Refresh Analysis"
        >
          <RefreshCw className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stale Branches */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Stale Branches ({staleBranches.length})
          </h3>
          {staleBranches.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-gray-400">Your repository is clean!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staleBranches.map((branch) => (
                <div key={branch.name} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-bold text-gray-700">{branch.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{branch.staleDays} days inactive</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Deletability</span>
                        <div className="flex gap-0.5">
                           {[...Array(10)].map((_, i) => (
                             <div key={i} className={clsx("h-1 w-1.5 rounded-full", i < (10 - branch.riskScore) ? "bg-red-400" : "bg-gray-200")} />
                           ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => onDeleteBranch?.(branch.name)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed italic border-l-2 border-purple-100 pl-3 ml-1">
                    <Sparkles className="h-3 w-3 inline mr-1 text-purple-400" />
                    {branch.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risky Branches */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            High Risk Divergence ({riskyBranches.length})
          </h3>
          {riskyBranches.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-gray-400">No major branch divergence detected.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {riskyBranches.map((branch) => (
                <div key={branch.name} className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-900">{branch.name}</span>
                      <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">RISKY</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-amber-700 underline">{branch.staleDays} days behind</span>
                    </div>
                  </div>
                  <p className="text-xs text-amber-800/70 leading-relaxed italic border-l-2 border-amber-200 pl-3 ml-1">
                    <Sparkles className="h-3 w-3 inline mr-1 text-amber-400" />
                    {branch.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
