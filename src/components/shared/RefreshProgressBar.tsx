// src/components/shared/RefreshProgressBar.tsx
// A thin bar across the top of the window while Refresh reloads data. The
// page underneath stays usable.

export default function RefreshProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 inset-x-0 h-[3px] z-50 overflow-hidden pointer-events-none bg-blue-100/60 dark:bg-gray-800/60"
    >
      <div className="refresh-progress-bar h-full w-1/4 rounded-full" />
    </div>
  );
}
