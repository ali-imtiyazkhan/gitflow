'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { GitBranch, LogOut, Settings } from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900">
          <GitBranch className="h-5 w-5 text-blue-600" />
          GitFlow
        </Link>

        {/* Right side */}
        {session?.user && (
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <Settings className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? 'User'}
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-gray-200"
                />
              )}
              <span className="hidden text-sm font-medium text-gray-700 sm:block">
                {session.user.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
