// src/components/shared/CenterListItemSkeleton.tsx
export default function CenterListItemSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col sm:flex-row items-stretch border border-gray-200 dark:border-gray-700 animate-pulse">
      {/* Thumbnail */}
      <div className="relative w-full sm:w-48 shrink-0 h-48 sm:h-auto bg-gray-200 dark:bg-gray-700" />

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-4.5 w-4.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-4.5 w-4.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div className="mt-auto w-full sm:w-32 h-11 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
