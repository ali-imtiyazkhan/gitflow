'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch, AlertTriangle, CheckCircle, Clock, Trash2, Loader2, ShieldCheck, ShieldAlert, Shield, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Branch, CIStatus } from '@gitflow/shared';
import { relativeTime, shortSha } from '@gitflow/shared';

type BranchNodeData = Branch & { selected?: boolean; isTarget?: boolean };

const statusConfig = {
  clean:    { color: 'border-green-300 bg-green-50',  icon: CheckCircle,    iconColor: 'text-green-500'  },
  ahead:    { color: 'border-blue-300 bg-blue-50',    icon: GitBranch,      iconColor: 'text-blue-500'   },
  behind:   { color: 'border-gray-300 bg-gray-50',    icon: Clock,          iconColor: 'text-gray-400'   },
  diverged: { color: 'border-amber-300 bg-amber-50',  icon: AlertTriangle,  iconColor: 'text-amber-500'  },
  conflict: { color: 'border-red-300 bg-red-50',      icon: AlertTriangle,  iconColor: 'text-red-500'    },
  merged:   { color: 'border-purple-300 bg-purple-50',icon: CheckCircle,    iconColor: 'text-purple-500' },
  stale:    { color: 'border-gray-200 bg-gray-50',    icon: Clock,          iconColor: 'text-gray-300'   },
};

const ciConfig: Record<CIStatus, { color: string; icon: any; label: string; animate?: boolean }> = {
  success: { color: 'bg-green-100 text-green-700 border-green-200', icon: ShieldCheck, label: 'Passing' },
  failure: { color: 'bg-red-100 text-red-700 border-red-200', icon: ShieldAlert, label: 'Failed' },
  pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Loader2, label: 'Running', animate: true },
  none:    { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Shield, label: 'No CI' },
  unknown: { color: 'bg-slate-100 text-slate-500 border-slate-200', icon: HelpCircle, label: 'Unknown' },
};

export const BranchNode = memo(function BranchNode({ data, selected }: NodeProps) {
  const branch = data as unknown as BranchNodeData;
  const cfg = statusConfig[branch.status] ?? statusConfig.clean;
  const Icon = cfg.icon;
  const isMain = branch.type === 'main' || branch.type === 'develop';

  return (
    <div
      className={clsx(
        'group relative min-w-[180px] rounded-2xl border-2 px-4 py-3 transition-all duration-500',
        'glass-surface glass-border hover:shadow-2xl hover:-translate-y-1',
        selected ? 'ring-4 ring-purple-500/30 border-purple-500 scale-[1.02] z-50' : 'border-slate-200/50 dark:border-slate-800/50',
        branch.isTarget && 'ring-8 ring-brand-warning/20 border-brand-warning animate-pulse-glow',
        isMain && 'min-w-[200px] border-l-4 border-l-brand-primary'
      )}
    >
      {/* Dynamic Glow Background */}
      {selected && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/5 to-blue-500/5 blur-xl animate-pulse" />
      )}

      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Left}  
        className="!w-3 !h-3 !-left-2 !border-2 !border-white dark:!border-slate-900 !bg-slate-400" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !-right-2 !border-2 !border-white dark:!border-slate-900 !bg-slate-400" 
      />

      {/* CI Status Badge */}
      {branch.ciStatus && branch.ciStatus !== 'none' && (
        <div className={clsx(
          'absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-lg ring-2 ring-white dark:ring-slate-900 transition-all hover:scale-110',
          ciConfig[branch.ciStatus].color,
          branch.ciStatus === 'pending' && 'animate-pulse'
        )}>
          {branch.ciStatus === 'pending' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            (() => {
                const CIIcon = ciConfig[branch.ciStatus].icon;
                return <CIIcon className="h-3 w-3" />;
            })()
          )}
          {ciConfig[branch.ciStatus].label}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-xl bg-opacity-10', cfg.color.replace('border-', 'bg-'))}>
          <Icon className={clsx('h-4 w-4', cfg.iconColor)} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className={clsx('truncate text-[13px] font-bold tracking-tight', isMain ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>
            {branch.name}
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
            {isMain ? 'Locked Branch' : 'Feature Branch'}
          </span>
        </div>
        
        {!isMain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              (branch as any).onDelete?.(branch.name);
            }}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
            title="Delete branch"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Social / Multiplayer Context (Live Presence) */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100/50 pt-3 dark:border-slate-800/50">
        <div className="flex -space-x-1.5 overflow-hidden">
          {/* Presence dots - would be populated from socket presence state */}
          <div className="h-5 w-5 rounded-full border-2 border-white bg-brand-primary dark:border-slate-900" title="User Active" />
          <div className="h-5 w-5 rounded-full border-2 border-white bg-brand-accent dark:border-slate-900" title="User Active" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400">
           <Clock className="h-3 w-3" />
           {relativeTime(branch.lastCommitAt)}
        </div>
      </div>

      {/* Conflict / Ahead-Behind Overlay */}
      <div className="mt-2.5 flex items-center gap-2">
        {branch.status === 'conflict' ? (
          <div className="flex w-full items-center gap-1.5 rounded-lg bg-red-500/5 px-2 py-1 text-[11px] font-bold text-red-500 ring-1 ring-red-500/20">
            <ShieldAlert className="h-3 w-3" />
            Merge Conflicts
          </div>
        ) : (
          <div className="flex w-full items-center gap-2">
            {(branch.aheadBy > 0 || branch.behindBy > 0) && (
              <div className="flex items-center gap-3">
                {branch.aheadBy > 0 && <span className="flex items-center gap-0.5 text-brand-accent">↑{branch.aheadBy}</span>}
                {branch.behindBy > 0 && <span className="flex items-center gap-0.5 text-brand-danger">↓{branch.behindBy}</span>}
              </div>
            )}
            <div className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-800">
              {shortSha(branch.sha)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
