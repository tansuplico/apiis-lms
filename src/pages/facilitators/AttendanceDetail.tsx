// src/pages/facilitators/AttendanceDetail.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useCenterStore } from "@/stores/useCenterStore";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { useEffect, useMemo } from "react";
import { AttendanceRecord } from "@/types/types";
import userIcon from "@/assets/user-icon.png";

export default function AttendanceDetail() {
  // ── Router & Store
  const { attendanceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { records, getAttendanceByDate, isLoading } = useAttendanceStore();
  const { centers } = useCenterStore();

  // ── Derived: parse params
  const parts = (attendanceId ?? "").split("-");
  const centerId = parts[0];
  const date = parts.slice(1).join("-");

  const passedRecords = location.state?.records as
    | AttendanceRecord[]
    | undefined;
  const passedCenterName = location.state?.centerName as string | undefined;

  // ── Effects: fetch if no passed records
  useEffect(() => {
    if (!passedRecords && centerId && date) {
      getAttendanceByDate(Number(centerId), date);
    }
  }, [centerId, date, passedRecords]);

  // ── Derived: session object
  const session = useMemo(() => {
    if (passedRecords && passedRecords.length) {
      const center = centers.find((c) => c.id === Number(centerId));
      return {
        id: attendanceId ?? "",
        centerId: Number(centerId),
        centerName: passedCenterName ?? center?.title ?? "Unknown Center",
        date,
        records: passedRecords,
      };
    }

    const dateRecords = records.filter(
      (r) => r.centerId === Number(centerId) && r.date?.startsWith(date),
    );
    if (!dateRecords.length) return null;

    const center = centers.find((c) => c.id === Number(centerId));
    return {
      id: attendanceId ?? "",
      centerId: Number(centerId),
      centerName: center?.title ?? "Unknown Center",
      date,
      records: dateRecords,
    };
  }, [
    records,
    passedRecords,
    passedCenterName,
    centerId,
    date,
    centers,
    attendanceId,
  ]);

  // ── Guards: loading / not found
  if (isLoading && !passedRecords) {
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

  // ── Derived: counts
  const present = session.records.filter((r) => r.status === "present").length;
  const absent = session.records.filter((r) => r.status === "absent").length;

  // ── Render
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
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

      {/* Records Table */}
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
                    <img
                      src={record.studentAvatar || userIcon}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover"
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
    </div>
  );
}
