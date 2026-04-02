'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch, AlertTriangle, CheckCircle, Clock, Trash2, Loader2, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
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
};

export const BranchNode = memo(function BranchNode({ data, selected }: NodeProps) {
  const branch = data as unknown as BranchNodeData;
  const cfg = statusConfig[branch.status] ?? statusConfig.clean;
  const Icon = cfg.icon;
  const isMain = branch.type === 'main' || branch.type === 'develop';

  return (
    <div
      className={clsx(
        'relative min-w-[160px] rounded-xl border-2 px-3 py-2.5 shadow-sm transition-all',
        cfg.color,
        selected && 'ring-2 ring-blue-400 ring-offset-2',
        branch.isTarget && 'ring-4 ring-orange-400 ring-offset-4 animate-pulse',
        isMain && 'min-w-[180px]'
      )}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Left}  className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />

      {/* CI Status Badge */}
      {branch.ciStatus && branch.ciStatus !== 'none' && (
        <div className={clsx(
          'absolute -top-3 -right-2 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold shadow-sm ring-2 ring-white transition-all hover:scale-105',
          ciConfig[branch.ciStatus].color
        )}>
          {branch.ciStatus === 'pending' ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            (() => {
                const CIIcon = ciConfig[branch.ciStatus].icon;
                return <CIIcon className="h-2.5 w-2.5" />;
            })()
          )}
          {ciConfig[branch.ciStatus].label}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Icon className={clsx('h-3.5 w-3.5 flex-shrink-0', cfg.iconColor)} />
        <span className={clsx('max-w-[130px] truncate text-xs font-semibold', isMain ? 'text-gray-900' : 'text-gray-700')}>
          {branch.name}
        </span>
        
        {isMain ? (
          <span className="ml-auto rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            main
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              (branch as any).onDelete?.(branch.name);
            }}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete branch"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
          <span>{branch.commits.length} commit{branch.commits.length !== 1 ? 's' : ''}</span>
          <span className="font-mono">{shortSha(branch.sha)}</span>
        </div>
        <div className="text-[10px] text-gray-400">
          {relativeTime(branch.lastCommitAt)} · {branch.author}
        </div>
        {branch.status === 'conflict' && (
          <div className="mt-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            ⚠ Has conflicts
          </div>
        )}
        {(branch.aheadBy > 0 || branch.behindBy > 0) && (
          <div className="mt-0.5 flex gap-2 text-[10px] text-gray-400">
            {branch.aheadBy  > 0 && <span className="text-green-600">↑{branch.aheadBy}</span>}
            {branch.behindBy > 0 && <span className="text-red-500">↓{branch.behindBy}</span>}
          </div>
        )}
      </div>
    </div>
  );
});
