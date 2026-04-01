'use client';

import { useState } from 'react';
import { X, CheckCheck, AlertTriangle, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { clsx } from 'clsx';
import { useGraphStore } from '@/store/graphStore';
import { HunkResolver } from './HunkResolver';
import type { ConflictFile } from '@gitflow/shared';

export function ConflictPanel() {
  const { activeConflict, abortMerge, isMerging } = useGraphStore();
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (!activeConflict || !isMerging) return null;

  const totalConflicts  = activeConflict.files.reduce((s, f) => s + f.totalConflicts, 0);
  const totalResolved   = activeConflict.files.reduce((s, f) => s + f.resolvedConflicts, 0);
  const allResolved     = totalResolved === totalConflicts;

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
        <button
          onClick={abortMerge}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

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
              {/* File header */}
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

              {/* Hunks */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                  {file.hunks.map((hunk) => (
                    <HunkResolver key={hunk.id} hunk={hunk} conflictId={activeConflict.id} />
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
          <button className="btn-primary w-full justify-center">
            <CheckCheck className="h-4 w-4" />
            Complete merge
          </button>
        ) : (
          <div className="space-y-2">
            <button
              disabled={!allResolved}
              className="btn-primary w-full justify-center opacity-50 cursor-not-allowed"
            >
              Resolve all conflicts to continue
            </button>
            <button onClick={abortMerge} className="btn-secondary w-full justify-center text-xs">
              Abort merge
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
