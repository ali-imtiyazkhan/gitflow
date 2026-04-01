'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GitHubRepo } from '@gitflow/shared';

export function RepoGrid() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRepos() {
      if (!session?.accessToken) return;

      try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=12', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        const data = await res.json();
        const mappedRepos = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          defaultBranch: r.default_branch,
          isPrivate: r.private,
          owner: r.owner.login,
          url: r.html_url
        }));
        setRepos(mappedRepos);
      } catch (error) {
        console.error('Failed to fetch repos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, [session]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <Link
          key={repo.id}
          href={`/dashboard/repo/${repo.fullName}`}
          className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-900 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-white"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white dark:bg-gray-800 dark:group-hover:bg-white dark:group-hover:text-gray-900">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </span>

              {repo.isPrivate && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-mono">
                  Private
                </span>
              )}
            </div>

            <h3 className="mt-6 text-base font-bold text-gray-900 dark:text-white">
              {repo.name}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              {repo.description ?? 'No description provided'}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider dark:text-gray-500">
              {repo.defaultBranch}
            </span>
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 ring-0 dark:border-gray-900 dark:bg-gray-800" />
              <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-200 ring-0 dark:border-gray-900 dark:bg-gray-700" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
