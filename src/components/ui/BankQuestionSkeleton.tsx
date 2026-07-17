// src/components/ui/BankQuestionSkeleton.tsx
export default function BankQuestionSkeleton() {
  return (
    <div className="p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 flex items-start justify-between gap-4 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
