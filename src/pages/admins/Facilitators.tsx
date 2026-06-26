// src/pages/admin/Facilitators.tsx
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { useCenterStore } from "@/stores/useCenterStore";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import { useDebounce } from "@/hooks/useDebounce";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import CreateFacilitatorModal from "@/components/admins/facilitators/CreateFacilitatorModal";
import TempPasswordModal from "@/components/admins/facilitators/TempPasswordModal";
import EditFacilitatorModal from "@/components/admins/facilitators/EditFacilitatorModal";
import FacilitatorTableSkeleton from "@/components/ui/FacilitatorSkeleton";
import { Facilitator } from "@/types/types";

const ITEMS_PER_PAGE = 10;

// ── Sub-component: FacilitatorAvatar
// Mirrors the canonical avatar pattern used elsewhere (StudentAvatar in
// AddStudentModal.tsx / AttendanceTab.tsx) — real photo when available,
// online, and not errored; otherwise an initial-letter fallback. Uses the
// purple/indigo gradient established for facilitators (ProfileBanner,
// PhotoModal), replacing the old solid bg-blue-500 fill. Also fixes the
// previous onError handler, which set img.src = "" — an empty src renders
// a blank broken-image box, not a fallback; this tracks hasError as real
// state and swaps to the gradient/initial view instead.
function FacilitatorAvatar({ facilitator }: { facilitator: Facilitator }) {
  const [hasError, setHasError] = useState(false);
  const online = useOnlineStatus();
  const src = facilitator.profilePicture?.startsWith("/api/")
    ? `${(import.meta.env.VITE_API_URL as string).replace("/api", "")}${facilitator.profilePicture}`
    : facilitator.profilePicture;

  if (!src || !online || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white font-bold bg-linear-to-br from-purple-400 to-indigo-500">
        {facilitator.firstName.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${facilitator.firstName} ${facilitator.lastName}`}
      className="w-full h-full object-cover"
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (!img.dataset.errored) {
          img.dataset.errored = "1";
          setHasError(true);
        }
      }}
    />
  );
}

export default function AdminFacilitators() {
  // ── Search & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Store
  const { centers } = useCenterStore();
  const {
    facilitators,
    addFacilitator,
    updateFacilitator,
    removeFacilitator,
    isLoading,
  } = useFacilitatorListStore();

  // ── Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [facilitatorToEdit, setFacilitatorToEdit] = useState<
    (typeof facilitators)[0] | null
  >(null);

  // ── Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // ── Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [facilitatorToDelete, setFacilitatorToDelete] = useState<
    (typeof facilitators)[0] | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const online = useOnlineStatus();

  // ── Derived: filtered list
  const filteredFacilitators = useMemo(() => {
    if (!debouncedSearch.trim()) return facilitators;
    const lower = debouncedSearch.toLowerCase().trim();
    return facilitators.filter((f) => {
      const fullName =
        `${f.firstName} ${f.middleName ?? ""} ${f.lastName}`.toLowerCase();
      const assignedCenterTitles = centers
        .filter((c) => f.assignedCenterIds.includes(c.id))
        .map((c) => c.title.toLowerCase())
        .join(" ");
      return (
        fullName.includes(lower) ||
        f.email.toLowerCase().includes(lower) ||
        f.status.toLowerCase().includes(lower) ||
        assignedCenterTitles.includes(lower)
      );
    });
  }, [debouncedSearch, facilitators, centers]);

  // ── Derived: pagination
  const totalPages = Math.ceil(filteredFacilitators.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFacilitators = filteredFacilitators.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // ── Handlers: pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ── Handlers: edit
  const handleEdit = (facilitator: (typeof facilitators)[0]) => {
    setFacilitatorToEdit({ ...facilitator });
    setShowEditModal(true);
  };

  const handleUpdate = async (id: number, data: any) => {
    await updateFacilitator(id, data);
    setShowEditModal(false);
    setFacilitatorToEdit(null);
  };

  const checkEmailExists = (email: string, excludeId: number) => {
    return facilitators.some((f) => f.email === email && f.id !== excludeId);
  };

  // ── Handlers: create
  const handleCreate = async (data: any) => {
    const tempPass = await addFacilitator(data);
    setTempPassword(tempPass);
    setShowCreateModal(false);
    return tempPass;
  };

  // ── Handlers: delete
  const handleDelete = (facilitator: any) => {
    setFacilitatorToDelete(facilitator);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!facilitatorToDelete) return;
    setIsDeleting(true);
    try {
      await removeFacilitator(facilitatorToDelete.id);
      setShowDeleteModal(false);
      setFacilitatorToDelete(null);
    } catch {
      // error toast handled by store
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render
  return (
    <div className="space-y-10 pb-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          All Facilitators
        </h1>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-80 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
            <Search size={20} className="text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!online}
            title={!online ? "You're offline" : "Add Facilitator"}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all shrink-0 ${
              online
                ? "bg-[#0070FF] hover:bg-[#0063e4] text-white cursor-pointer"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <UserPlus size={18} />
            Add Facilitator
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Facilitator
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Current Center
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {isLoading ? (
              <FacilitatorTableSkeleton rows={ITEMS_PER_PAGE} />
            ) : (
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedFacilitators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-gray-500 dark:text-gray-400"
                    >
                      No facilitators found
                    </td>
                  </tr>
                ) : (
                  paginatedFacilitators.map((facilitator) => {
                    const assignedCenters = centers.filter((c) =>
                      facilitator.assignedCenterIds.includes(c.id),
                    );
                    return (
                      <tr
                        key={facilitator.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                            <FacilitatorAvatar facilitator={facilitator} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {facilitator.firstName} {facilitator.lastName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {facilitator.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {assignedCenters.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedCenters.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                >
                                  {c.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">
                              Not assigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              facilitator.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : facilitator.status === "inactive"
                                  ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            }`}
                          >
                            {facilitator.status === "active"
                              ? "Active"
                              : facilitator.status === "inactive"
                                ? "Inactive"
                                : "Banned"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(facilitator)}
                            disabled={!online}
                            title={
                              !online ? "You're offline" : "Edit Facilitator"
                            }
                            className={`p-2 rounded-lg ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/30"}  text-blue-600 dark:text-blue-400`}
                          >
                            <Edit size={18} />
                          </button>
                          {facilitator.mustChangePassword && (
                            <button
                              onClick={() => handleDelete(facilitator)}
                              disabled={!online}
                              title={
                                !online
                                  ? "You're offline"
                                  : "Delete Facilitator"
                              }
                              className={`p-2 rounded-lg ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"} text-red-500 dark:text-red-400`}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
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
        {filteredFacilitators.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing {startIndex + 1} to{" "}
              {Math.min(
                startIndex + ITEMS_PER_PAGE,
                filteredFacilitators.length,
              )}{" "}
              out of {filteredFacilitators.length} facilitators
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
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
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateFacilitatorModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
      {tempPassword && (
        <TempPasswordModal
          tempPassword={tempPassword}
          onClose={() => setTempPassword(null)}
        />
      )}
      {showEditModal && facilitatorToEdit && (
        <EditFacilitatorModal
          facilitator={facilitatorToEdit}
          onClose={() => {
            setShowEditModal(false);
            setFacilitatorToEdit(null);
          }}
          onUpdate={handleUpdate}
          checkEmailExists={checkEmailExists}
        />
      )}
      {showDeleteModal && facilitatorToDelete && (
        <DeleteConfirmModal
          title="Delete Facilitator?"
          message={`Are you sure you want to delete "${facilitatorToDelete.firstName} ${facilitatorToDelete.lastName}"? This action cannot be undone.`}
          itemName=""
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setFacilitatorToDelete(null);
          }}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
