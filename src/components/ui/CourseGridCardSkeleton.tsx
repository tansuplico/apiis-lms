// src/components/shared/courses/CourseGridCardSkeleton.tsx
import { Role } from "@/types/types";

export default function CourseGridCardSkeleton({ role }: { role?: Role }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700">
        <div className="absolute top-4 left-4 h-5 w-16 rounded-sm bg-gray-300 dark:bg-gray-600" />
      </div>

      <div className="px-5 py-6 flex flex-col gap-3 grow">
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-2 grow">
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />

        {role === "student" && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-8 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}
