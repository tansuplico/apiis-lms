// src/pages/students/CourseIntroduction.tsx
import { CoursePart, Course } from "@/types/types";
import { useOutletContext } from "react-router-dom";
import { useNextPart } from "@/hooks/useNextPart";
import { useStudentStore } from "@/stores/useStudentStore";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface CourseIntroductionProps {
  part?: CoursePart;
}

export default function CourseIntroduction({ part }: CourseIntroductionProps) {
  const { course } = useOutletContext<{ course: Course }>();
  const { goToNext, hasNext, currentPartSlug } = useNextPart(course);
  const { completePart, currentStudent } = useStudentStore();
  const [marked, setMarked] = useState(false);

  const modNum =
    Number(window.location.pathname.match(/module-(\d+)/)?.[1]) || 1;

  const alreadyCompleted =
    currentStudent?.courseProgress[course.id]?.completedParts.includes(
      currentPartSlug ?? "",
    ) ?? false;

  const htmlContent =
    part?.content || "<p>Welcome! This is the introduction section...</p>";

  const handleNext = () => {
    if (!alreadyCompleted && !marked) {
      completePart(course.id, currentPartSlug!, modNum);
      setMarked(true);
      toast.success("Part completed! Progress saved.");
    }
    goToNext();
  };

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300 
          prose-headings:text-gray-900 dark:prose-headings:text-white 
          prose-strong:font-bold prose-em:italic 
          prose-ul:list-disc prose-ul:pl-6 
          prose-ol:list-decimal prose-ol:pl-6 
          prose-li:my-1 prose-li:ml-6"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <div className="mt-10 flex items-center justify-between">
        {/* Completion badge if already done */}
        {alreadyCompleted && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle size={18} />
            <span>Completed</span>
          </div>
        )}

        <button
          onClick={handleNext}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-[#0070FF] hover:bg-[#0059CC] text-white rounded-xl font-medium transition-all duration-200 shadow-sm"
        >
          {hasNext ? (
            <>
              Next Part
              <ArrowRight size={18} />
            </>
          ) : (
            "Finish Course"
          )}
        </button>
      </div>
    </div>
  );
}
