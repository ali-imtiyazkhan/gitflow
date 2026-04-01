import { RepoGrid } from '@/components/dashboard/RepoGrid';

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Repositories
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Connected
            </span>
          </div>
        </div>

        <RepoGrid />
      </section>
    </div>
  );
}
