// src/pages/students/Centers.tsx
import { LayoutGrid, List, Search, Building, History } from "lucide-react";
import { useState, useMemo } from "react";
import CenterGridCard from "@/components/shared/CenterGridCard";
import CenterListItem from "@/components/shared/CenterListItem";
import { useStudentStore } from "@/stores/useStudentStore";
import { useCenterStore } from "@/stores/useCenterStore";

export default function Centers() {
  // ── Store
  const { currentStudent } = useStudentStore();
  const { centers } = useCenterStore();

  // ── State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [centerView, setCenterView] = useState<"current" | "previous">(
    "current",
  );
  const [searchTerm, setSearchTerm] = useState("");

  // ── Derived: current center
  const currentCenter = useMemo(() => {
    const center = centers.find((c) => c.id === currentStudent?.currentCenter);
    if (!center || !center.students.includes(currentStudent?.id ?? -1)) {
      return null;
    }
    return center;
  }, [centers, currentStudent?.currentCenter, currentStudent?.id]);

  // ── Derived: previous centers
  const previousCenters = useMemo(() => {
    return (currentStudent?.previousCenters || [])
      .map((id) => centers.find((c) => c.id === id))
      .filter((c): c is (typeof centers)[0] => !!c);
  }, [currentStudent?.previousCenters]);

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      <h3 className="text-4xl mb-6 text-gray-900 dark:text-white">Centers</h3>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 flex-wrap">
        {/* Search */}
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

        {/* Current / Previous Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setCenterView("current")}
            className={`p-2.5 rounded ${
              centerView === "current"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            aria-label="Current Center"
          >
            <Building size={24} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setCenterView("previous")}
            className={`p-2.5 rounded ${
              centerView === "previous"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
            aria-label="Previous Centers"
          >
            <History size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Grid/List Toggle */}
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
      {(() => {
        if (centerView === "current") {
          if (!currentCenter) {
            return (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                No center assigned yet.
              </div>
            );
          }

          return viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              <CenterGridCard
                key={currentCenter.id}
                center={currentCenter}
                role={"student"}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 flex-col gap-5">
              <CenterListItem
                key={currentCenter.id}
                center={currentCenter}
                role={"student"}
              />
            </div>
          );
        }

        if (previousCenters.length === 0) {
          return (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              No previous centers visited yet.
            </div>
          );
        }

        return viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {previousCenters.map((center) => (
              <CenterGridCard
                key={center.id}
                center={center}
                role={"student"}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 flex-col gap-5">
            {previousCenters.map((center) => (
              <CenterListItem
                key={center.id}
                center={center}
                role={"student"}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
