// src/components/ui/CollectionListItemSkeleton.tsx
export default function CollectionListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 shrink-0 hidden sm:block" />
      <div className="flex items-center gap-1 shrink-0">
        <div className="h-6 w-6 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-6 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
