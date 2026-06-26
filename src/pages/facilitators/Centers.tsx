// src/pages/facilitators/Centers.tsx
import { Building2, LayoutGrid, List, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useCenterStore } from "@/stores/useCenterStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import CenterGridCard from "@/components/shared/CenterGridCard";
import CenterListItem from "@/components/shared/CenterListItem";

export default function Centers() {
  // ── Store
  const { currentFacilitator } = useFacilitatorStore();
  const { centers, isLoading } = useCenterStore();

  // ── State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Derived
  const assignedCenters = useMemo(() => {
    if (!currentFacilitator) return [];
    return centers.filter((c) =>
      currentFacilitator.assignedCenterIds?.includes(c.id),
    );
  }, [centers, currentFacilitator]);

  const filteredCenters = useMemo(() => {
    if (!debouncedSearch.trim()) return assignedCenters;
    const lower = debouncedSearch.toLowerCase().trim();
    return assignedCenters.filter((c) => c.title.toLowerCase().includes(lower));
  }, [debouncedSearch, assignedCenters]);

  // ── Guards: loading / empty
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          Loading centers...
        </div>
      </div>
    );
  }

  if (assignedCenters.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <Building2 size={48} className="text-gray-300 dark:text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          No Center Assigned
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You have not been assigned to a center yet. Please contact your
          administrator.
        </p>
      </div>
    );
  }

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-4xl text-gray-900 dark:text-white">Centers</h3>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Search */}
        <div className="w-full sm:w-80 lg:w-96 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg transition-colors">
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

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 transition-colors">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded transition-colors ${
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
            className={`p-2.5 rounded transition-colors ${
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
      {filteredCenters.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No centers found matching "{searchTerm}"
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredCenters.map((center) => (
            <CenterGridCard
              key={center.id}
              center={center}
              role={"facilitator"}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredCenters.map((center) => (
            <CenterListItem
              key={center.id}
              center={center}
              role={"facilitator"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
