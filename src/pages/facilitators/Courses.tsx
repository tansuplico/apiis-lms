// src/pages/facilitators/Courses.tsx
import {
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import CourseListItem from "@/components/shared/CourseListItem";
import CourseGridCard from "@/components/shared/CourseGridCard";
import CourseListItemSkeleton from "@/components/ui/CourseListItemSkeleton";
import CourseGridCardSkeleton from "@/components/ui/CourseGridCardSkeleton";
import { useCourseStore } from "@/stores/useCourseStore";

const ITEMS_PER_PAGE = 6;

export default function Courses() {
  // ── Store
  const { courses, isLoading } = useCourseStore();

  // ── State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Effects: reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Derived: filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return courses;

    const lower = searchTerm.toLowerCase().trim();

    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [searchTerm, courses]);

  // ── Derived: pagination
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCourses = filteredCourses.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // ── Derived: skeleton condition
  const showSkeleton = isLoading && courses.length === 0;

  // ── Handlers: pagination
  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-4xl text-gray-900 dark:text-white">Courses</h3>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Search */}
        <div className="w-full sm:w-96 lg:w-105 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg transition-colors">
          <Search
            size={20}
            strokeWidth={1.5}
            className="text-gray-500 dark:text-gray-400"
          />
          <input
            type="text"
            placeholder="Search a course..."
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
                ? "bg-[#0070FF] text-white shadow-sm"
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
                ? "bg-[#0070FF] text-white shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <CourseGridCardSkeleton key={i} role="facilitator" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <CourseListItemSkeleton key={i} role="facilitator" />
            ))}
          </div>
        )
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No courses found matching "{searchTerm}"
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {paginatedCourses.map((course) => (
            <CourseGridCard
              key={course.id}
              course={course}
              role={"facilitator"}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr">
          {paginatedCourses.map((course) => (
            <CourseListItem
              key={course.id}
              course={course}
              role={"facilitator"}
            />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {!showSkeleton && filteredCourses.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 px-4 py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div>
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredCourses.length)} out
            of {filteredCourses.length} courses
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
                    ? "bg-[#0070FF] text-white"
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
    </div>
  );
}
