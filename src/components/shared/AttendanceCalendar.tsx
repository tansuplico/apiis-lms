// src/components/shared/AttendanceCalendar.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateString, getLocalDateString } from "@/utils/dateformatter";

export interface DayAttendanceSummary {
  present: number;
  absent: number;
  total: number;
}

interface AttendanceCalendarProps {
  /** Any date within the month currently displayed. */
  month: Date;
  onMonthChange: (next: Date) => void;
  /** Keyed by 'YYYY-MM-DD'. Days without an entry are treated as "no session". */
  dayData: Record<string, DayAttendanceSummary>;
  /** Currently selected date, 'YYYY-MM-DD'. Only used in picker mode. */
  selectedDate?: string;
  /** Omit to render a read-only overview calendar. */
  onSelectDate?: (date: string) => void;
  /** Blocks navigating to / selecting dates after today. Defaults to true. */
  disableFutureDates?: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendar({
  month,
  onMonthChange,
  dayData,
  selectedDate,
  onSelectDate,
  disableFutureDates = true,
}: AttendanceCalendarProps) {
  // ── Derived: grid of dates, padded to full weeks with adjacent-month days
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  const today = getLocalDateString();

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - leadingBlanks + 1;
    const date = new Date(year, monthIndex, dayNumber);
    const inCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const dateStr = formatDateString(date);
    const isFuture = dateStr > today;
    return { date, dateStr, dayNumber, inCurrentMonth, isFuture };
  });

  const canGoNextMonth =
    !disableFutureDates ||
    new Date(year, monthIndex + 1, 1) <=
      new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // ── Handlers
  const goPrevMonth = () => onMonthChange(new Date(year, monthIndex - 1, 1));
  const goNextMonth = () => onMonthChange(new Date(year, monthIndex + 1, 1));

  // ── Helpers: color a cell by that day's present-rate
  const cellTone = (summary: DayAttendanceSummary | undefined) => {
    if (!summary || summary.total === 0)
      return "bg-gray-50 dark:bg-gray-800/50";
    const rate = summary.present / summary.total;
    if (rate >= 0.9) return "bg-green-100 dark:bg-green-900/30";
    if (rate >= 0.6) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft size={18} />
        </button>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h4>
        <button
          onClick={goNextMonth}
          disabled={!canGoNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map(({ date, dateStr, dayNumber, inCurrentMonth, isFuture }) => {
          const summary = dayData[dateStr];
          const isSelected = selectedDate === dateStr;
          const isSelectable =
            !!onSelectDate &&
            inCurrentMonth &&
            !(disableFutureDates && isFuture);
          const isClickable =
            isSelectable || (!onSelectDate && summary && summary.total > 0);

          return (
            <button
              key={dateStr + dayNumber}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (onSelectDate && isSelectable) onSelectDate(dateStr);
              }}
              className={`relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                !inCurrentMonth ? "opacity-30" : cellTone(summary)
              } ${isSelected ? "ring-2 ring-blue-500" : ""} ${
                isClickable
                  ? "cursor-pointer hover:brightness-95 dark:hover:brightness-110"
                  : "cursor-default"
              } ${disableFutureDates && isFuture && inCurrentMonth ? "opacity-40" : ""}`}
              title={
                summary && summary.total > 0
                  ? `${summary.present} present, ${summary.absent} absent`
                  : undefined
              }
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {date.getDate()}
              </span>
              {summary && summary.total > 0 && (
                <span className="text-[10px] leading-none text-gray-600 dark:text-gray-400">
                  {summary.present}/{summary.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 inline-block" />
          High attendance
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 inline-block" />
          Partial
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 inline-block" />
          Low
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-50 dark:bg-gray-800/50 inline-block border border-gray-200 dark:border-gray-700" />
          No session
        </div>
      </div>
    </div>
  );
}
