// src/components/shared/AttendanceOverview.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import AttendanceCalendar, { DayAttendanceSummary } from "./AttendanceCalendar";
import StudentAttendanceModal from "./StudentAttendanceModal";

interface AttendanceOverviewProps {
  centerId: number;
  centerName?: string;
  role: "admin" | "facilitator";
}

type SortKey = "name" | "absent";

export default function AttendanceOverview({
  centerId,
  centerName,
  role,
}: AttendanceOverviewProps) {
  const navigate = useNavigate();

  // ── Store
  const { records, getAttendanceByCenter, summary, isLoading, fetchSummary } =
    useAttendanceStore();

  // ── State
  const [month, setMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("absent");
  const [selectedStudent, setSelectedStudent] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Effects: load full history (for calendar) + all-time summary (for absence totals)
  useEffect(() => {
    getAttendanceByCenter(centerId);
    fetchSummary(centerId);
  }, [centerId]);

  // ── Derived: per-day present/absent totals for the calendar
  const dayData = useMemo(() => {
    const grouped: Record<string, DayAttendanceSummary> = {};
    records
      .filter((r) => r.centerId === centerId)
      .forEach((r) => {
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
  }, [records, centerId]);

  // ── Derived: filtered + sorted absence summary
  const filteredSummary = useMemo(() => {
    let result = summary;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
          s.idNumber.toLowerCase().includes(lower),
      );
    }
    return [...result].sort((a, b) => {
      if (sortKey === "absent") return b.absentDays - a.absentDays;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [summary, searchTerm, sortKey]);

  // ── Handlers
  const handleSelectDay = (dateStr: string) => {
    const hasSession = dayData[dateStr]?.total > 0;
    if (!hasSession) return;
    navigate(`/${role}/attendance/${centerId}-${dateStr}`, {
      state: { centerName },
    });
  };

  // ── Render
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
      {/* Absence summary */}
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
                placeholder="Search students..."
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
                      colSpan={5}
                      className="text-center py-12 text-gray-500 dark:text-gray-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-gray-500 dark:text-gray-400"
                    >
                      {searchTerm
                        ? `No students matching "${searchTerm}"`
                        : "No attendance recorded yet."}
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
