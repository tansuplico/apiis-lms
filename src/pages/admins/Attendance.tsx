// src/pages/admins/AttendanceRecords.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCenterStore } from "@/stores/useCenterStore";
import { AttendanceRecord } from "@/types/types";
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import { useAttendanceStore } from "@/stores/useAttendanceStore";
import { isOnline, onNetworkChange } from "@/services/networkStatus";

const ITEMS_PER_PAGE = 10;

type FilterType = "all" | "center" | "facilitator";

// ── Sub-component: AttendanceRecordsSkeleton
// No shared skeleton exists for this table's specific column layout
// (Date/Center/Present/Absent/Total/Actions), so it's built locally rather
// than reusing a mismatched one from another table.
function AttendanceRecordsSkeleton({ rows }: { rows: number }) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="px-6 py-4">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </td>
          <td className="px-6 py-4 text-center">
            <div className="h-5 w-10 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </td>
          <td className="px-6 py-4 text-center">
            <div className="h-5 w-10 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </td>
          <td className="px-6 py-4 text-center">
            <div className="h-4 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </td>
          <td className="px-6 py-4 text-center">
            <div className="h-8 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default function AttendanceRecords() {
  const navigate = useNavigate();

  // ── Search & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Stores
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const { centers } = useCenterStore();
  const { facilitators } = useFacilitatorListStore();
  const { records, deleteAttendance, getAttendanceByCenter } =
    useAttendanceStore();

  // ── Filters
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState<
    number | null
  >(null);

  // ── Delete modal
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Network
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = onNetworkChange(setOnline);
    return () => unsubscribe();
  }, []);

  // ── Initial fetch
  // Local loading flag instead of useAttendanceStore's isLoading — that
  // flag is shared global state set/cleared per individual
  // getAttendanceByCenter call, so firing N of them via forEach (as before)
  // made it flip back to false the moment the FASTEST center resolved, not
  // once ALL of them had. Promise.all + a local flag here fixes that
  // without touching the store's general-purpose isLoading semantics,
  // which other callers may depend on behaving the existing way.
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!online) return;
    if (centers.length && !fetchedRef.current) {
      fetchedRef.current = true;
      setIsFetchingAll(true);
      Promise.all(centers.map((c) => getAttendanceByCenter(c.id))).finally(() =>
        setIsFetchingAll(false),
      );
    }
  }, [centers, online]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Derived: sessions grouped by center + date
  const allSessions = useMemo(() => {
    const grouped: Record<string, AttendanceRecord[]> = {};

    records.forEach((r) => {
      const key = `${r.centerId}-${r.date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    return Object.entries(grouped)
      .map(([_key, recs]) => {
        const center = centers.find((c) => c.id === recs[0]?.centerId);
        const normalizedDate = (recs[0]?.date ?? "").split("T")[0];
        return {
          id: `${recs[0]?.centerId}-${normalizedDate}`,
          centerId: recs[0]?.centerId ?? 0,
          centerName: center?.title ?? "Unknown Center",
          date: normalizedDate,
          records: recs,
          savedBy: recs[0]?.facilitatorId ?? 0,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, centers]);

  // ── Derived: skeleton condition — matches showSkeleton = isLoading &&
  // data.length === 0 convention used elsewhere, just keyed on the local
  // batch-aware flag instead of the store's per-call isLoading.
  const showSkeleton = isFetchingAll && allSessions.length === 0;

  // ── Derived: facilitator id → name
  const facilitatorNameMap = useMemo(() => {
    const map = new Map<number, string>();
    facilitators.forEach((f) => map.set(f.id, `${f.firstName} ${f.lastName}`));
    return map;
  }, [facilitators]);

  // ── Derived: filtered + paginated sessions
  const filteredSessions = useMemo(() => {
    let result = allSessions;

    if (filterType === "center" && selectedCenterId) {
      result = result.filter((s) => s.centerId === selectedCenterId);
    } else if (filterType === "facilitator" && selectedFacilitatorId) {
      result = result.filter((s) => s.savedBy === selectedFacilitatorId);
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          new Date(s.date).toLocaleDateString().toLowerCase().includes(lower) ||
          s.centerName.toLowerCase().includes(lower) ||
          (facilitatorNameMap.get(s.savedBy) ?? "Unknown")
            .toLowerCase()
            .includes(lower),
      );
    }

    return result;
  }, [
    allSessions,
    filterType,
    selectedCenterId,
    selectedFacilitatorId,
    searchTerm,
  ]);

  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filteredSessions.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // ── Handlers: filters
  const handleFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedCenterId(null);
    setSelectedFacilitatorId(null);
    setCurrentPage(1);
  };

  // ── Handlers: delete
  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const session = allSessions.find((s) => s.id === sessionToDelete);
      if (session) {
        await Promise.all(session.records.map((r) => deleteAttendance(r.id)));
      }
      setSessionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">
        Please log in as an admin to view attendance records.
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
      </div>

      <div className="flex justify-between items-center">
        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter type toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(["all", "center", "facilitator"] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleFilterType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  filterType === type
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {type === "all"
                  ? "All"
                  : type === "center"
                    ? "By Center"
                    : "By Facilitator"}
              </button>
            ))}
          </div>

          {/* Center dropdown */}
          {filterType === "center" && (
            <select
              value={selectedCenterId ?? ""}
              onChange={(e) => {
                setSelectedCenterId(
                  e.target.value ? Number(e.target.value) : null,
                );
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Facilitator dropdown */}
          {filterType === "facilitator" && (
            <select
              value={selectedFacilitatorId ?? ""}
              onChange={(e) => {
                setSelectedFacilitatorId(
                  e.target.value ? Number(e.target.value) : null,
                );
                setCurrentPage(1);
              }}
              className=" px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Facilitators</option>
              {facilitators.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="w-full sm:w-80 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
          <Search
            size={18}
            className="text-gray-500 dark:text-gray-400 shrink-0"
          />
          <input
            type="text"
            placeholder="Search by date, center, or facilitator..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table */}
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

            {showSkeleton ? (
              <AttendanceRecordsSkeleton rows={ITEMS_PER_PAGE} />
            ) : (
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
                          navigate(`/admin/attendance/${session.id}`, {
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
                              onClick={(e) => handleDelete(e, session.id)}
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
            )}
          </table>
        </div>

        {/* Delete modal */}
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
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
}
