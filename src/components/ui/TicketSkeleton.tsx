// src/components/shared/TicketTableSkeleton.tsx
export default function TicketTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {/* Ticket ID */}
          <td className="px-6 py-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>

          {/* Sender name + role */}
          <td className="px-6 py-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </td>

          {/* Subject */}
          <td className="px-6 py-4">
            <div className="h-4 w-full max-w-xs rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>

          {/* Status badge */}
          <td className="px-6 py-4">
            <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>

          {/* Date */}
          <td className="px-6 py-4">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
          </td>

          {/* Actions */}
          <td className="px-6 py-4">
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
