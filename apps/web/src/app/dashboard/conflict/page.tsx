'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AlertCircle, ArrowRight, Clock, GitMerge, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchAllConflicts, setAuthToken } from '@/lib/apiClient';

interface ConflictItem {
  id: string;
  owner: string;
  repo: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  createdAt: string;
  files: any[];
}

export default function ConflictsPage() {
  const { data: session } = useSession();
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchConflicts() {
      if (!session?.accessToken) return;

      try {
        setAuthToken(session.accessToken);
        const data = await fetchAllConflicts();
        setConflicts(data);
      } catch (err: any) {
        setError(err.message || 'Connection to API failed');
      } finally {
        setLoading(false);
      }
    }

    fetchConflicts();
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Active Conflicts</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage and resolve merge conflicts across all your connected repositories.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center dark:border-red-900/30 dark:bg-red-900/10">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
            <GitMerge className="h-8 w-8 text-gray-300" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">All Clear!</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">No active merge conflicts found. Your Gitflow is smooth sailing.</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="group relative flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-900 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white dark:bg-gray-800 dark:group-hover:bg-white dark:group-hover:text-gray-900 transition-colors">
                  <GitMerge className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-900/30">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Merging
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Repository</h3>
                <p className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {conflict.owner}/{conflict.repo}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Source</p>
                  <p className="mt-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{conflict.sourceBranch}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Target</p>
                  <p className="mt-1 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{conflict.targetBranch}</p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">
                    {mounted ? new Date(conflict.createdAt).toLocaleDateString() : 'Loading...'}
                  </span>
                </div>
                <Link
                  href={`/dashboard/repo/${conflict.owner}/${conflict.repo}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-all hover:translate-x-1 dark:bg-white dark:text-gray-900"
                >
                  Resolve
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
