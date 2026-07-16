// src/pages/facilitators/Attendance.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useCenterStore } from "@/stores/useCenterStore";
import AttendanceOverview from "@/components/shared/AttendanceOverview";

export default function AttendanceRecords() {
  // ── Store
  const currentFacilitator = useFacilitatorStore((s) => s.currentFacilitator);
  const { centers } = useCenterStore();

  // ── Derived: centers assigned to this facilitator
  const assignedCenters = useMemo(() => {
    if (!currentFacilitator) return [];
    return centers.filter((c) =>
      currentFacilitator.assignedCenterIds?.includes(c.id),
    );
  }, [centers, currentFacilitator]);

  // ── State: which center's attendance is being viewed
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Effects: default to the first assigned center once loaded
  useEffect(() => {
    if (selectedCenterId === null && assignedCenters.length > 0) {
      setSelectedCenterId(assignedCenters[0].id);
    }
  }, [assignedCenters, selectedCenterId]);

  // ── Effects: close the dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCenter = assignedCenters.find((c) => c.id === selectedCenterId);

  // ── Guard: not logged in
  if (!currentFacilitator) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">
        Please log in as a facilitator to view attendance records.
      </div>
    );
  }

  // ── Guard: no assigned centers
  if (assignedCenters.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
        <Building2 size={40} className="opacity-30" />
        You aren't assigned to any centers yet.
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
        </div>

        {/* Center dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 min-w-55"
          >
            <Building2
              size={16}
              className="text-gray-500 dark:text-gray-400 shrink-0"
            />
            <span className="flex-1 text-left truncate">
              {selectedCenter?.title ?? "Select a center"}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-full min-w-55 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
              {assignedCenters.map((center) => (
                <button
                  key={center.id}
                  onClick={() => {
                    setSelectedCenterId(center.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Check
                    size={14}
                    className={
                      selectedCenterId === center.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "invisible"
                    }
                  />
                  <span className="truncate">{center.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar + totals for the selected center */}
      {selectedCenterId !== null && (
        <AttendanceOverview
          key={selectedCenterId}
          centerId={selectedCenterId}
          centerName={selectedCenter?.title}
          role="facilitator"
        />
      )}
    </div>
  );
}
