// src/pages/admin/Students.tsx
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  History,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { AccountStatus, Student } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { useStudentStore } from "@/stores/useStudentStore";
import { useDebounce } from "@/hooks/useDebounce";
import ImportStudentsModal from "@/components/admins/students/ImportStudentsModal";
import CreateStudentModal from "@/components/admins/students/CreateStudentModal";
import { apiClient } from "@/services/apiClient";
import ResetPasswordConfirmModal from "@/components/admins/students/ResetPasswordConfirmModal";
import EditStudentModal from "@/components/admins/students/EditStudentModal";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import StudentTableSkeleton from "@/components/ui/StudentSkeleton";
import StudentAvatar from "@/components/shared/StudentAvatar";

const ITEMS_PER_PAGE = 10;

export default function Students() {
  // ── Store
  const { centers } = useCenterStore();
  const online = useOnlineStatus();
  const { students, removeStudent, isLoading } = useStudentListStore();

  // ── Search & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal: remove
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // ── Modal: edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // ── Modal: create
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Modal: reset password
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState<{
    student: Student;
    newPassword: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // ── Modal: import CSV
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Derived: search & pagination
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Sort & filter
  type SortKey = "name" | "idNumber" | "status" | "center";
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">(
    "all",
  );
  const [centerFilter, setCenterFilter] = useState<string>("all");

  // ── Modal: transfer history
  const [studentForHistory, setStudentForHistory] = useState<Student | null>(
    null,
  );
  const [historyLogs, setHistoryLogs] = useState<
    {
      id: number;
      action: "added" | "removed";
      centerTitle: string;
      performedByName: string;
      performedByRole: string;
      createdAt: string;
    }[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const centerTitleMap = useMemo(() => {
    const map = new Map<number, string>();
    centers.forEach((c) => map.set(c.id, c.title));
    return map;
  }, [centers]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (debouncedSearch.trim()) {
      const lower = debouncedSearch.toLowerCase().trim();
      result = result.filter((s) => {
        const fullName =
          `${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.toLowerCase();
        const assignedTitle = centerTitleMap.get(s.currentCenter ?? -1) ?? "";
        return (
          fullName.includes(lower) ||
          s.idNumber.toLowerCase().includes(lower) ||
          s.status.toLowerCase().includes(lower) ||
          assignedTitle.toLowerCase().includes(lower)
        );
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (centerFilter !== "all") {
      result = result.filter((s) =>
        centerFilter === "unassigned"
          ? s.currentCenter === null
          : s.currentCenter === Number(centerFilter),
      );
    }

    if (sortBy) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "name":
            cmp = `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
            );
            break;
          case "idNumber":
            cmp = a.idNumber.localeCompare(b.idNumber);
            break;
          case "status":
            cmp = a.status.localeCompare(b.status);
            break;
          case "center": {
            const titleA = centerTitleMap.get(a.currentCenter ?? -1) ?? "";
            const titleB = centerTitleMap.get(b.currentCenter ?? -1) ?? "";
            cmp = titleA.localeCompare(titleB);
            break;
          }
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [
    debouncedSearch,
    students,
    centerTitleMap,
    statusFilter,
    centerFilter,
    sortBy,
    sortDirection,
  ]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, centerFilter]);

  // ── Handlers: pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ── Handlers: edit
  const handleEdit = (student: Student) => {
    setStudentToEdit({ ...student, password: "" });
    setShowEditModal(true);
  };

  // ── Handlers: remove
  const handleRemove = (student: Student) => {
    setStudentToRemove(student);
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    if (!studentToRemove) return;
    setIsRemoving(true);
    try {
      await removeStudent(studentToRemove.id);
      const { currentStudent, logout } = useStudentStore.getState();
      if (currentStudent?.id === studentToRemove.id) await logout();
      setShowRemoveModal(false);
      setStudentToRemove(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove student.");
    } finally {
      setIsRemoving(false);
    }
  };

  const groupedHistoryLogs = useMemo(() => {
    const groups = new Map<string, typeof historyLogs>();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    historyLogs.forEach((log) => {
      const d = new Date(log.createdAt);
      const label =
        d.toDateString() === today.toDateString()
          ? "Today"
          : d.toDateString() === yesterday.toDateString()
            ? "Yesterday"
            : d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year:
                  d.getFullYear() !== today.getFullYear()
                    ? "numeric"
                    : undefined,
              });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(log);
    });

    return Array.from(groups.entries());
  }, [historyLogs]);

  // ── Handlers: sorting
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortBy !== column)
      return <ArrowUpDown size={14} className="opacity-40" />;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  // ── Handlers: view transfer history
  const handleViewHistory = async (student: Student) => {
    setStudentForHistory(student);
    setIsLoadingHistory(true);

    try {
      const response = await apiClient.get<
        {
          id: number;
          action: "added" | "removed";
          centerTitle: string;
          performedByName: string;
          performedByRole: string;
          createdAt: string;
        }[]
      >(`/students/${student.id}/center-logs`);

      setHistoryLogs(response.data ?? []);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load transfer history.");
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── Handlers: reset password
  const handleResetPassword = async (student: Student) => {
    setIsResetting(true);
    try {
      const response = await apiClient.post<{ temporaryPassword: string }>(
        `/students/${student.id}/reset-password`,
        {},
      );
      const newPassword = response.data?.temporaryPassword;
      if (newPassword) {
        setResetPasswordData({ student, newPassword });
        toast.success("Password reset successfully.");
      } else {
        toast.error("No password returned from server.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  // ── Render
  return (
    <div className="space-y-10 pb-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <h3 className="text-4xl text-gray-900 dark:text-white"> All Students </h3>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-5">
            <div className="w-full sm:w-80 flex items-center  gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
              <Search size={20} className="text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AccountStatus | "all")
              }
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>

            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-3 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">All centers</option>
              <option value="unassigned">Not assigned</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-5">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!online}
              title={
                !online ? "You're offline — connect to make changes" : undefined
              }
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all whitespace-nowrap shrink-0 ${
                online
                  ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white cursor-pointer shadow-md hover:shadow-lg"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              <Plus size={20} />
              New Student
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              disabled={!online}
              title={
                !online ? "You're offline — connect to make changes" : undefined
              }
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all whitespace-nowrap shrink-0 ${
                online
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              <Plus size={20} />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Student
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Name
                    <SortIcon column="name" />
                  </button>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => handleSort("center")}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Current Center
                    <SortIcon column="center" />
                  </button>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => handleSort("idNumber")}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    ID Number
                    <SortIcon column="idNumber" />
                  </button>
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Status
                    <SortIcon column="status" />
                  </button>
                </th>
                <th className="px-6 py-4 text-sm font-semibold  text-gray-700 dark:text-gray-300 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            {isLoading ? (
              <StudentTableSkeleton rows={ITEMS_PER_PAGE} />
            ) : (
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12 text-gray-500 dark:text-gray-400"
                    >
                      No students found
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const assignedTitle =
                      centerTitleMap.get(student.currentCenter ?? -1) ?? "";
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4">
                          <StudentAvatar student={student} />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {student.firstName}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {assignedTitle || (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono">
                          {student.idNumber}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setStudentToReset(student)}
                            disabled={!online}
                            title={
                              !online
                                ? "You're offline"
                                : "Reset password (generate new one)"
                            }
                            className={`p-2 rounded-lg text-yellow-600 dark:text-yellow-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-yellow-50 dark:hover:bg-yellow-900/30"}`}
                          >
                            <span>Reset</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              student.status === "banned"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                : student.status === "active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300"
                            }`}
                          >
                            {student.status === "active"
                              ? "Active"
                              : student.status === "inactive"
                                ? "Inactive"
                                : "Banned"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex gap-3 justify-end">
                          <button
                            onClick={() => handleViewHistory(student)}
                            title="View transfer history"
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <History size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(student)}
                            disabled={!online}
                            title={!online ? "You're offline" : "Edit student"}
                            className={`p-2 rounded-lg text-blue-600 dark:text-blue-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleRemove(student)}
                            disabled={!online}
                            title={
                              !online ? "You're offline" : "Remove student"
                            }
                            className={`p-2 rounded-lg text-red-600 dark:text-red-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredStudents.length)}{" "}
              out of {filteredStudents.length} students
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 rounded-lg font-medium ${
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
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRemoveModal && studentToRemove && (
        <DeleteConfirmModal
          title="Remove Student?"
          message={`Are you sure you want to permanently remove ${studentToRemove.firstName} (${studentToRemove.idNumber})?`}
          itemName=""
          onConfirm={confirmRemove}
          onCancel={() => {
            setShowRemoveModal(false);
            setStudentToRemove(null);
          }}
          isDeleting={isRemoving}
        />
      )}

      {showEditModal && studentToEdit && (
        <EditStudentModal
          isOpen={showEditModal}
          student={studentToEdit}
          onClose={() => {
            setShowEditModal(false);
            setStudentToEdit(null);
          }}
          onSuccess={() => {}}
        />
      )}

      {showCreateModal && (
        <CreateStudentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showImportModal && (
        <ImportStudentsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {studentToReset && (
        <ResetPasswordConfirmModal
          student={studentToReset}
          isResetting={isResetting}
          onConfirm={async () => {
            await handleResetPassword(studentToReset);
            setStudentToReset(null);
          }}
          onCancel={() => setStudentToReset(null)}
        />
      )}

      {resetPasswordData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Password Reset</h3>
            <p className="mb-2">
              New password for {resetPasswordData.student.firstName}{" "}
              {resetPasswordData.student.lastName}:
            </p>
            <p className="text-2xl font-mono text-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
              {resetPasswordData.newPassword}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(resetPasswordData.newPassword);
                toast.success("Copied to clipboard!");
              }}
              className="w-full mb-2 bg-blue-600 text-white py-2 rounded-lg"
            >
              Copy Password
            </button>
            <button
              onClick={() => setResetPasswordData(null)}
              className="w-full bg-gray-200 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {studentForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="w-110 h-145 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            {/* Header — pinned */}
            <div className="shrink-0 flex items-start justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Center history
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white">
                  {studentForHistory.firstName} {studentForHistory.lastName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setStudentForHistory(null);
                  setHistoryLogs([]);
                }}
                className="p-1.5 -mr-1.5 -mt-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body — independently scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingHistory ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                  Loading history…
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <History
                    size={28}
                    className="text-gray-300 dark:text-gray-700"
                  />
                  <p className="text-sm text-gray-400 dark:text-gray-500 max-w-55">
                    No center changes yet. Assignments and transfers will show
                    up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedHistoryLogs.map(([dateLabel, entries]) => (
                    <div key={dateLabel}>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                        {dateLabel}
                      </p>
                      <ul className="relative border-l border-gray-200 dark:border-gray-700 ml-1.5">
                        {entries.map((log) => (
                          <li
                            key={log.id}
                            className="relative pl-5 pb-5 last:pb-0"
                          >
                            <span
                              className={`absolute -left-1.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-gray-900 ${
                                log.action === "added"
                                  ? "bg-green-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {log.performedByName}
                              </span>{" "}
                              {log.action === "added"
                                ? "assigned to"
                                : "removed from"}{" "}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {log.centerTitle}
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                              {new Date(log.createdAt).toLocaleTimeString(
                                undefined,
                                { hour: "numeric", minute: "2-digit" },
                              )}{" "}
                              · {log.performedByRole}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
