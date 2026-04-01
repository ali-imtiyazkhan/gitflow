import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Manage your GitHub repositories and resolve branch conflicts.
            </p>
          </div>
        </header>

        <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
