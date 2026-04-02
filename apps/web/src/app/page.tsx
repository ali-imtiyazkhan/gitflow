import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SignInButton } from '@/components/ui/SignInButton';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-7xl">
          Solve Git Conflicts <br />
          <span className="text-gray-400 dark:text-gray-500 underline decoration-gray-900/10 dark:decoration-white/10">
            Visually
          </span>
        </h1>
        <p className="mt-8 text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
          The ultimate visual drag-and-drop tool for managing branches, resolving merge conflicts, and streamlining your Gitflow.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-gray-900 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-gray-800 hover:shadow-xl dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <SignInButton />
              <Link
                href="#features"
                className="text-lg font-semibold text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Learn more →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-32 w-full max-w-5xl">
        <div className="relative rounded-2xl border border-gray-200 bg-gray-50/50 p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="aspect-video overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
            <iframe 
              src="/sandbox.html"
              className="h-full w-full border-none"
              title="Interactive Sandbox Preview"
            />
          </div>
          
          {/* Label overlay */}
          <div className="absolute -bottom-6 right-4 text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Live Preview Sandbox
          </div>
        </div>
      </div>
    </div>
  );
}
