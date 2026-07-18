// src/components/shared/CenterGradebookOverview.tsx
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  BookOpen,
} from "lucide-react";
import { Course, CenterGradebookState } from "@/types/types";
import { studentService } from "@/services/studentService";
import { isOnline } from "@/services/networkStatus";

interface CenterGradebookOverviewProps {
  centerId: number;
  courses: Course[];
}

const MODULES_PER_PAGE = 10;

export default function CenterGradebookOverview({
  centerId,
  courses,
}: CenterGradebookOverviewProps) {
  // ── State
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courses[0]?.id ?? null,
  );
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [gradebook, setGradebook] = useState<CenterGradebookState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modulePage, setModulePage] = useState(0);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // ── Effects: default to the first course once the list loads
  useEffect(() => {
    if (selectedCourseId === null && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // ── Effects: fetch the class-wide gradebook whenever the course changes
  useEffect(() => {
    if (selectedCourseId === null) return;

    // This view isn't cached for offline use — a class-wide gradebook is a
    // heavier, admin/facilitator-only report, unlike the per-student progress
    // data students need offline. Same reasoning as GradebookView's cache,
    // just not extended here since nothing calls this without a connection.
    if (!isOnline()) {
      setGradebook(null);
      setLoadError("offline");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setModulePage(0);
      try {
        const data = await studentService.getCenterGradebook(
          centerId,
          selectedCourseId,
        );
        setGradebook(data);
      } catch {
        setGradebook(null);
        setLoadError("failed");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [centerId, selectedCourseId]);

  // ── Derived: current chunk of modules shown as columns, plus paging info
  const totalModules = gradebook?.modules.length ?? 0;
  const totalModulePages = Math.max(
    1,
    Math.ceil(totalModules / MODULES_PER_PAGE),
  );
  const pageStart = modulePage * MODULES_PER_PAGE;
  const pageEnd = Math.min(pageStart + MODULES_PER_PAGE, totalModules);
  const pagedModuleNumbers = new Set(
    (gradebook?.modules ?? [])
      .slice(pageStart, pageEnd)
      .map((m) => m.moduleNumber),
  );

  // ── Guard: no courses assigned to this center
  if (courses.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
        <BookOpen size={40} className="opacity-30" />
        No courses assigned to this center yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: title + course selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Gradebook
        </h2>

        <div className="relative">
          <button
            onClick={() => setIsCourseDropdownOpen((open) => !open)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 min-w-55"
          >
            <BookOpen
              size={16}
              className="text-gray-500 dark:text-gray-400 shrink-0"
            />
            <span className="flex-1 text-left truncate">
              {selectedCourse?.title ?? "Select a course"}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${
                isCourseDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isCourseDropdownOpen && (
            <div className="absolute right-0 mt-2 w-full min-w-55 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setIsCourseDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                >
                  {course.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
          Loading gradebook...
        </div>
      ) : loadError === "offline" ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
          <WifiOff size={40} className="opacity-30" />
          The gradebook requires an internet connection to load.
        </div>
      ) : loadError === "failed" || !gradebook ? (
        <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
          Failed to load the gradebook.
        </div>
      ) : gradebook.students.length === 0 ? (
        <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
          No students in this center yet.
        </div>
      ) : (
        <div className="space-y-3">
          {totalModules > MODULES_PER_PAGE && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModulePage((p) => Math.max(0, p - 1))}
                  disabled={modulePage === 0}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Modules {pageStart + 1}–{pageEnd} of {totalModules}
                </span>
                <button
                  onClick={() =>
                    setModulePage((p) => Math.min(totalModulePages - 1, p + 1))
                  }
                  disabled={modulePage >= totalModulePages - 1}
                  className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                Jump to:
                <select
                  value={modulePage}
                  onChange={(e) => setModulePage(Number(e.target.value))}
                  className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {Array.from({ length: totalModulePages }, (_, i) => {
                    const start = i * MODULES_PER_PAGE + 1;
                    const end = Math.min(
                      (i + 1) * MODULES_PER_PAGE,
                      totalModules,
                    );
                    return (
                      <option key={i} value={i}>
                        Modules {start}–{end}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span>Q# = quiz score</span>
            <span>·</span>
            <span>X = not attempted</span>
            <span>·</span>
            <span>— = no quiz</span>
            <span>·</span>
            <span>hover a column for its weight</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 min-w-50">
                    Student
                  </th>
                  {gradebook.modules
                    .filter((mod) => pagedModuleNumbers.has(mod.moduleNumber))
                    .map((mod) => (
                      <th
                        key={mod.moduleNumber}
                        title={`Module ${mod.moduleNumber} Quiz — Weight: ${
                          mod.moduleWeight !== null
                            ? `${mod.moduleWeight}%`
                            : "even split"
                        }`}
                        className="px-2 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-14"
                      >
                        Q{mod.moduleNumber}
                      </th>
                    ))}
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-28 sticky right-28 z-10 bg-gray-50 dark:bg-gray-700/50 border-l border-gray-200 dark:border-gray-700">
                    Overall
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-28 sticky right-0 z-10 bg-gray-50 dark:bg-gray-700/50">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {gradebook.students.map((student) => (
                  <tr
                    key={student.studentId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-gray-800">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {student.idNumber}
                      </p>
                    </td>

                    {student.modules
                      .filter((mod) => pagedModuleNumbers.has(mod.moduleNumber))
                      .map((mod) => (
                        <td
                          key={mod.moduleNumber}
                          className="px-2 py-4 text-center w-14"
                        >
                          {!mod.hasQuiz ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : mod.attempted ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {mod.score}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">X</span>
                          )}
                        </td>
                      ))}

                    <td className="px-4 py-4 text-center w-28 sticky right-28 z-10 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                      <span
                        className={`font-semibold text-sm ${
                          student.overallPassed
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {student.overallScore}%
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center w-28 sticky right-0 z-10 bg-white dark:bg-gray-800">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          student.overallPassed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {student.overallPassed ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
