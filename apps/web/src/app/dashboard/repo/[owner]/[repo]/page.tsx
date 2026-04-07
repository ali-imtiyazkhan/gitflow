'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { BranchGraphCanvas } from '@/components/graph/BranchGraphCanvas';
import { ConflictPanel } from '@/components/conflict/ConflictPanel';
import { BranchInsights } from '@/components/dashboard/BranchInsights';
import { ActivitySidebar } from '@/components/ui/ActivitySidebar';
import { useGraphStore } from '@/store/graphStore';
import { useState } from 'react';
import { Sparkles, X, GitBranch, AlertTriangle, Layout } from 'lucide-react';
import { clsx } from 'clsx';

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default function RepoDashboardPage({ params }: PageProps) {
  const { owner, repo } = use(params);
  const { data: session } = useSession();
  const { activeConflict } = useGraphStore();
  const [showInsights, setShowInsights] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-[2.5rem] glass-surface shadow-2xl animate-in fade-in zoom-in-95 duration-700">
      {/* Premium Floating Header */}
      <div className="absolute right-8 top-6 z-50">
        <div className="flex items-center gap-4 rounded-[2rem] glass-surface px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl dark:bg-white dark:text-slate-950 transition-transform hover:rotate-3">
            <GitBranch className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {owner} <span className="mx-0.5 font-medium text-slate-300 dark:text-slate-700">/</span> {repo}
            </h1>
            <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse" />
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                 Active Solver Session
               </p>
            </div>
          </div>
          
          <div className="ml-6 flex items-center gap-2 border-l border-slate-200/50 pl-6 dark:border-slate-800/50">
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={clsx(
                "p-2.5 rounded-xl transition-all active:scale-90",
                showActivity ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              title="Toggle Live Activity"
            >
              <Layout className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowInsights(!showInsights)}
              className={clsx(
                "group flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-black transition-all active:scale-95",
                showInsights 
                  ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/30" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Sparkles className={clsx("h-4 w-4 transition-transform group-hover:rotate-12", showInsights && "animate-pulse")} />
              AI Insights
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Activity Sidebar */}
      <div className={clsx(
        "absolute inset-y-0 left-0 z-30 w-80 transition-transform duration-500 ease-emphasized border-r border-slate-200/50 dark:border-slate-800/50 shadow-2xl",
        showActivity ? "translate-x-0" : "-translate-x-full"
      )}>
        <ActivitySidebar />
      </div>

      {/* Main Interactive Canvas */}
      <div className={clsx(
        "h-full w-full transition-all duration-500 ease-emphasized",
        showActivity ? "pl-80" : "pl-0"
      )}>
        {session?.accessToken ? (
          <BranchGraphCanvas owner={owner} repo={repo} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex flex-col items-center max-w-sm text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-xl dark:bg-slate-900">
                <AlertTriangle className="h-8 w-8 text-brand-warning" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Secure Access Required</h3>
              <p className="mt-2 text-sm font-medium text-slate-400">Please authenticate with your GitHub account to access the visual topology and merge engine.</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights Modal Overlay */}
      {showInsights && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden glass-surface rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="absolute right-8 top-8 z-10">
               <button 
                 onClick={() => setShowInsights(false)}
                 className="flex h-10 w-10 items-center justify-center rounded-xl glass-surface hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
               >
                 <X className="h-5 w-5" />
               </button>
            </div>
            <div className="h-full overflow-y-auto p-12">
               <BranchInsights owner={owner} repo={repo} />
            </div>
          </div>
        </div>
      )}

      {/* Slide-out High-End Conflict Panel */}
      {activeConflict && (
        <div className="absolute top-[7.5rem] right-8 bottom-8 z-40 w-[28rem] animate-in slide-in-from-right-12 duration-700 flex flex-col">
          <div className="flex-1 overflow-hidden glass-surface rounded-[2rem] shadow-2xl border-l border-white/20 dark:border-slate-800/50">
             <ConflictPanel owner={owner} repo={repo} />
          </div>
        </div>
      )}
    </div>
  );
}
