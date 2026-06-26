// src/components/shared/ProgressTab.tsx
import { useState } from "react";
import { Student, Course, CourseProgress } from "@/types/types";
import { studentService } from "@/services/studentService";
import { ChevronRight } from "lucide-react";
import GradebookView from "./GradebookView";
import { isOnline } from "@/services/networkStatus";
import { useStudentProgressCache } from "@/stores/useStudentProgressCache";
import { resolveProfilePicture } from "@/utils/imageUtils";

interface ProgressTabProps {
  centerStudents: Student[];
  courses: Course[];
}

export default function ProgressTab({
  centerStudents,
  courses,
}: ProgressTabProps) {
  // ── Store
  const { setProgress: cacheProgress, getProgress: getCachedProgress } =
    useStudentProgressCache();

  // ── State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Record<
    number,
    CourseProgress
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Handlers
  const fetchProgress = async (student: Student) => {
    setSelectedStudent(student);
    setIsLoading(true);
    try {
      if (!isOnline()) {
        const cached = getCachedProgress(student.id);
        setProgress(cached);
        return;
      }
      const data = await studentService.getProgressById(student.id);
      setProgress(data.courseProgress);
      cacheProgress(student.id, data.courseProgress);
    } catch {
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render
  if (selectedStudent && selectedCourse) {
    return (
      <GradebookView
        student={selectedStudent}
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <div className="flex gap-6 min-h-125">
      {/* Student List */}
      <div className="w-72 shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Students
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {centerStudents.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              No students in this center.
            </p>
          ) : (
            centerStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => fetchProgress(student)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left cursor-pointer ${
                  selectedStudent?.id === student.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
                    : ""
                }`}
              >
                {student.profilePicture && isOnline() ? (
                  <img
                    src={resolveProfilePicture(student.profilePicture) ?? ""}
                    alt={`${student.firstName} ${student.lastName}`}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.errored) {
                        img.dataset.errored = "1";
                        img.src = "";
                      }
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 text-sm rounded-full flex items-center justify-center text-white font-bold bg-blue-500">
                    {student.firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {student.idNumber}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="ml-auto text-gray-400 shrink-0"
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Progress Panel */}
      <div className="flex-1">
        {!selectedStudent ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a student to view their progress
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            Loading progress...
          </div>
        ) : !progress ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            No progress data found.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Student Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
              {selectedStudent.profilePicture && isOnline() ? (
                <img
                  src={
                    resolveProfilePicture(selectedStudent.profilePicture) ?? ""
                  }
                  alt="avatar"
                  className="w-14 h-14 rounded-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.errored) {
                      img.dataset.errored = "1";
                      img.src = "";
                    }
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {selectedStudent.firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                  {selectedStudent.idNumber}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Gems</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {selectedStudent.coins ?? 0}
                </p>
              </div>
            </div>

            {/* Course Progress List */}
            {courses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No courses assigned to this center.
              </p>
            ) : (
              courses.map((course) => {
                const courseProgress = progress[course.id];
                const totalParts = (course.modules ?? []).reduce(
                  (sum, mod) => sum + (mod.parts?.length ?? 0),
                  0,
                );
                const completedCount =
                  courseProgress?.completedParts?.length ?? 0;
                const percentage =
                  totalParts > 0
                    ? Math.min(
                        100,
                        Math.round((completedCount / totalParts) * 100),
                      )
                    : 0;

                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4"
                  >
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="text-xs text-blue-500 dark:text-blue-400 mt-2 cursor-pointer hover:underline"
                    >
                      View gradebook
                    </button>

                    {/* Course Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {course.title}
                      </h4>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {completedCount}/{totalParts} parts
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {percentage}% complete
                    </p>

                    {courseProgress?.lastVisitedModule && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last visited: Module {courseProgress.lastVisitedModule}{" "}
                        — {courseProgress.lastVisitedPart}
                      </p>
                    )}

                    {/* Module Breakdown */}
                    <div className="space-y-2 pt-2">
                      {(course.modules ?? []).map((mod) => {
                        const modCompleted = (
                          courseProgress?.completedParts ?? []
                        ).filter((p) => p.startsWith(`${mod.number}:`)).length;
                        const modTotal = mod.parts?.length ?? 0;
                        const modPct =
                          modTotal > 0
                            ? Math.min(
                                100,
                                Math.round((modCompleted / modTotal) * 100),
                              )
                            : 0;

                        return (
                          <div
                            key={mod.number}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">
                              Module {mod.number}
                            </span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${modPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right shrink-0">
                              {modCompleted}/{modTotal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
