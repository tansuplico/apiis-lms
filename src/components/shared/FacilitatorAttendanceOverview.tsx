// src/components/shared/FacilitatorAttendanceOverview.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Search,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import AttendanceCalendar, { DayAttendanceSummary } from "./AttendanceCalendar";
import StudentAttendanceModal from "./StudentAttendanceModal";

interface FacilitatorAttendanceOverviewProps {
  facilitatorId: number;
  facilitatorName?: string;
  // Used to bound the facilitator sheet so we don't mark "Absent" on days
  // before the facilitator's account even existed.
  facilitatorCreatedAt?: string;
}

type Tab = "students" | "sheet";
type SortKey = "name" | "absent";

interface FacilitatorStudentSummary {
  studentId: number;
  firstName: string;
  lastName: string;
  idNumber: string;
  centerTitles: string[];
  presentDays: number;
  absentDays: number;
  totalDays: number;
  attendanceRate: number;
}

interface FacilitatorSheetRow {
  dateKey: string; // yyyy-MM-dd
  dayLabel: string; // e.g. "Mon, Jul 6"
  status: "present" | "absent";
  centerTitles: string[];
  // Earliest submittedAt among that day's records — used as the "time
  // clocked in" proxy. Raw ISO string; formatted for display separately.
  earliestSubmittedAt: string | null;
}

// One weekday cell in the year heatmap. "future"/"out-of-range" days
// (before the facilitator's account existed, or not yet happened) are
// rendered but not clickable and don't count as present/absent.
interface HeatmapCell {
  dateKey: string;
  status: "present" | "absent" | "out-of-range";
}

const formatTime = (isoString: string) =>
  new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Inverse of toDateKey. NEVER use `new Date(dateKey)` directly on a
// "yyyy-MM-dd" string — the built-in parser treats that as UTC midnight,
// which shifts the displayed local date by a day in negative-UTC-offset
// timezones (the exact bug this app already had on the write side once).
const parseDateKey = (dateKey: string): Date => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

// ── CSV export: builds the CSV text only. Saving to disk uses the same
// pattern as fileService.ts's course-content file download — the browser's
// native File System Access API (showSaveFilePicker), which WebView2
// (Chromium-based, used by Tauri on Windows) supports directly with no
// Tauri plugin involved. Falls back to a blob + <a download> for
// engines that don't support it, same as fileService.ts.
const buildCsvContent = (rows: FacilitatorSheetRow[]) => {
  const escape = (value: string) =>
    value.includes(",") || value.includes('"')
      ? `"${value.replace(/"/g, '""')}"`
      : value;

  const header = ["Date", "Status", "Time Submitted", "Center(s)"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.dateKey,
        r.status === "present" ? "Present" : "Absent",
        r.earliestSubmittedAt ? formatTime(r.earliestSubmittedAt) : "",
        escape(r.centerTitles.join("; ") || ""),
      ].join(","),
    ),
  ];

  return lines.join("\n");
};

export default function FacilitatorAttendanceOverview({
  facilitatorId,
  facilitatorName,
  facilitatorCreatedAt,
}: FacilitatorAttendanceOverviewProps) {
  const navigate = useNavigate();

  // ── Store
  const { records, getAttendanceByFacilitator, isLoading } =
    useAttendanceStore();

  // ── State
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [month, setMonth] = useState(new Date());
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  // Highlights the sheet-table row jumped to from the heatmap
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("absent");
  const [selectedStudent, setSelectedStudent] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Effects: load this facilitator's full history (no center-scoped
  // summary endpoint exists for facilitators, so everything below is
  // computed client-side from the raw records instead).
  useEffect(() => {
    getAttendanceByFacilitator(facilitatorId);
  }, [facilitatorId]);

  // ── Derived: this facilitator's records only (store holds records for
  // whichever centers/facilitators have been fetched so far, merged together)
  const facilitatorRecords = useMemo(
    () => records.filter((r) => r.facilitatorId === facilitatorId),
    [records, facilitatorId],
  );

  // ── Derived: all of this facilitator's records indexed by date, for O(1)
  // per-day lookups. Shared by the month sheet table and the year heatmap
  // below, so both agree on what "present" means for a given day.
  const recordsByDate = useMemo(() => {
    const map = new Map<string, typeof facilitatorRecords>();
    facilitatorRecords.forEach((r) => {
      const dateKey = (r.date ?? "").split("T")[0];
      if (!dateKey) return;
      const existing = map.get(dateKey);
      if (existing) existing.push(r);
      else map.set(dateKey, [r]);
    });
    return map;
  }, [facilitatorRecords]);

  // ── Derived: per-day present/absent totals for the calendar, across
  // every center this facilitator covers
  const dayData = useMemo(() => {
    const grouped: Record<string, DayAttendanceSummary> = {};
    facilitatorRecords.forEach((r) => {
      const dateKey = (r.date ?? "").split("T")[0];
      if (!dateKey) return;
      if (!grouped[dateKey]) {
        grouped[dateKey] = { present: 0, absent: 0, total: 0 };
      }
      grouped[dateKey].total++;
      if (r.status === "present") grouped[dateKey].present++;
      else grouped[dateKey].absent++;
    });
    return grouped;
  }, [facilitatorRecords]);

  // ── Derived: client-computed per-student summary (mirrors the shape of
  // the backend's center-summary endpoint, since no facilitator-scoped
  // equivalent exists)
  const summary = useMemo(() => {
    const grouped = new Map<number, FacilitatorStudentSummary>();

    facilitatorRecords.forEach((r) => {
      let entry = grouped.get(r.studentId);
      if (!entry) {
        entry = {
          studentId: r.studentId,
          firstName: r.student.firstName,
          lastName: r.student.lastName,
          idNumber: r.student.idNumber,
          centerTitles: [],
          presentDays: 0,
          absentDays: 0,
          totalDays: 0,
          attendanceRate: 0,
        };
        grouped.set(r.studentId, entry);
      }
      entry.totalDays++;
      if (r.status === "present") entry.presentDays++;
      else entry.absentDays++;
      if (r.centerTitle && !entry.centerTitles.includes(r.centerTitle)) {
        entry.centerTitles.push(r.centerTitle);
      }
    });

    return Array.from(grouped.values()).map((entry) => ({
      ...entry,
      attendanceRate:
        entry.totalDays > 0
          ? Math.round((entry.presentDays / entry.totalDays) * 100)
          : 0,
    }));
  }, [facilitatorRecords]);

  // ── Derived: filtered + sorted summary
  const filteredSummary = useMemo(() => {
    let result = summary;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
          s.idNumber.toLowerCase().includes(lower) ||
          s.centerTitles.some((c) => c.toLowerCase().includes(lower)),
      );
    }
    return [...result].sort((a, b) => {
      if (sortKey === "absent") return b.absentDays - a.absentDays;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [summary, searchTerm, sortKey]);

  // ── Derived: facilitator attendance sheet for the viewed month. A
  // facilitator is treated as "present" on a weekday if they submitted at
  // least one student-attendance record that day (any center), "absent"
  // otherwise. Weekends are skipped entirely. Bounded below by the
  // facilitator's account creation date (if known) and above by today, so we
  // never mark days before they existed or in the future as absences.
  const sheetRows = useMemo((): FacilitatorSheetRow[] => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const today = startOfDay(new Date());

    const createdAt = facilitatorCreatedAt
      ? startOfDay(new Date(facilitatorCreatedAt))
      : null;

    const lowerBound =
      createdAt && createdAt > monthStart ? createdAt : monthStart;
    const upperBound = today < monthEnd ? today : monthEnd;

    if (lowerBound > upperBound) return [];

    const rows: FacilitatorSheetRow[] = [];
    for (
      let d = new Date(lowerBound);
      d <= upperBound;
      d.setDate(d.getDate() + 1)
    ) {
      const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateKey = toDateKey(d);
      const dayRecords = recordsByDate.get(dateKey) ?? [];
      const centerTitles = Array.from(
        new Set(dayRecords.map((r) => r.centerTitle).filter(Boolean)),
      ) as string[];

      // Earliest submission that day = the facilitator's "time in" proxy
      const submittedTimestamps = dayRecords
        .map((r) => r.submittedAt)
        .filter((s): s is string => !!s);
      const earliestSubmittedAt =
        submittedTimestamps.length > 0
          ? submittedTimestamps.reduce((earliest, current) =>
              new Date(current) < new Date(earliest) ? current : earliest,
            )
          : null;

      rows.push({
        dateKey,
        dayLabel: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        status: dayRecords.length > 0 ? "present" : "absent",
        centerTitles,
        earliestSubmittedAt,
      });
    }
    return rows;
  }, [month, recordsByDate, facilitatorCreatedAt]);

  const sheetPresentCount = sheetRows.filter(
    (r) => r.status === "present",
  ).length;
  const sheetAbsentCount = sheetRows.length - sheetPresentCount;

  // ── Derived: full-year weekday heatmap (GitHub-style), independent of
  // the month sheet table above. Bounded the same way — no cell before the
  // facilitator's account existed or after today counts as present/absent;
  // those render as neutral "out-of-range" cells instead. Weekends are
  // omitted entirely (5 rows: Mon..Fri), consistent with the sheet table.
  const yearWeeks = useMemo((): (HeatmapCell | null)[][] => {
    const jan1 = new Date(heatmapYear, 0, 1);
    const dec31 = new Date(heatmapYear, 11, 31);
    const today = startOfDay(new Date());
    const createdAt = facilitatorCreatedAt
      ? startOfDay(new Date(facilitatorCreatedAt))
      : null;

    // Align the grid to the Monday on/before Jan 1
    const jan1DayOfWeek = jan1.getDay(); // 0 = Sun ... 6 = Sat
    const daysToMonday = jan1DayOfWeek === 0 ? -6 : 1 - jan1DayOfWeek;
    const firstMonday = new Date(jan1);
    firstMonday.setDate(firstMonday.getDate() + daysToMonday);

    const weeks: (HeatmapCell | null)[][] = [];
    const weekCursor = new Date(firstMonday);

    while (weekCursor <= dec31) {
      const week: (HeatmapCell | null)[] = [];
      for (let i = 0; i < 5; i++) {
        const cellDate = new Date(weekCursor);
        cellDate.setDate(weekCursor.getDate() + i);

        if (cellDate.getFullYear() !== heatmapYear) {
          week.push(null); // padding outside the target year
        } else {
          const dateKey = toDateKey(cellDate);
          const outOfRange =
            cellDate > today || (createdAt !== null && cellDate < createdAt);
          const dayRecords = recordsByDate.get(dateKey) ?? [];
          week.push({
            dateKey,
            status: outOfRange
              ? "out-of-range"
              : dayRecords.length > 0
                ? "present"
                : "absent",
          });
        }
      }
      weeks.push(week);
      weekCursor.setDate(weekCursor.getDate() + 7);
    }
    return weeks;
  }, [heatmapYear, recordsByDate, facilitatorCreatedAt]);

  // ── Derived: month label positioned above the first week-column that
  // falls in that month, for the heatmap header
  const yearMonthLabels = useMemo(() => {
    const labels: { columnIndex: number; label: string }[] = [];
    let lastMonthSeen = -1;
    yearWeeks.forEach((week, columnIndex) => {
      const firstRealCell = week.find((cell) => cell !== null);
      if (!firstRealCell) return;
      const cellMonth = parseDateKey(firstRealCell.dateKey).getMonth();
      if (cellMonth !== lastMonthSeen) {
        lastMonthSeen = cellMonth;
        labels.push({
          columnIndex,
          label: new Date(heatmapYear, cellMonth, 1).toLocaleDateString(
            "en-US",
            { month: "short" },
          ),
        });
      }
    });
    return labels;
  }, [yearWeeks, heatmapYear]);

  // ── Handlers: clicking a heatmap day jumps the sheet table to that month
  const handleSelectHeatmapDay = (cell: HeatmapCell) => {
    if (cell.status === "out-of-range") return;
    const clickedDate = parseDateKey(cell.dateKey);
    setMonth(new Date(clickedDate.getFullYear(), clickedDate.getMonth(), 1));
    setSelectedDateKey(cell.dateKey);
  };

  // ── Handlers: day click — a facilitator can cover multiple centers, so a
  // single day may span more than one. AttendanceDetail renders whatever
  // records array it's handed via location.state, so we pass every record
  // for this facilitator on this date regardless of center, and join
  // distinct center names for the header.
  const handleSelectDay = (dateStr: string) => {
    const dayRecords = facilitatorRecords.filter(
      (r) => (r.date ?? "").split("T")[0] === dateStr,
    );
    if (dayRecords.length === 0) return;

    const centerNames = Array.from(
      new Set(dayRecords.map((r) => r.centerTitle).filter(Boolean)),
    );

    navigate(`/admin/attendance/${dayRecords[0].centerId}-${dateStr}`, {
      state: {
        records: dayRecords,
        centerName: centerNames.join(", "),
      },
    });
  };

  const handleExportCsv = async () => {
    const monthLabel = month.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const safeName = (facilitatorName ?? `facilitator-${facilitatorId}`)
      .toLowerCase()
      .replace(/\s+/g, "-");
    const filename = `${safeName}_attendance-sheet_${monthLabel.replace(" ", "-")}.csv`;
    const csvContent = buildCsvContent(sheetRows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // ── Use OS save dialog if supported (Chrome/Edge/WebView2) — same
    // approach as fileService.ts's download()
    if ("showSaveFilePicker" in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return; // user cancelled — no error
        toast.error("Couldn't save the attendance sheet. Please try again.");
        return;
      }
    }

    // ── Fallback for engines without showSaveFilePicker — auto-downloads
    // to the default folder, same as fileService.ts's fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render
  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "students"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Student Attendance
        </button>
        <button
          onClick={() => setActiveTab("sheet")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "sheet"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Facilitator Sheet
        </button>
      </div>

      {activeTab === "students" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Per-student summary */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:w-64 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2.5 rounded-lg">
                  <Search
                    size={16}
                    className="text-gray-500 dark:text-gray-400 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Search students or centers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <button
                  onClick={() =>
                    setSortKey((k) => (k === "absent" ? "name" : "absent"))
                  }
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap"
                  title="Toggle sort order"
                >
                  <ArrowUpDown size={14} />
                  {sortKey === "absent" ? "Most absences" : "Name"}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Student
                      </th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        ID
                      </th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Center(s)
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        Present
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        Absent
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoading && filteredSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-gray-500 dark:text-gray-400"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : filteredSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-gray-500 dark:text-gray-400"
                        >
                          {searchTerm
                            ? `No students matching "${searchTerm}"`
                            : `${facilitatorName ?? "This facilitator"} hasn't recorded any attendance yet.`}
                        </td>
                      </tr>
                    ) : (
                      filteredSummary.map((s) => (
                        <tr
                          key={s.studentId}
                          onClick={() =>
                            setSelectedStudent({
                              id: s.studentId,
                              name: `${s.firstName} ${s.lastName}`,
                            })
                          }
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
                            {s.idNumber}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                            {s.centerTitles.join(", ") || "—"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                              {s.presentDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                              {s.absentDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                            {s.attendanceRate}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Attendance Calendar
            </h3>
            <AttendanceCalendar
              month={month}
              onMonthChange={setMonth}
              dayData={dayData}
              onSelectDate={handleSelectDay}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Click a day with a recorded session to view its full breakdown.
            </p>
          </div>
        </div>
      )}

      {activeTab === "sheet" && (
        <div>
          {/* Year heatmap — click a day to jump the table below to that month */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Year Overview
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHeatmapYear((y) => y - 1)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  aria-label="Previous year"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="w-14 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  {heatmapYear}
                </span>
                <button
                  onClick={() => setHeatmapYear((y) => y + 1)}
                  disabled={heatmapYear >= new Date().getFullYear()}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next year"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Month labels */}
                <div
                  className="grid gap-1 mb-1 ml-8"
                  style={{
                    gridTemplateColumns: `repeat(${yearWeeks.length}, 13px)`,
                  }}
                >
                  {yearWeeks.map((_, columnIndex) => {
                    const label = yearMonthLabels.find(
                      (l) => l.columnIndex === columnIndex,
                    );
                    return (
                      <span
                        key={columnIndex}
                        className="text-[10px] text-gray-500 dark:text-gray-400"
                      >
                        {label?.label ?? ""}
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-1">
                  {/* Row labels: Mon..Fri */}
                  <div className="flex flex-col gap-1 mr-1 w-7 shrink-0">
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((label) => (
                      <span
                        key={label}
                        className="h-3.25 text-[10px] leading-3.25 text-gray-500 dark:text-gray-400"
                      >
                        {label[0]}
                      </span>
                    ))}
                  </div>

                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${yearWeeks.length}, 13px)`,
                    }}
                  >
                    {yearWeeks.map((week, columnIndex) => (
                      <div
                        key={columnIndex}
                        className="flex flex-col gap-1"
                        style={{ gridColumn: columnIndex + 1 }}
                      >
                        {week.map((cell, rowIndex) =>
                          cell === null ? (
                            <div key={rowIndex} className="w-3.25 h-3.25" />
                          ) : (
                            <button
                              key={rowIndex}
                              onClick={() => handleSelectHeatmapDay(cell)}
                              disabled={cell.status === "out-of-range"}
                              title={`${cell.dateKey} — ${
                                cell.status === "present"
                                  ? "Present"
                                  : cell.status === "absent"
                                    ? "Absent"
                                    : "No data"
                              }`}
                              className={`w-3.25 h-3.25 rounded-sm transition-transform hover:scale-125 disabled:hover:scale-100 disabled:cursor-default ${
                                cell.status === "present"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : cell.status === "absent"
                                    ? "bg-red-400 hover:bg-red-500"
                                    : "bg-gray-100 dark:bg-gray-700"
                              }`}
                            />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                Present
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                Absent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-700" />
                No data
              </span>
              <span className="ml-auto">
                Click a day to jump to that month below
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {month.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {sheetPresentCount} present
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {sheetAbsentCount} absent
              </span>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={sheetRows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            A facilitator is marked Present on a day if they submitted at least
            one student attendance record that day, across any center. The time
            shown is when their earliest submission that day was recorded.
            Weekends are excluded. Navigate months via the calendar in the
            Student Attendance tab.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Time Submitted
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Center(s)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading && sheetRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-12 text-gray-500 dark:text-gray-400"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : sheetRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-12 text-gray-500 dark:text-gray-400"
                      >
                        No weekdays to show for this month (either it's in the
                        future or before this facilitator's account was
                        created).
                      </td>
                    </tr>
                  ) : (
                    sheetRows.map((row) => (
                      <tr
                        key={row.dateKey}
                        className={
                          row.dateKey === selectedDateKey
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : undefined
                        }
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {row.dayLabel}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.status === "present"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {row.status === "present" ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {row.earliestSubmittedAt
                            ? formatTime(row.earliestSubmittedAt)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {row.centerTitles.join(", ") || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <StudentAttendanceModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
