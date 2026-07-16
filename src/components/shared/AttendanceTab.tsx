// src/components/shared/AttendanceTab.tsx
import { useState, useMemo, useEffect } from "react";
import { Save, Search } from "lucide-react";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { AttendanceStatus, Student } from "@/types/types";
import { getLocalDateString } from "@/utils/dateformatter";
import StudentAvatar from "./StudentAvatar";
import AttendanceCalendar, { DayAttendanceSummary } from "./AttendanceCalendar";
import AttendanceOverview from "./AttendanceOverview";

interface AttendanceTabProps {
  centerId: number;
  centerName?: string;
  centerStudents: Student[];
}

type ViewMode = "take" | "overview";

export default function AttendanceTab({
  centerId,
  centerName,
  centerStudents,
}: AttendanceTabProps) {
  // ── Store
  const { saveAttendance, getAttendanceByCenter, records, isSubmitting } =
    useAttendanceStore();

  // ── State: view mode + date selection
  const [viewMode, setViewMode] = useState<ViewMode>("take");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ── State: attendance being edited for selectedDate
  const [searchTerm, setSearchTerm] = useState("");
  const [attendance, setAttendance] = useState<
    Record<number, AttendanceStatus>
  >(() => {
    const initial: Record<number, AttendanceStatus> = {};
    centerStudents.forEach((s) => (initial[s.id] = "absent"));
    return initial;
  });

  // ── Effects: load this center's full attendance history once (powers both
  // the picker's day markers and the Overview calendar)
  useEffect(() => {
    getAttendanceByCenter(centerId);
  }, [centerId]);

  // ── Effects: re-fill the marking form whenever the selected date or the
  // underlying records change. Filtered by centerId + date — records for
  // other centers/dates can coexist in the shared store, so this must not
  // blindly consume the whole array (that was the previous bug: switching
  // dates could silently carry over another day's statuses).
  useEffect(() => {
    const recordsForDate = records.filter(
      (r) =>
        r.centerId === centerId &&
        (r.date ?? "").split("T")[0] === selectedDate,
    );
    const filled: Record<number, AttendanceStatus> = {};
    centerStudents.forEach((s) => (filled[s.id] = "absent"));
    recordsForDate.forEach((r) => (filled[r.studentId] = r.status));
    setAttendance(filled);
  }, [records, centerId, selectedDate, centerStudents]);

  // ── Derived: per-day present/absent totals for the picker calendar
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

  // ── Derived
  const alreadySavedOnDate = (dayData[selectedDate]?.total ?? 0) > 0;

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return centerStudents;
    const lower = searchTerm.toLowerCase().trim();
    return centerStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
        s.idNumber.toLowerCase().includes(lower),
    );
  }, [centerStudents, searchTerm]);

  const { presentCount, absentCount } = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    Object.values(attendance).forEach((s) => {
      if (s === "present") presentCount++;
      else absentCount++;
    });
    return { presentCount, absentCount };
  }, [attendance]);

  // ── Handlers
  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleSave = async () => {
    const recordsToSave = centerStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] ?? "absent",
    }));
    await saveAttendance(centerId, recordsToSave, selectedDate);
  };

  // ── Render
  return (
    <div className="space-y-8">
      {/* View mode toggle */}
      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 p-1 bg-gray-100 dark:bg-gray-800">
        <button
          onClick={() => setViewMode("take")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "take"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Take Attendance
        </button>
        <button
          onClick={() => setViewMode("overview")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "overview"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Overview
        </button>
      </div>

      {viewMode === "overview" ? (
        <AttendanceOverview
          centerId={centerId}
          centerName={centerName}
          role="facilitator"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <AttendanceCalendar
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            dayData={dayData}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl text-gray-900 dark:text-white">
                  Attendance for{" "}
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </h3>
                {alreadySavedOnDate && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Already saved for this date — saving again will overwrite
                  </span>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Save size={20} />
                {isSubmitting ? "Saving..." : "Save Attendance"}
              </button>
            </div>

            {/* Search */}
            <div className="w-full sm:w-96 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
              <Search
                size={20}
                strokeWidth={1.5}
                className="text-gray-500 dark:text-gray-400"
              />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-12 text-gray-500 dark:text-gray-400"
                      >
                        {centerStudents.length === 0
                          ? "No students in this center yet."
                          : "No students found."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={student} />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {student.idNumber}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="radio"
                            name={`status-${student.id}`}
                            checked={attendance[student.id] === "present"}
                            onChange={() =>
                              handleStatusChange(student.id, "present")
                            }
                            className="w-5 h-5 accent-green-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="radio"
                            name={`status-${student.id}`}
                            checked={attendance[student.id] === "absent"}
                            onChange={() =>
                              handleStatusChange(student.id, "absent")
                            }
                            className="w-5 h-5 accent-red-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Present
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {presentCount}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Absent
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {absentCount}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {centerStudents.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
