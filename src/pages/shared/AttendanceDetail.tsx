// src/pages/admins/AttendanceDetail.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useCenterStore } from "@/stores/useCenterStore";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import StudentAvatar from "@/components/shared/StudentAvatar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function AttendanceDetail() {
  const { attendanceId } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const { records, getAttendanceByDate, deleteAttendance, isLoading } =
    useAttendanceStore();
  const { centers } = useCenterStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const parts = (attendanceId ?? "").split("-");
  const centerId = parts[0];
  const date = parts.slice(1).join("-");

  const location = useLocation();
  const passedRecords = location.state?.records;

  useEffect(() => {
    if (!passedRecords && centerId && date) {
      getAttendanceByDate(Number(centerId), date);
    }
  }, [centerId, date, passedRecords, getAttendanceByDate]);

  const passedCenterName = location.state?.centerName;

  const session = useMemo(() => {
    const dateRecords =
      passedRecords ??
      records.filter(
        (r) =>
          r.centerId === Number(centerId) &&
          r.date?.startsWith(date.split("T")[0]),
      );

    if (!dateRecords.length) return null;

    const center = centers.find((c) => c.id === Number(centerId));

    return {
      id: attendanceId ?? "",
      centerId: Number(centerId),
      centerName: passedCenterName ?? center?.title ?? "Unknown Center",
      date: date.split("T")[0],
      records: dateRecords,
    };
  }, [records, passedRecords, centerId, date, centers, attendanceId]);

  if (isLoading) {
    return (
      <div className="p-10 text-center text-gray-600 dark:text-gray-400">
        Loading attendance...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Attendance session not found.
      </div>
    );
  }

  const present = session.records.filter(
    (r: any) => r.status === "present",
  ).length;
  const absent = session.records.filter(
    (r: any) => r.status === "absent",
  ).length;

  // ── Handlers
  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        session.records.map((r: any) => deleteAttendance(r.id)),
      );
      toast.success("Attendance session deleted.");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete session.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-white">
              {new Date(session.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {session.centerName}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={!online}
          title={!online ? "You're offline" : "Delete this session"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 ${
            !online
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
        >
          <Trash2 size={16} />
          Delete Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {present}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {absent}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {session.records.length}
          </p>
        </div>
      </div>

      {/* Records */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {session.records.map((record: any) => (
              <tr
                key={record.studentId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      student={record.student}
                      sizeClass="w-10 h-10"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {record.student.firstName} {record.student.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono">
                  {record.student.idNumber}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      record.status === "present"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {record.status === "present" ? "Present" : "Absent"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Attendance Session?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This will permanently delete all {session.records.length}{" "}
              attendance record{session.records.length !== 1 ? "s" : ""} for
              this date. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
