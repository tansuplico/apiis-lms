// src/components/shared/CenterGridCardSkeleton.tsx
export default function CenterGridCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700" />

      <div className="px-6 py-5 flex flex-col gap-4 grow">
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

        <div className="mt-auto w-full h-11 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
