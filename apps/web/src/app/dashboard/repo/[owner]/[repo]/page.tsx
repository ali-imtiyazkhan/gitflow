'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { BranchGraphCanvas } from '@/components/graph/BranchGraphCanvas';
import { ConflictPanel } from '@/components/conflict/ConflictPanel';
import { useGraphStore } from '@/store/graphStore';

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default function RepoDashboardPage({ params }: PageProps) {
  const { owner, repo } = use(params);
  const { data: session } = useSession();
  const { activeConflict } = useGraphStore();

  return (
    <div className="relative h-[calc(100vh-10rem)] w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-50/50 shadow-inner dark:border-gray-800 dark:bg-gray-900/50">
      {/* Header Info */}
      <div className="absolute left-6 top-6 z-10">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur-md dark:bg-gray-900/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              {owner} <span className="mx-1 font-medium text-gray-400">/</span> {repo}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Gitflow Topology
            </p>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      {session?.accessToken && (
        <BranchGraphCanvas owner={owner} repo={repo} accessToken={session.accessToken} />
      )}

      {!session?.accessToken && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Authentication Required</h3>
            <p className="mt-1 text-xs text-gray-500">Sign in with GitHub to view your repository graph.</p>
          </div>
        </div>
      )}

      {/* Side Conflict Panel */}
      {activeConflict && (
        <div className="absolute right-6 top-6 bottom-6 z-20 w-96 animate-in slide-in-from-right-4 duration-300">
          <ConflictPanel />
        </div>
      )}
    </div>
  );
}
