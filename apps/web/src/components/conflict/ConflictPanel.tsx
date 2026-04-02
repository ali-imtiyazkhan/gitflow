'use client';

import { useState } from 'react';
import { X, CheckCheck, AlertTriangle, ChevronDown, ChevronRight, FileCode, Sparkles, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useGraphStore } from '@/store/graphStore';
import { useMerge } from '@/hooks/useMerge';
import type { ConflictFile, ResolveConflictRequest, AIAnalysis } from '@gitflow/shared';
import { HunkResolver } from './HunkResolver';

interface ConflictPanelProps {
  owner: string;
  repo: string;
}

export function ConflictPanel({ owner, repo }: ConflictPanelProps) {
  const { activeConflict, abortMerge, isMerging } = useGraphStore();
  const { resolveConflictAction, analyzeMerge, getAICommitMessage } = useMerge(owner, repo);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [globalAnalysis, setGlobalAnalysis] = useState<AIAnalysis | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  if (!activeConflict || !isMerging) return null;

  const totalConflicts  = activeConflict.files.reduce((s, f) => s + f.totalConflicts, 0);
  const totalResolved   = activeConflict.files.reduce((s, f) => s + f.resolvedConflicts, 0);
  const allResolved     = totalResolved === totalConflicts;

  const handleGenerateAICommitMessage = async () => {
    setIsGeneratingMessage(true);
    try {
      const allHunks = activeConflict.files.flatMap(f => f.hunks);
      const message = await getAICommitMessage(allHunks);
      setCommitMessage(message);
    } catch (err) {
      console.error('Failed to generate commit message', err);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  return (
    <aside className="flex w-[400px] flex-shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Merge Conflicts</span>
          <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
            {totalConflicts - totalResolved} remaining
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!activeConflict) return;
              setIsAnalyzing(true);
              try {
                const allHunks = activeConflict.files.flatMap(f => f.hunks);
                const result = await analyzeMerge(allHunks);
                setGlobalAnalysis(result);
              } finally {
                setIsAnalyzing(false);
              }
            }}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Analysis
          </button>
          
          <button
            onClick={abortMerge}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Global Analysis Result */}
      {globalAnalysis && (
        <div className="mx-4 mt-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4 animate-in slide-in-from-top-2 duration-300">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                 <Sparkles className="h-3.5 w-3.5" />
                 Merge Impact Summary
              </div>
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                globalAnalysis.riskLevel === 'high' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
              )}>
                {globalAnalysis.riskLevel} Risk
              </span>
              <button onClick={() => setGlobalAnalysis(null)} className="text-purple-400 hover:text-purple-600">
                 <X className="h-3 w-3" />
              </button>
           </div>
           
           <div className="space-y-2">
             <p className="text-[11px] leading-relaxed text-purple-900 font-bold">
                {globalAnalysis.summaryText}
             </p>
             <ul className="space-y-1">
                {globalAnalysis.bullets.map((bullet, i) => (
                  <li key={i} className="text-[10px] text-purple-800 flex gap-1.5 leading-tight">
                    <span className="text-purple-400">•</span>
                    {bullet}
                  </li>
                ))}
             </ul>
           </div>
        </div>
      )}

      {/* Merge info */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950">
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{activeConflict.sourceBranch}</span>
        {' → '}
        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{activeConflict.targetBranch}</span>
      </div>

      {/* Progress */}
      <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Resolution progress</span>
          <span>{totalResolved} / {totalConflicts}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${totalConflicts ? (totalResolved / totalConflicts) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {activeConflict.files.map((file: ConflictFile) => {
          const isExpanded = expandedFile === file.path;
          const fileResolved = file.resolvedConflicts === file.totalConflicts;

          return (
            <div key={file.path} className="border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setExpandedFile(isExpanded ? null : file.path)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                <FileCode className="h-3.5 w-3.5 text-gray-400" />
                <span className="flex-1 truncate font-mono text-xs text-gray-700 dark:text-gray-300">{file.path}</span>
                <span className={clsx(
                  'badge',
                  fileResolved ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                )}>
                  {fileResolved ? '✓' : `${file.totalConflicts - file.resolvedConflicts} left`}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                  {file.hunks.map((hunk) => (
                    <HunkResolver 
                      key={hunk.id} 
                      hunk={hunk} 
                      conflictId={activeConflict.id} 
                      owner={owner}
                      repo={repo}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        {allResolved ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resolution Commit Message</label>
                <button 
                  onClick={handleGenerateAICommitMessage}
                  disabled={isGeneratingMessage}
                  className="flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                >
                  {isGeneratingMessage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Perfect Message
                </button>
              </div>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Briefly describe how you resolved these conflicts..."
                className="w-full rounded-lg border border-gray-200 p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px] resize-none font-medium leading-relaxed"
              />
            </div>
            
            <button 
              onClick={() => {
                const request: ResolveConflictRequest = {
                  conflictId: activeConflict.id,
                  files: activeConflict.files.map(f => ({
                    filePath: f.path,
                    content: f.hunks.map(h => h.resolvedContent).join('\n')
                  }))
                };
                resolveConflictAction(request);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all w-full active:scale-95"
            >
              <CheckCheck className="h-4 w-4" />
              Complete Resolution & Commit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              disabled={true}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm font-bold text-gray-300 w-full cursor-not-allowed opacity-60"
            >
              Resolve all blocks to commit
            </button>
            <button onClick={abortMerge} className="btn-secondary w-full justify-center text-xs py-2">
              Cancel merge operation
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
