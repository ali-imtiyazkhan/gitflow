'use client';

import { useActivityStore } from '@/store/activityStore';
import { clsx } from 'clsx';
import { GitPullRequest, GitMerge, AlertCircle, CheckCircle, Info, X, Bell } from 'lucide-react';
import { relativeTime } from '@gitflow/shared';

const iconMap: any = {
  'merge:completed':   { icon: GitMerge,      color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'merge:conflict':    { icon: AlertCircle,   color: 'text-red-500',    bg: 'bg-red-500/10'    },
  'conflict:resolved': { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-500/10'  },
  'branch:updated':    { icon: GitPullRequest, color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  'approval:requested': { icon: Bell,          color: 'text-amber-500',  bg: 'bg-amber-500/10'  },
};

export function ActivitySidebar() {
  const { items, unreadCount, markAllRead } = useActivityStore();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white/50 backdrop-blur-xl dark:bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-slate-200/50 p-6 dark:border-slate-800/50">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
          <Bell className="h-4 w-4 text-brand-primary" />
          Live Activity
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </h2>
        <button 
          onClick={markAllRead}
          className="text-[10px] font-bold uppercase text-brand-primary hover:underline"
        >
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <Info className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-400 italic">No activity recorded yet...</p>
          </div>
        )}
        
        {items.map((item) => {
          const cfg = iconMap[item.type] || { icon: Info, color: 'text-slate-400', bg: 'bg-slate-100' };
          const Icon = cfg.icon;
          return (
            <div 
              key={item.id} 
              className="group relative flex gap-4 rounded-2xl border border-slate-100 bg-white/40 p-4 transition-all hover:bg-white hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/40 dark:hover:bg-slate-900"
            >
              <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner', cfg.bg)}>
                <Icon className={clsx('h-5 w-5', cfg.color)} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                  {item.type.replace(':', ' ').toUpperCase()}
                </p>
                <p className="text-[10px] font-medium text-slate-500 truncate">
                   Repo: {item.repoId}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[9px] font-bold text-slate-400">
                   <Clock className="h-3 w-3" />
                   {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
