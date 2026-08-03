// src/components/shared/InteractiveCoursePartViewer.tsx
import { useNextPart } from "@/hooks/useNextPart";
import { useStudentStore } from "@/stores/useStudentStore";
import { Course, CoursePart } from "@/types/types";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";

interface InteractiveCoursePartViewerProps {
  part?: CoursePart;
  fallbackText: string;
  // CourseIntroduction shows a "Completed" badge next to the next-part
  // button once the part is done; CourseSummary/CourseActivity don't.
  showCompletionBadge?: boolean;
}

// Student-facing rendering of a course part: shows the part's HTML content,
// tracks completion, and advances to the next part / finishes the course.
// Previously duplicated near-identically across CourseSummary, CourseActivity,
// and (with the completion badge) CourseIntroduction.
export default function InteractiveCoursePartViewer({
  part,
  fallbackText,
  showCompletionBadge = false,
}: InteractiveCoursePartViewerProps) {
  const { course } = useOutletContext<{ course: Course }>();
  const { goToNext, hasNext, currentPartSlug, modNum } = useNextPart(course);
  const { completePart, currentStudent } = useStudentStore();
  const [marked, setMarked] = useState(false);

  const alreadyCompleted =
    currentStudent?.courseProgress?.[course.id]?.completedParts.includes(
      `${modNum}:${currentPartSlug ?? ""}`,
    ) ?? false;

  const htmlContent = part?.content || `<p>${fallbackText}</p>`;

  const handleNext = () => {
    if (!alreadyCompleted && !marked) {
      completePart(course.id, currentPartSlug!, modNum);
      setMarked(true);
      toast.success("Part completed! Progress saved.");
    }
    goToNext();
  };

  const nextButton = (
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
  );

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="
          prose 
          prose-invert
          prose-lg 
          max-w-none 
          text-gray-700 dark:text-gray-300 
          prose-headings:text-gray-900 dark:prose-headings:text-white 
          prose-strong:font-bold 
          prose-em:italic 
          prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 
          prose-li:my-1 prose-li:ml-6
        "
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {showCompletionBadge ? (
        <div className="mt-10 flex items-center justify-between">
          {alreadyCompleted && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle size={18} />
              <span>Completed</span>
            </div>
          )}
          {nextButton}
        </div>
      ) : (
        nextButton
      )}
    </div>
  );
}
