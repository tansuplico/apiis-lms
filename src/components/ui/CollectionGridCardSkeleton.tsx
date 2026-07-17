// src/components/ui/CollectionGridCardSkeleton.tsx
export default function CollectionGridCardSkeleton() {
  return (
    <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col justify-between animate-pulse">
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700" />
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="space-y-2 mt-3">
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <div className="h-6 w-6 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-6 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
