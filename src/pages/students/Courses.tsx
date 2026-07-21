// src/pages/students/Courses.tsx
import { ChevronDown, LayoutGrid, List, Search } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Derived: enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    if (!currentStudent?.currentCenter) return [];
    const center = centers.find((c) => c.id === currentStudent.currentCenter);
    return center?.courses ?? [];
  }, [centers, currentStudent?.currentCenter]);

  // ── Derived: all enrolled courses (pre-search, pre-category — used to
  // build the subject dropdown so its options don't shrink while searching)
  const enrolledCourses = useMemo(
    () => courses.filter((c) => enrolledCourseIds.includes(c.id)),
    [courses, enrolledCourseIds],
  );

  // ── Derived: subject options for the dropdown, straight from real course data
  const categories = useMemo(() => {
    const set = new Set(enrolledCourses.map((c) => c.category).filter(Boolean));
    return Array.from(set);
  }, [enrolledCourses]);

  // ── Derived: filtered courses
  const filteredCourses = useMemo(() => {
    let result = enrolledCourses;
    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }
    if (!debouncedSearch.trim()) return result;
    const lower = debouncedSearch.toLowerCase().trim();
    return result.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower),
    );
  }, [enrolledCourses, selectedCategory, debouncedSearch]);

  // ── Render
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 pb-10">
      {/* Page header */}
      <h3
        className="text-4xl font-extrabold mb-1"
        style={{ color: "var(--student-ink)" }}
      >
        My Courses
      </h3>

      {/* Search, subject filter & view toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Search */}
        <div className="w-full sm:w-96 lg:w-105 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-3 rounded-full focus-within:border-[var(--student-blue)] transition-colors">
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Subject filter — built from real course.category values */}
          {categories.length > 1 && (
            <Listbox
              value={selectedCategory ?? "All"}
              onChange={(val) =>
                setSelectedCategory(val === "All" ? null : val)
              }
            >
              <div className="relative w-full sm:w-48">
                <ListboxButton className="relative w-full flex items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-full font-medium border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--student-blue)]/40 transition-colors">
                  <span className="truncate">
                    {selectedCategory ?? "All Subjects"}
                  </span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className="opacity-60 shrink-0"
                  />
                </ListboxButton>
                <ListboxOptions
                  modal={false}
                  className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto z-50 focus:outline-none py-1"
                >
                  {["All", ...categories].map((cat) => (
                    <ListboxOption
                      key={cat}
                      value={cat}
                      className={({ active }) =>
                        `cursor-pointer select-none py-2.5 px-4 text-sm transition-colors ${
                          active ? "bg-[var(--student-blue-soft)]" : ""
                        }`
                      }
                    >
                      {({ selected }) => (
                        <span
                          className={
                            selected
                              ? "font-semibold"
                              : "text-gray-700 dark:text-gray-300"
                          }
                          style={
                            selected
                              ? { color: "var(--student-blue)" }
                              : undefined
                          }
                        >
                          {cat === "All" ? "All Subjects" : cat}
                        </span>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("list")}
              className="p-2.5 rounded-full transition-colors"
              style={
                viewMode === "list"
                  ? { backgroundColor: "var(--student-blue)", color: "white" }
                  : undefined
              }
              aria-label="List view"
            >
              <List
                size={24}
                strokeWidth={1.5}
                className={
                  viewMode === "list"
                    ? undefined
                    : "text-gray-600 dark:text-gray-400"
                }
              />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className="p-2.5 rounded-full transition-colors"
              style={
                viewMode === "grid"
                  ? { backgroundColor: "var(--student-blue)", color: "white" }
                  : undefined
              }
              aria-label="Grid view"
            >
              <LayoutGrid
                size={24}
                strokeWidth={1.5}
                className={
                  viewMode === "grid"
                    ? undefined
                    : "text-gray-600 dark:text-gray-400"
                }
              />
            </button>
          </div>
        </div>
      </div>

      {/* Course list / empty state */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          {searchTerm ? (
            `No courses found matching "${searchTerm}"`
          ) : selectedCategory ? (
            `No courses in ${selectedCategory} yet.`
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">No courses yet!</p>
              <p className="text-sm">
                You'll see your courses here once your center assigns them to
                you.
              </p>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
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
