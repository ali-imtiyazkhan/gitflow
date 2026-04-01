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
      const { suggestion, explanation: aiExplain } = await getAISuggestion(hunk);
      setManualContent(suggestion);
      setExplanation(aiExplain);
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
    <div className={clsx('border-b border-gray-200 last:border-0 overflow-hidden transition-all', hunk.resolved && 'bg-gray-50/50')}>
      {/* Hunk header */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100/50 select-none',
        hunk.resolved ? 'bg-green-50/30' : 'bg-white'
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
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="flex items-center justify-between mb-1 rounded-t-lg bg-blue-600/10 border-b border-blue-200 px-3 py-1.5">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Current Changes</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); resolve('ours'); }}
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded transition-colors",
                    hunk.resolved && hunk.resolution === 'ours' ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-200"
                  )}
                >
                  Accept
                </button>
              </div>
              <div className="font-mono text-[11px] bg-blue-50/50 rounded-b-lg border border-blue-100 overflow-hidden">
                {lines.ours.map((line, i) => (
                  <div key={i} className="flex hover:bg-blue-100/50 group">
                    <div className="w-8 flex-shrink-0 text-right pr-2 text-[10px] text-blue-300 border-r border-blue-100 select-none bg-blue-100/20 py-0.5">
                      {hunk.lineStart + i}
                    </div>
                    <pre className="px-3 py-0.5 text-blue-900 whitespace-pre-wrap break-all leading-normal group-hover:text-blue-900">
                      {line || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 rounded-t-lg bg-purple-600/10 border-b border-purple-200 px-3 py-1.5">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Incoming Changes</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); resolve('theirs'); }}
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded transition-colors",
                    hunk.resolved && hunk.resolution === 'theirs' ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-200"
                  )}
                >
                  Accept
                </button>
              </div>
              <div className="font-mono text-[11px] bg-purple-50/50 rounded-b-lg border border-purple-100 overflow-hidden">
                {lines.theirs.map((line, i) => (
                  <div key={i} className="flex hover:bg-purple-100/50 group">
                    <div className="w-8 flex-shrink-0 text-right pr-2 text-[10px] text-purple-300 border-r border-purple-100 select-none bg-purple-100/20 py-0.5">
                      {hunk.lineStart + i}
                    </div>
                    <pre className="px-3 py-0.5 text-purple-900 whitespace-pre-wrap break-all leading-normal">
                      {line || ' '}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!hunk.resolved && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => resolve('both')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Accept Both
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]",
                    showManual ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Split className="h-3.5 w-3.5" />
                  Manual Resolve
                </button>
                <button
                  onClick={handleAISuggest}
                  disabled={isAILoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition-all active:scale-[0.98] disabled:opacity-50"
                  title="Analyze and Resolve with AI"
                >
                  {isAILoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI Analysis & Resolve
                </button>
              </div>

              {explanation && (
                 <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-900 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-1.5 mb-1 font-bold">
                       <Sparkles className="h-3 w-3" />
                       AI Analysis
                    </div>
                    {explanation}
                 </div>
              )}

              {showManual && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <textarea
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-4 font-mono text-[11px] leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    rows={8}
                    placeholder="Merge the changes manually here..."
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => resolve('manual', manualContent)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                      Complete Resolution
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
