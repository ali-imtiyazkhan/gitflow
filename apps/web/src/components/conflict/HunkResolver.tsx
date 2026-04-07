'use client';

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Check, ChevronDown, ChevronUp, Copy, Split, Sparkles, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useMerge } from '@/hooks/useMerge';
import type { ConflictHunk } from '@gitflow/shared';

interface HunkResolverProps {
  hunk: ConflictHunk;
  conflictId: string;
  owner: string;
  repo: string;
}

export function HunkResolver({ hunk, conflictId, owner, repo }: HunkResolverProps) {
  const { resolveHunk } = useGraphStore();
  const { getAISuggestion } = useMerge(owner, repo);
  const [isAILoading, setIsAILoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualContent, setManualContent] = useState(
    `<<<<<<< Current\n${hunk.oursContent}\n=======\n${hunk.theirsContent}\n>>>>>>> Incoming`
  );
  const [collapsed, setCollapsed] = useState(false);

  const resolve = (strategy: 'ours' | 'theirs' | 'both' | 'manual', content?: string) => {
    let finalContent = content;
    if (strategy === 'both') {
      finalContent = `${hunk.oursContent}\n${hunk.theirsContent}`;
    } else if (strategy === 'ours') {
      finalContent = hunk.oursContent;
    } else if (strategy === 'theirs') {
      finalContent = hunk.theirsContent;
    }
    resolveHunk(conflictId, hunk.id, strategy, finalContent);
  };

  const handleAISuggest = async () => {
    setIsAILoading(true);
    try {
      const result = await getAISuggestion(hunk);
      setSuggestion(result);
      if (result.resolvedContent) {
        setManualContent(result.resolvedContent);
      }
      setExplanation(result.explanation);
      setShowManual(true);
    } catch (err) {
      console.error('AI suggestion failed', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const lines = useMemo(() => {
    const ours = hunk.oursContent.split('\n');
    const theirs = hunk.theirsContent.split('\n');
    return { ours, theirs };
  }, [hunk.oursContent, hunk.theirsContent]);

  return (
    <div className={clsx('border-b border-gray-200/50 dark:border-gray-800 last:border-0 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none relative px-1', hunk.resolved && 'bg-emerald-50/5 dark:bg-emerald-500/5')}>
      {/* Hunk header */}
      <div className={clsx(
        'group flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors border-l-2',
        hunk.resolved ? 'bg-emerald-50/20 border-emerald-500' : 'bg-white dark:bg-slate-900/40 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
      )}
      onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Split className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-mono text-[11px] font-medium text-gray-500">
            {hunk.filePath} <span className="text-gray-300 mx-1">|</span> Lines {hunk.lineStart}–{hunk.lineEnd}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hunk.resolved && hunk.resolution && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-100/50 px-2 py-0.5 rounded-full">
              <Check className="h-3 w-3" />
              {hunk.resolution.toUpperCase()}
            </div>
          )}
          <button className="text-gray-400">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Side-by-side diff */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="relative group/diff">
              <div className="flex items-center justify-between mb-0.5 rounded-t-xl bg-blue-500/5 border border-blue-200/50 dark:border-blue-400/20 px-4 py-2 transition-all group-hover/diff:bg-blue-500/10 dark:bg-blue-400/5">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Current (Ours)</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); resolve('ours'); }}
                  className={clsx(
                    "text-[10px] px-3 py-1 rounded-lg font-bold transition-all shadow-sm",
                    hunk.resolved && hunk.resolution === 'ours' ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-slate-800"
                  )}
                >
                  Accept Ours
                </button>
              </div>
              <div className="font-mono text-[11px] bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-inner">
                {lines.ours.map((line, i) => (
                  <div key={i} className="flex hover:bg-blue-500/5 group/line">
                    <div className="w-10 flex-shrink-0 text-right pr-3 text-[10px] text-slate-400 border-r border-slate-100 dark:border-slate-800 select-none bg-slate-100/20 py-1 transition-colors group-hover/line:text-blue-500">
                      {hunk.lineStart + i}
                    </div>
                    <pre className="px-4 py-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                      {line || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group/diff">
              <div className="flex items-center justify-between mb-0.5 rounded-t-xl bg-purple-500/5 border border-purple-200/50 dark:border-purple-400/20 px-4 py-2 transition-all group-hover/diff:bg-purple-500/10 dark:bg-purple-400/5">
                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Incoming (Theirs)</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); resolve('theirs'); }}
                  className={clsx(
                    "text-[10px] px-3 py-1 rounded-lg font-bold transition-all shadow-sm",
                    hunk.resolved && hunk.resolution === 'theirs' ? "bg-purple-600 text-white" : "bg-white text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-slate-800"
                  )}
                >
                  Accept Theirs
                </button>
              </div>
              <div className="font-mono text-[11px] bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-inner">
                {lines.theirs.map((line, i) => (
                  <div key={i} className="flex hover:bg-purple-500/5 group/line">
                    <div className="w-10 flex-shrink-0 text-right pr-3 text-[10px] text-slate-400 border-r border-slate-100 dark:border-slate-800 select-none bg-slate-100/20 py-1 transition-colors group-hover/line:text-purple-500">
                      {hunk.lineStart + i}
                    </div>
                    <pre className="px-4 py-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                      {line || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!hunk.resolved && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2.5">
                <button
                  onClick={() => resolve('both')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Accept Both
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-sm transition-all active:scale-[0.98]",
                    showManual 
                      ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  )}
                >
                  <Split className="h-3.5 w-3.5" />
                  Manual Resolve
                </button>
                <button
                  onClick={handleAISuggest}
                  disabled={isAILoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:shadow-purple-500/10 group disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {isAILoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-brand-primary transition-transform group-hover:scale-125" />}
                  AI Perfect Fix
                </button>
              </div>

              {explanation && (
                  <div className="rounded-2xl glass-surface glow-purple p-4 relative overflow-hidden animate-in fade-in slide-in-from-top-1">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                       <Sparkles className="h-16 w-16 text-purple-500" />
                    </div>
                    
                    <div className="relative z-10">
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 font-black text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                             <Sparkles className="h-3.5 w-3.5" />
                             Smart Suggestion
                          </div>
                          {suggestion && (
                             <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                   <div 
                                      className={clsx(
                                         "h-full rounded-full transition-all duration-1000",
                                         suggestion.confidence > 0.8 ? "bg-emerald-500" : suggestion.confidence > 0.5 ? "bg-amber-500" : "bg-brand-danger"
                                      )}
                                      style={{ width: `${suggestion.confidence * 100}%` }}
                                   />
                                </div>
                                <span className={clsx(
                                   "text-[10px] font-black",
                                   suggestion.confidence > 0.8 ? "text-emerald-600" : "text-amber-600"
                                )}>{(suggestion.confidence * 100).toFixed(0)}% Confidence</span>
                             </div>
                          )}
                       </div>
                       
                       <p className="text-[11.5px] text-slate-800 dark:text-slate-200 leading-relaxed font-semibold italic mb-3">
                          "{explanation}"
                       </p>
                       
                       {suggestion?.reasoning && (
                          <div className="mt-3 pt-3 border-t border-purple-200/50 flex gap-2">
                             <div className="h-4 w-4 shrink-0 rounded bg-purple-500/10 flex items-center justify-center mt-0.5">
                                <Check className="h-2.5 w-2.5 text-purple-600" />
                             </div>
                             <p className="text-[10.5px] text-slate-600 dark:text-slate-400">
                                <strong>AI Thinking:</strong> {suggestion.reasoning}
                             </p>
                          </div>
                       )}
                    </div>
                  </div>
              )}

              {showManual && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 animate-in slide-in-from-bottom-2 duration-300">
                    <textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-5 font-mono text-[11.5px] leading-relaxed text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
                      rows={10}
                      placeholder="Combine the changes here..."
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => resolve('manual', manualContent)}
                        className="bg-brand-primary text-white px-8 py-3 rounded-xl text-xs font-black hover:bg-slate-900 shadow-xl shadow-brand-primary/20 transition-all active:scale-95 hover:-translate-y-0.5 dark:hover:bg-white dark:hover:text-slate-900"
                      >
                        Commit Manual Fix
                      </button>
                    </div>
                  </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
