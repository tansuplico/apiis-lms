// src/components/shared/GradebookView.tsx
import { useState, useEffect } from "react";
import { Student, Course, GradebookState } from "@/types/types";
import { studentService } from "@/services/studentService";
import { isOnline } from "@/services/networkStatus";
import { useStudentProgressCache } from "@/stores/useStudentProgressCache";
import { resolveProfilePicture } from "@/utils/imageUtils";

interface GradebookViewProps {
  student: Student;
  course: Course;
  onBack: () => void;
}

export default function GradebookView({
  student,
  course,
  onBack,
}: GradebookViewProps) {
  // ── State
  const [gradebookState, setGradebookState] = useState<GradebookState | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // ── Store / cache helpers
  const { getGradebook, setGradebook } = useStudentProgressCache();

  // ── Effects
  useEffect(() => {
    const load = async () => {
      if (!isOnline()) {
        const cached = getGradebook(student.id, course.id);
        setGradebookState(cached);
        setIsLoading(false);
        return;
      }

      try {
        const data = await studentService.getGradebook(student.id, course.id);
        setGradebookState(data);
        setGradebook(student.id, course.id, data);
      } catch {
        setGradebookState(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [student.id, course.id]);

  // ── Guards
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading gradebook...
      </div>
    );
  }

  if (!gradebookState) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Failed to load gradebook.
      </div>
    );
  }

  // ── Render
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
      >
        Return to progress
      </button>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Gradebook
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Student header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {student.profilePicture && isOnline() ? (
              <img
                src={resolveProfilePicture(student.profilePicture) ?? ""}
                alt={`${student.firstName} ${student.lastName}`}
                className="w-16 h-16 rounded-full object-cover shrink-0"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.errored) {
                    img.dataset.errored = "1";
                    img.src = "";
                  }
                }}
              />
            ) : (
              <div className="w-16 h-16 text-2xl rounded-full flex items-center justify-center text-white font-bold bg-blue-500">
                {student.firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {student.idNumber}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {course.title}
            </p>
          </div>
        </div>

        {/* Overall grade banner */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Overall Score
            </p>
            <p
              className={`text-2xl font-bold ${
                gradebookState.overallPassed
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {gradebookState.overallScore}%
            </p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Points Earned
            </p>
            <p
              className={`text-2xl font-bold ${
                gradebookState.overallPassed
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {gradebookState.overallScore.toFixed(1)}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {" "}
                / 100 pts
              </span>
            </p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Status
            </p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                gradebookState.overallPassed
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {gradebookState.overallPassed ? "Passed" : "Failed"}
            </span>
          </div>
        </div>

        {/* Grade table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-[30%]">
                  Module
                </th>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 text-center dark:text-gray-400 w-[18%]">
                  Submitted
                </th>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-[12%]">
                  Score
                </th>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-[12%]">
                  Weight
                </th>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-[15%]">
                  Points Earned
                </th>
                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center w-[13%]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {gradebookState.modules.map((mod: any) => {
                const effectiveWeight = parseFloat(mod.effectiveWeight ?? 0);
                const pointsEarned =
                  mod.hasQuiz && mod.attempted
                    ? ((mod.score ?? 0) / 100) * effectiveWeight
                    : null;
                const pointsPossible = mod.hasQuiz ? effectiveWeight : null;

                return (
                  <tr
                    key={mod.moduleNumber}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Module {mod.moduleNumber}: {mod.moduleTitle}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {mod.hasQuiz
                          ? `Module ${mod.moduleNumber} Quiz`
                          : "No quiz"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-center text-gray-600 dark:text-gray-400">
                      {mod.attempted && mod.submittedAt
                        ? new Date(mod.submittedAt).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {mod.hasQuiz && mod.attempted ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {mod.correctAnswers}/{mod.totalQuestions}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            ({mod.score}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {effectiveWeight > 0
                          ? `${effectiveWeight.toFixed(1)}%`
                          : "—"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {pointsEarned !== null && pointsPossible !== null ? (
                        <span
                          className={`font-semibold text-sm ${
                            mod.passed
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {pointsEarned.toFixed(2)}
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {" "}
                            / {pointsPossible.toFixed(1)} pts
                          </span>
                        </span>
                      ) : mod.hasQuiz && !mod.attempted ? (
                        <span className="text-sm text-gray-400">
                          0 / {pointsPossible?.toFixed(1)} pts
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {mod.hasQuiz ? (
                        mod.attempted ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              mod.passed
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {mod.passed ? "Passed" : "Failed"}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Not attempted
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">
              {
                gradebookState.modules.filter(
                  (m: any) => m.hasQuiz && m.attempted,
                ).length
              }
            </span>{" "}
            of{" "}
            <span className="font-medium">
              {gradebookState.modules.filter((m: any) => m.hasQuiz).length}
            </span>{" "}
            quizzes attempted
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              Total Points:
            </span>
            <span
              className={`font-bold ${
                gradebookState.overallPassed
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {gradebookState.overallScore.toFixed(2)} / 100 pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
