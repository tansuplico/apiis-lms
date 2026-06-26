// src/components/shared/AddCourseModal.tsx
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { Course } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";
import SelectionOverlay from "./SelectionOverlay";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 6;

interface AddCourseModalProps {
  centerId: number;
  setShowAddExistingCourseModal: React.Dispatch<React.SetStateAction<boolean>>;
  modalSearchTerm: string;
  setModalSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  modalViewMode: "grid" | "list";
  setModalViewMode: React.Dispatch<React.SetStateAction<"grid" | "list">>;
  selectedCoursesToAdd: number[];
  setSelectedCoursesToAdd: React.Dispatch<React.SetStateAction<number[]>>;
  // Unfiltered (pre-search) list of courses not yet in this center. Used to
  // look up selected courses for the summary panel so a chip doesn't vanish
  // just because the current search term would exclude it.
  availableCourses: Course[];
  // Same list, narrowed by modalSearchTerm — drives what's actually rendered
  // in the picker grid/list below.
  filteredAvailableCourses: Course[];
  GridCard: React.ComponentType<{
    course: Course;
    disableNavigation?: boolean;
  }>;
  ListItem: React.ComponentType<{
    course: Course;
    disableNavigation?: boolean;
  }>;
}

function AddCourseModal({
  centerId,
  setShowAddExistingCourseModal,
  modalSearchTerm,
  setModalSearchTerm,
  modalViewMode,
  setModalViewMode,
  selectedCoursesToAdd,
  setSelectedCoursesToAdd,
  availableCourses,
  filteredAvailableCourses,
  GridCard,
  ListItem,
}: AddCourseModalProps) {
  // ── Store
  const { addCourse } = useCenterStore();

  // ── State: how many courses are currently visible (load-more pagination)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── State: whether the selected-courses summary panel is expanded
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);

  // Reset pagination whenever the search narrows/changes the result set,
  // otherwise a stale visibleCount from a previous search either shows too
  // many results at once or leaves a confusing gap.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [modalSearchTerm]);

  const visibleCourses = filteredAvailableCourses.slice(0, visibleCount);
  const hasMore = filteredAvailableCourses.length > visibleCount;

  // Look up selected courses against the full unfiltered availableCourses
  // list, not filteredAvailableCourses — a course selected before a search
  // term narrows the visible list must still show up as a removable chip.
  const selectedCourses = useMemo(() => {
    return selectedCoursesToAdd
      .map((id) => availableCourses.find((c) => c.id === id))
      .filter((c): c is Course => Boolean(c));
  }, [selectedCoursesToAdd, availableCourses]);

  // ── Handlers
  const close = () => {
    setShowAddExistingCourseModal(false);
    setSelectedCoursesToAdd([]);
  };

  const toggleCourse = (courseId: number) => {
    setSelectedCoursesToAdd((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  const removeSelected = (courseId: number) => {
    setSelectedCoursesToAdd((prev) => prev.filter((id) => id !== courseId));
  };

  const handleAddCourses = async () => {
    if (selectedCoursesToAdd.length === 0) {
      toast.info("No courses selected.");
      return;
    }

    try {
      let addedCount = 0;
      for (const courseId of selectedCoursesToAdd) {
        const success = await addCourse(centerId, courseId);
        if (success) addedCount++;
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} course(s) added!`, {
          position: "bottom-right",
        });
      } else {
        toast.info("All selected courses are already in this center.");
      }
    } catch {
      // errors surface via addCourse internally
    } finally {
      close();
    }
  };

  // ── Helpers
  const cardClass = (courseId: number) =>
    `relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:shadow-lg ${
      selectedCoursesToAdd.includes(courseId)
        ? "border-green-500 shadow-lg"
        : "border-transparent hover:border-green-300"
    }`;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl text-gray-900 dark:text-white">
            Add Courses
          </h2>
          <button
            onClick={close}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected summary / review toggle */}
        {selectedCoursesToAdd.length > 0 && (
          <div className="mb-6 border border-green-200 dark:border-green-800 rounded-xl bg-green-50 dark:bg-green-900/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsReviewExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
            >
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {selectedCoursesToAdd.length} course
                {selectedCoursesToAdd.length === 1 ? "" : "s"} selected
              </span>
              {isReviewExpanded ? (
                <ChevronUp
                  size={18}
                  className="text-green-700 dark:text-green-300"
                />
              ) : (
                <ChevronDown
                  size={18}
                  className="text-green-700 dark:text-green-300"
                />
              )}
            </button>

            {isReviewExpanded && (
              <div className="px-5 pb-4 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {selectedCourses.map((course) => (
                  <span
                    key={course.id}
                    className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-full pl-3 pr-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {course.title}
                    <button
                      type="button"
                      onClick={() => removeSelected(course.id)}
                      className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + view toggle */}
        <div className="mb-6 flex justify-between gap-5">
          <div className="w-full flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
            <Search
              size={20}
              strokeWidth={1.5}
              className="text-gray-500 dark:text-gray-400"
            />
            <input
              type="text"
              placeholder="Search courses to add..."
              value={modalSearchTerm}
              onChange={(e) => setModalSearchTerm(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
            <button
              onClick={() => setModalViewMode("list")}
              aria-label="List view"
              className={`p-2.5 rounded transition-colors ${
                modalViewMode === "list"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              <List size={24} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setModalViewMode("grid")}
              aria-label="Grid view"
              className={`p-2.5 rounded transition-colors ${
                modalViewMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              <LayoutGrid size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Course list */}
        {filteredAvailableCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No courses found
          </div>
        ) : (
          <div className="mb-4">
            {modalViewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCourses.map((course) => (
                  <div
                    key={course.id}
                    className={cardClass(course.id)}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <GridCard course={course} disableNavigation />
                    {selectedCoursesToAdd.includes(course.id) && (
                      <SelectionOverlay />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleCourses.map((course) => (
                  <div
                    key={course.id}
                    className={cardClass(course.id)}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <ListItem course={course} disableNavigation />
                    {selectedCoursesToAdd.includes(course.id) && (
                      <SelectionOverlay />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Load more + count indicator */}
        {filteredAvailableCourses.length > 0 && (
          <div className="flex flex-col items-center gap-3 mb-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {visibleCourses.length} of{" "}
              {filteredAvailableCourses.length} course
              {filteredAvailableCourses.length !== 1 ? "s" : ""}
            </p>
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors cursor-pointer"
              >
                Load more
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleAddCourses}
            disabled={selectedCoursesToAdd.length === 0}
            className="flex-1 bg-[#03C03C] dark:bg-green-700 dark:hover:bg-green-600 disabled:dark:bg-green-800 text-white py-3 px-6 rounded-lg font-medium transition-all cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          >
            Add{" "}
            {selectedCoursesToAdd.length > 0 ? selectedCoursesToAdd.length : ""}{" "}
            Course{selectedCoursesToAdd.length !== 1 ? "s" : ""}
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-lg font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCourseModal;
