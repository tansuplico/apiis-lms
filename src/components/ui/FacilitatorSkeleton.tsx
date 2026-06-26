// src/components/shared/FacilitatorTableSkeleton.tsx
export default function FacilitatorTableSkeleton({
  rows = 10,
}: {
  rows?: number;
}) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {/* Avatar */}
          <td className="px-6 py-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          </td>

          {/* Name + email */}
          <td className="px-6 py-4">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-44 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </td>

          {/* Current center */}
          <td className="px-6 py-4">
            <div className="h-5 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
          </td>

          {/* Status badge */}
          <td className="px-6 py-4">
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          </td>

          {/* Actions */}
          <td className="px-6 py-4 text-right">
            <div className="flex gap-2 justify-end">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
