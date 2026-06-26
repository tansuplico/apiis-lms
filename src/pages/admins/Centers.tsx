// src/pages/admin/Centers.tsx
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

import CenterGridCard from "@/components/shared/CenterGridCard";
import CenterListItem from "@/components/shared/CenterListItem";
import CreateCenterModal from "@/components/shared/CreateCenterModal";

import { useCenterStore } from "@/stores/useCenterStore";
import { useDebounce } from "@/hooks/useDebounce";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import CenterListItemSkeleton from "@/components/ui/CenterListItemSkeleton";
import CenterGridCardSkeleton from "@/components/ui/CenterGridCardSkeleton";

const ITEMS_PER_PAGE = 10;

export default function Centers() {
  // ── Stores
  const { centers, fetchCenters, isLoading } = useCenterStore();

  // ── Connectivity
  const online = useOnlineStatus();

  // ── View & search
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Effects: fetch on mount (skip if offline)
  useEffect(() => {
    if (online) fetchCenters();
  }, []);

  // ── Derived: filtered + paginated centers
  const filteredCenters = useMemo(() => {
    if (!debouncedSearch.trim()) return centers;
    const lower = debouncedSearch.toLowerCase().trim();
    return centers.filter((c) => c.title.toLowerCase().includes(lower));
  }, [debouncedSearch, centers]);

  const totalPages = Math.ceil(filteredCenters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCenters = filteredCenters.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // ── Derived: skeleton condition
  const showSkeleton = isLoading && centers.length === 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-4xl text-gray-900 dark:text-white">Centers</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!online}
          title={!online ? "You're offline" : "Add Facilitator"}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 ${
            online
              ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white cursor-pointer"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus size={20} />
          New Center
        </button>
      </div>

      {/* Search + view toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="w-full sm:w-80 lg:w-96 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
          <Search
            size={20}
            strokeWidth={1.5}
            className="text-gray-500 dark:text-gray-400"
          />
          <input
            type="text"
            placeholder="Search a center..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded ${
              viewMode === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            aria-label="List view"
          >
            <List size={24} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded ${
              viewMode === "grid"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Content */}
      {showSkeleton ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <CenterGridCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <CenterListItemSkeleton key={i} />
            ))}
          </div>
        )
      ) : filteredCenters.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No centers found matching "{searchTerm}"
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {paginatedCenters.map((center) => (
            <CenterGridCard key={center.id} center={center} role={"admin"} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {paginatedCenters.map((center) => (
            <CenterListItem key={center.id} center={center} role={"admin"} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!showSkeleton && filteredCenters.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 px-4 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div>
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredCenters.length)} out
            of {filteredCenters.length} centers
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
            ))}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateCenterModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            const newTotalPages = Math.ceil(
              (filteredCenters.length + 1) / ITEMS_PER_PAGE,
            );
            setCurrentPage(newTotalPages);
          }}
        />
      )}
    </div>
  );
}
