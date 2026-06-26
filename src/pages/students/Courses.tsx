// src/pages/students/Courses.tsx
import { LayoutGrid, List, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";

import CourseListItem from "@/components/shared/CourseListItem";
import CourseGridCard from "@/components/shared/CourseGridCard";
import { useCourseStore } from "@/stores/useCourseStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useStudentStore } from "@/stores/useStudentStore";

export default function Courses() {
  // ── Store
  const { courses } = useCourseStore();
  const { centers } = useCenterStore();
  const { currentStudent } = useStudentStore();

  // ── State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Derived: enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    if (!currentStudent?.currentCenter) return [];
    const center = centers.find((c) => c.id === currentStudent.currentCenter);
    return center?.courses ?? [];
  }, [centers, currentStudent?.currentCenter]);

  // ── Derived: filtered courses
  const filteredCourses = useMemo(() => {
    const enrolled = courses.filter((c) => enrolledCourseIds.includes(c.id));
    if (!debouncedSearch.trim()) return enrolled;
    const lower = debouncedSearch.toLowerCase().trim();
    return enrolled.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [courses, enrolledCourseIds, debouncedSearch]);

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      {/* Page header */}
      <h3 className="text-4xl mb-6 text-gray-900 dark:text-white">Courses</h3>

      {/* Search & view toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Search */}
        <div className="w-full sm:w-96 lg:w-105 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg">
          <Search
            size={20}
            strokeWidth={1.5}
            className="text-gray-500 dark:text-gray-400"
          />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded ${
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
            className={`p-2.5 rounded ${
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

      {/* Course list / empty state */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          {searchTerm ? (
            `No courses found matching "${searchTerm}"`
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">No enrolled courses yet.</p>
              <p className="text-sm">
                You will see courses here once your center assigns them to you.
              </p>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredCourses.map((course) => (
            <CourseGridCard key={course.id} course={course} role={"student"} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2  gap-6 auto-rows-f">
          {filteredCourses.map((course) => (
            <CourseListItem key={course.id} course={course} role={"student"} />
          ))}
        </div>
      )}
    </div>
  );
}
