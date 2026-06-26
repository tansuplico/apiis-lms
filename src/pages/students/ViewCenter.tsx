// src/pages/students/ViewCenter.tsx
import { LayoutGrid, List, Search } from "lucide-react";
import { useState, useMemo } from "react";

import ViewCenterGridCard from "@/components/shared/ViewCenterGridCard";
import ViewCenterListItem from "@/components/shared/ViewCenterListItem";
import { useParams, useNavigate } from "react-router-dom";
import { useCourseStore } from "@/stores/useCourseStore";
import { Course } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";

export default function ViewCenter() {
  // ── Store
  const { centerId } = useParams();
  const navigate = useNavigate();
  const { courses } = useCourseStore();
  const { centers } = useCenterStore();

  // ── State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Derived: current center & courses
  const currentCenter = centers.find((c) => c.id === Number(centerId));
  const centerTitle = currentCenter?.title ?? "Unknown Center";

  const centerCourses = useMemo(() => {
    if (!currentCenter) return [];
    return courses.filter((c) => currentCenter.courses.includes(c.id));
  }, [currentCenter, courses]);

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return centerCourses;
    const lower = searchTerm.toLowerCase().trim();
    return centerCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [searchTerm, centerCourses]);

  // ── Handlers: navigate to course preview
  const handleClick = (course: Course) => {
    navigate(`/student/courses/${course.id}/course-preview`, {
      state: { course },
    });
  };

  // ── Guard: center not found
  if (!currentCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
        Center not found.
      </div>
    );
  }

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-10">
      <h3 className="text-4xl mb-6 text-gray-900 dark:text-white">
        {centerTitle}
      </h3>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6">
        {/* Search input */}
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

        {/* View toggle */}
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

      {/* Search Result */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No courses found matching "{searchTerm}"
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredCourses.map((course) => (
            <ViewCenterGridCard
              key={course.id}
              course={course}
              role="student"
              onClickCourse={handleClick}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredCourses.map((course) => (
            <ViewCenterListItem
              key={course.id}
              course={course}
              role="student"
              onClickCourse={handleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
