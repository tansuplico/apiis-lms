// src/pages/admin/CourseIntroduction.tsx
import { CoursePart } from "@/types/types";

interface CourseIntroductionProps {
  part?: CoursePart;
}

export default function CourseIntroduction({ part }: CourseIntroductionProps) {
  const htmlContent =
    part?.content || "<p>Welcome! This is the introduction section...</p>";

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
