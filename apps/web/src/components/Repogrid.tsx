'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Unlock, GitFork, Star, AlertCircle } from 'lucide-react';
import type { GitHubRepo } from '@gitflow/shared';
import { relativeTime } from '@gitflow/shared';

interface RepoGridProps {
  accessToken: string;
}

export function RepoGrid({ accessToken }: RepoGridProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch repositories');
        const data = await res.json();
        setRepos(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((r: any) => ({
            id: r.id,
            owner: r.owner.login,
            name: r.name,
            fullName: r.full_name,
            defaultBranch: r.default_branch,
            isPrivate: r.private,
            url: r.html_url,
            description: r.description,
            updatedAt: r.updated_at,
            stargazersCount: r.stargazers_count,
            forksCount: r.forks_count,
            openIssues: r.open_issues_count,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-36 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo: GitHubRepo & { updatedAt?: string; stargazersCount?: number; forksCount?: number }) => (
        <Link
          key={repo.id}
          href={`/dashboard/repo/${repo.owner}/${repo.name}`}
          className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {repo.isPrivate
                ? <Lock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                : <Unlock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
              <span className="truncate text-sm font-semibold text-blue-600">{repo.fullName}</span>
            </div>
          </div>

          {repo.description && (
            <p className="line-clamp-2 text-xs text-gray-500">{repo.description}</p>
          )}

          <div className="mt-auto flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {(repo as any).stargazersCount ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {(repo as any).forksCount ?? 0}
            </span>
            {(repo as any).updatedAt && (
              <span className="ml-auto">{relativeTime((repo as any).updatedAt)}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
