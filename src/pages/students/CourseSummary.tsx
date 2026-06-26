// src/pages/students/CourseSummary.tsx
import { useNextPart } from "@/hooks/useNextPart";
import { useStudentStore } from "@/stores/useStudentStore";
import { Course, CoursePart } from "@/types/types";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";

interface CourseSummaryProps {
  part?: CoursePart;
}

export default function CourseSummary({ part }: CourseSummaryProps) {
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
    part?.content || "<p>Welcome! This is the Summary section...</p>";

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
  );
}
