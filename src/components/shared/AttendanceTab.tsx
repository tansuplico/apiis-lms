// src/components/shared/AttendanceTab.tsx
import { useState, useMemo, useEffect } from "react";
import { Save, Search } from "lucide-react";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { AttendanceStatus, Student } from "@/types/types";
import { getLocalDateString } from "@/utils/dateformatter";
import StudentAvatar from "./StudentAvatar";

interface AttendanceTabProps {
  centerId: number;
  centerStudents: Student[];
}

// ── Sub-component: StudentAvatar

export default function AttendanceTab({
  centerId,
  centerStudents,
}: AttendanceTabProps) {
  // ── Store
  const { saveAttendance, getAttendanceByDate, records, isSubmitting } =
    useAttendanceStore();

  // ── State
  const [searchTerm, setSearchTerm] = useState("");
  const [attendance, setAttendance] = useState<
    Record<number, AttendanceStatus>
  >(() => {
    const initial: Record<number, AttendanceStatus> = {};
    centerStudents.forEach((s) => (initial[s.id] = "absent"));
    return initial;
  });

  // ── Effects
  useEffect(() => {
    getAttendanceByDate(centerId, getLocalDateString());
  }, [centerId]);

  useEffect(() => {
    if (records.length > 0) {
      const filled: Record<number, AttendanceStatus> = {};
      records.forEach((r) => (filled[r.studentId] = r.status));
      setAttendance(filled);
    }
  }, [records]);

  // ── Derived
  const today = getLocalDateString();
  const alreadySavedToday = records.some(
    (r) => r.centerId === centerId && r.date === today,
  );

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

  const handleSave = async () => {
    const recordsToSave = centerStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] ?? "absent",
    }));
    await saveAttendance(centerId, recordsToSave);
  };

  // ── Render
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-2xl text-gray-900 dark:text-white">
          Attendance for{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        {alreadySavedToday && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Already saved today — saving again will overwrite
          </span>
        )}

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
                      onChange={() => handleStatusChange(student.id, "present")}
                      className="w-5 h-5 accent-green-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="radio"
                      name={`status-${student.id}`}
                      checked={attendance[student.id] === "absent"}
                      onChange={() => handleStatusChange(student.id, "absent")}
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
            Present Today
          </p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {presentCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Absent Today
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
  );
}
