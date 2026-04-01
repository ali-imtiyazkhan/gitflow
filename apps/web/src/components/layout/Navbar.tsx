'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SignInButton } from '../ui/SignInButton';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center dark:bg-gray-100">
                <svg
                  className="h-5 w-5 text-white dark:text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Gitflow
              </span>
            </Link>

            {session && (
              <div className="hidden border-l border-gray-100 pl-8 dark:border-gray-800 md:block">
                <div className="flex gap-6">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/conflict"
                    className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Conflicts
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <SignInButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
