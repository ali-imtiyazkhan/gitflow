'use client';

import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { GitCommit } from 'lucide-react';

export function CommitNode({ data }: { data: any }) {
  const isHead = data.isHead;

  return (
    <div className="group relative flex items-center justify-center">
      {/* Waypoint Dot */}
      <div
        className={clsx(
          'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500',
          'glass-surface shadow-2xl group-hover:scale-125 group-hover:z-50',
          isHead 
            ? 'border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] ring-4 ring-purple-500/20' 
            : 'border-slate-200 dark:border-slate-800'
        )}
      >
        <GitCommit className={clsx(
           'h-5 w-5',
           isHead ? 'text-purple-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
        )} />

        {/* CI Status Ripple */}
        {data.ciStatus && data.ciStatus !== 'none' && (
          <div 
            className={clsx(
              'absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transition-all',
              data.ciStatus === 'success' && 'bg-brand-accent',
              data.ciStatus === 'failure' && 'bg-brand-danger',
              data.ciStatus === 'pending' && 'bg-brand-warning animate-pulse'
            )}
            title={`CI Status: ${data.ciStatus}`}
          >
             {data.ciStatus === 'pending' && (
               <div className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-75" />
             )}
          </div>
        )}
        
        {/* SHA Floating Badge */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xl z-50">
           {data.commitSha?.substring(0, 7) || 'commit'}
        </div>
      </div>

      {/* Message Flyout Card */}
      <div className="absolute left-14 hidden group-hover:block animate-in fade-in slide-in-from-left-2 duration-300 z-[100] pointer-events-none">
         <div className="glass-surface glass-border p-4 rounded-2xl shadow-2xl min-w-[240px]">
            <div className="flex items-center gap-2 mb-2">
               <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <GitCommit className="h-3.5 w-3.5 text-purple-500" />
               </div>
               <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Commit Details</span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-2">{data.message}</p>
            <div className="flex items-center justify-between text-[9px] font-medium text-slate-500 pt-2 border-t border-slate-100/50 dark:border-slate-800/50">
               <span className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700" />
                  {data.author}
               </span>
               <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{new Date(data.timestamp).toLocaleDateString()}</span>
            </div>
         </div>
      </div>

      <Handle type="target" position={Position.Top} className="!bg-gray-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300" />
    </div>
  );
}
