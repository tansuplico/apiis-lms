// src/pages/facilitators/AttendanceRecords.tsx
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "react-toastify";
import { AttendanceRecord } from "@/types/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const ITEMS_PER_PAGE = 10;

export default function AttendanceRecords() {
  // ── Store
  const navigate = useNavigate();
  const currentFacilitator = useFacilitatorStore((s) => s.currentFacilitator);
  const { centers } = useCenterStore();
  const { records, deleteAttendance, getAttendanceByFacilitator, isLoading } =
    useAttendanceStore();
  const online = useOnlineStatus();

  // ── State
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Effects: fetch attendance on mount
  useEffect(() => {
    if (currentFacilitator) {
      getAttendanceByFacilitator();
    }
  }, [currentFacilitator]);

  // ── Derived: grouped sessions (normalized date key)
  const allSessions = useMemo(() => {
    if (!currentFacilitator) return [];

    const grouped: Record<string, AttendanceRecord[]> = {};
    records.forEach((r) => {
      const normalizedDate = r.date?.split("T")[0] ?? "unknown";
      if (!grouped[normalizedDate]) grouped[normalizedDate] = [];
      grouped[normalizedDate].push(r);
    });

    return Object.entries(grouped)
      .map(([date, recs]) => {
        const center = centers.find((c) => c.id === recs[0]?.centerId);
        return {
          id: `${recs[0]?.centerId}-${date}`,
          centerId: recs[0]?.centerId ?? 0,
          centerName: center?.title ?? "Unknown Center",
          date,
          records: recs,
          savedBy: currentFacilitator.id,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, currentFacilitator, centers]);

  // ── Derived: filtered sessions
  const filteredSessions = useMemo(() => {
    if (!debouncedSearch.trim()) return allSessions;
    const lower = debouncedSearch.toLowerCase().trim();
    return allSessions.filter(
      (s) =>
        new Date(s.date).toLocaleDateString().toLowerCase().includes(lower) ||
        s.centerName.toLowerCase().includes(lower),
    );
  }, [allSessions, debouncedSearch]);

  // ── Derived: pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filteredSessions.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // ── Handlers: delete session
  const confirmDelete = async () => {
    if (!sessionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const session = allSessions.find((s) => s.id === sessionToDelete);
      if (session) {
        await Promise.all(session.records.map((r) => deleteAttendance(r.id)));
      }
      setSessionToDelete(null);
      toast.success("Attendance session deleted.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete session.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Guard: not logged in
  if (!currentFacilitator) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">
        Please log in as a facilitator to view attendance records.
      </div>
    );
  }

  // ── Render
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Attendance Records
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {allSessions.length} total session
            {allSessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="w-full sm:w-80 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
          <Search
            size={18}
            className="text-gray-500 dark:text-gray-400 shrink-0"
          />
          <input
            type="text"
            placeholder="Search by date or center..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Center
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Present
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Absent
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-16 text-gray-500 dark:text-gray-400"
                    >
                      <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                      {searchTerm
                        ? `No records matching "${searchTerm}"`
                        : "No attendance records yet."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((session) => {
                    const present = session.records.filter(
                      (r) => r.status === "present",
                    ).length;
                    const absent = session.records.filter(
                      (r) => r.status === "absent",
                    ).length;
                    return (
                      <tr
                        key={session.id}
                        onClick={() =>
                          navigate(`/facilitator/attendance/${session.id}`, {
                            state: {
                              records: session.records,
                              centerName: session.centerName,
                            },
                          })
                        }
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {new Date(session.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {session.centerName}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            {present}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            {absent}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                          {session.records.length}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(session.id);
                              }}
                              disabled={!online}
                              title={
                                !online ? "You're offline" : "Delete Record"
                              }
                              className={`p-2 rounded-lg text-red-600 dark:text-red-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {startIndex + 1}–
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredSessions.length)}{" "}
                of {filteredSessions.length}
              </span>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Attendance Record?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This action cannot be undone. The attendance record will be
              permanently deleted.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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
