// src/pages/students/CourseModulePart.tsx
import { useParams, useOutletContext } from "react-router-dom";
import { BookOpen, FileText, PlayCircle, CheckCircle } from "lucide-react";
import CourseIntroduction from "./CourseIntroduction";
import CourseSummary from "./CourseSummary";
import CourseQuiz from "./CourseQuiz";
import CourseActivity from "./CourseActivity";
import { Course } from "@/types/types";

export default function CourseModulePart() {
  // ── Router & Context
  const { moduleNumber, "*": partSlug } = useParams();
  const { course } = useOutletContext<{ course: Course }>();

  // ── Derived: current module & part
  const modNum = Number(moduleNumber?.replace("module-", "")) || 1;
  const currentModule = course.modules.find((m) => m.number === modNum);
  const currentPart =
    currentModule?.parts.find((p) => p.slug === partSlug) ||
    currentModule?.parts[0];

  // ── Guard: not found
  if (!currentModule || !currentPart) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Module or part not found
      </div>
    );
  }

  // ── Derived: icon based on part slug
  const Icon =
    {
      introduction: BookOpen,
      lessons: FileText,
      quiz: PlayCircle,
      activities: CheckCircle,
    }[currentPart.slug] || BookOpen;

  // ── Render
  return (
    <div className="p-6 md:p-8 lg:p-10 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen">
      {/* Main content card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="text-white px-6 py-5 flex items-center gap-4"
          style={{ backgroundColor: currentPart.coverColor }}
        >
          <Icon size={28} />
          <h1 className="text-2xl md:text-3xl font-bold">{currentPart.name}</h1>
        </div>

        <div className="p-7 prose prose-lg max-w-none text-gray-800 dark:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400">
          {partSlug === "introduction" && (
            <CourseIntroduction part={currentPart} />
          )}
          {partSlug === "lessons" && <CourseSummary part={currentPart} />}
          {partSlug === "quiz" && <CourseQuiz />}
          {partSlug === "activities" && <CourseActivity part={currentPart} />}
          {!["introduction", "lessons", "quiz", "activities"].includes(
            partSlug || "",
          ) && <CourseIntroduction part={currentPart} />}
        </div>
      </div>
    </div>
  );
}
