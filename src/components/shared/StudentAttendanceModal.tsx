// src/components/shared/StudentAttendanceModal.tsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { useAttendanceStore } from "@/stores/useAttendanceStore";

interface StudentAttendanceModalProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

export default function StudentAttendanceModal({
  studentId,
  studentName,
  onClose,
}: StudentAttendanceModalProps) {
  // ── Store
  const {
    studentRecords,
    studentSummary,
    isLoadingStudentRecords,
    fetchStudentAttendance,
  } = useAttendanceStore();

  // ── Effects
  useEffect(() => {
    fetchStudentAttendance(studentId);
  }, [studentId]);

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {studentName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Full attendance history
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        {studentSummary && (
          <div className="grid grid-cols-4 gap-3 px-6 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {studentSummary.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {studentSummary.present}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Present
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {studentSummary.absent}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {studentSummary.attendanceRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
            </div>
          </div>
        )}

        {/* Records list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoadingStudentRecords ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading...
            </p>
          ) : studentRecords.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No attendance recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {studentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900/40"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {record.date
                        ? new Date(
                            record.date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Unknown date"}
                    </p>
                    {record.centerTitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {record.centerTitle}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === "present"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {record.status === "present" ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
