// src/pages/admins/Attendance.tsx
import { useState, useEffect, useRef } from "react";
import { Building2, Users, ChevronDown, Check } from "lucide-react";
import { useAdminStore } from "@/stores/useAdminStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import AttendanceOverview from "@/components/shared/AttendanceOverview";
import FacilitatorAttendanceOverview from "@/components/shared/FacilitatorAttendanceOverview";

type Mode = "center" | "facilitator";

export default function AttendanceRecords() {
  // ── Store
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const { centers } = useCenterStore();
  const { facilitators } = useFacilitatorListStore();

  // ── State: which mode + which center/facilitator is being viewed
  const [mode, setMode] = useState<Mode>("center");
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState<
    number | null
  >(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Effects: default to the first center / facilitator once loaded.
  // Admins see ALL centers here (unlike the facilitator page, which only
  // shows centers that facilitator is assigned to).
  useEffect(() => {
    if (selectedCenterId === null && centers.length > 0) {
      setSelectedCenterId(centers[0].id);
    }
  }, [centers, selectedCenterId]);

  useEffect(() => {
    if (selectedFacilitatorId === null && facilitators.length > 0) {
      setSelectedFacilitatorId(facilitators[0].id);
    }
  }, [facilitators, selectedFacilitatorId]);

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

  const selectedCenter = centers.find((c) => c.id === selectedCenterId);
  const selectedFacilitator = facilitators.find(
    (f) => f.id === selectedFacilitatorId,
  );

  // ── Handlers
  const handleModeChange = (next: Mode) => {
    setMode(next);
    setIsDropdownOpen(false);
  };

  // ── Guard: not logged in
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
          <h3 className="text-4xl text-gray-900 dark:text-white">
            {" "}
            Attendance Records
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleModeChange("center")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "center"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              By Center
            </button>
            <button
              onClick={() => handleModeChange("facilitator")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "facilitator"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              By Facilitator
            </button>
          </div>

          {/* Center / Facilitator dropdown */}
          <div className="relative" ref={dropdownRef}>
            {mode === "center" ? (
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
            ) : (
              <button
                onClick={() => setIsDropdownOpen((open) => !open)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 min-w-55"
              >
                <Users
                  size={16}
                  className="text-gray-500 dark:text-gray-400 shrink-0"
                />
                <span className="flex-1 text-left truncate">
                  {selectedFacilitator
                    ? `${selectedFacilitator.firstName} ${selectedFacilitator.lastName}`
                    : "Select a facilitator"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {isDropdownOpen && mode === "center" && (
              <div className="absolute right-0 mt-2 w-full min-w-55 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
                {centers.map((center) => (
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

            {isDropdownOpen && mode === "facilitator" && (
              <div className="absolute right-0 mt-2 w-full min-w-55 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
                {facilitators.map((facilitator) => (
                  <button
                    key={facilitator.id}
                    onClick={() => {
                      setSelectedFacilitatorId(facilitator.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Check
                      size={14}
                      className={
                        selectedFacilitatorId === facilitator.id
                          ? "text-blue-600 dark:text-blue-400"
                          : "invisible"
                      }
                    />
                    <span className="truncate">
                      {facilitator.firstName} {facilitator.lastName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guard: no centers / no facilitators exist yet */}
      {mode === "center" && centers.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
          <Building2 size={40} className="opacity-30" />
          No centers have been created yet.
        </div>
      )}
      {mode === "facilitator" && facilitators.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
          <Users size={40} className="opacity-30" />
          No facilitators have been added yet.
        </div>
      )}

      {/* Calendar + summary for the selected center / facilitator */}
      {mode === "center" && selectedCenterId !== null && (
        <AttendanceOverview
          key={`center-${selectedCenterId}`}
          centerId={selectedCenterId}
          centerName={selectedCenter?.title}
          role="admin"
        />
      )}
      {mode === "facilitator" && selectedFacilitatorId !== null && (
        <FacilitatorAttendanceOverview
          key={`facilitator-${selectedFacilitatorId}`}
          facilitatorId={selectedFacilitatorId}
          facilitatorName={
            selectedFacilitator
              ? `${selectedFacilitator.firstName} ${selectedFacilitator.lastName}`
              : undefined
          }
          facilitatorCreatedAt={selectedFacilitator?.createdAt}
        />
      )}
    </div>
  );
}
