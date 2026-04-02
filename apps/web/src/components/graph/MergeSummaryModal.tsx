'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Sparkles, Loader2, Info, GitMerge, AlertCircle } from 'lucide-react';
import { useMerge } from '@/hooks/useMerge';
import type { AIAnalysis } from '@gitflow/shared';

interface MergeSummaryModalProps {
  owner: string;
  repo: string;
  source: string;
  target: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MergeSummaryModal({ owner, repo, source, target, onConfirm, onCancel }: MergeSummaryModalProps) {
  const { getMergeSummary } = useMerge(owner, repo);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getMergeSummary(target, source); // base is target, head is source
        setAnalysis(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate AI summary');
      } finally {
        setIsLoading(false);
      }
    }
    loadSummary();
  }, [owner, repo, source, target, getMergeSummary]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-xl dark:bg-indigo-900/30">
                <GitMerge className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Merge Preview</h2>
                <p className="text-xs text-gray-500 font-medium">AI Impact Analysis</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-gray-800">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 py-4 mb-6 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-900">
            <span className="font-mono text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300">{source}</span>
            <div className="flex items-center gap-1">
               <div className="h-0.5 w-4 bg-gray-300" />
               <GitMerge className="h-4 w-4 text-gray-400" />
               <div className="h-0.5 w-4 bg-gray-300" />
            </div>
            <span className="font-mono text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300">{target}</span>
          </div>

          <div className="min-h-[160px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">AI is summarizing changes...</p>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    AI Summary
                  </div>
                  <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    analysis?.riskLevel === 'high' ? "bg-red-100 text-red-700" :
                    analysis?.riskLevel === 'medium' ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  )}>
                    {analysis?.riskLevel} Risk
                  </span>
                </div>
                
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-relaxed">
                    {analysis?.summaryText}
                  </p>
                  <ul className="space-y-1.5">
                    {analysis?.bullets.map((bullet, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                        <span className="text-purple-400 font-bold">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                  <Info className="h-3.5 w-3.5 text-gray-400" />
                  This summary covers logic changes, risk assessments, and architectural impact.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 dark:bg-gray-950 dark:border-gray-900 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
          >
            Confirm Merge
          </button>
        </div>
      </div>
    </div>
  );
}
