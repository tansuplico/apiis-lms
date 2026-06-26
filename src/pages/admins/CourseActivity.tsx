// src/pages/admin/CourseIntroduction.tsx
import { CoursePart } from "@/types/types";

interface CourseActivityProps {
  part?: CoursePart;
}

export default function CourseActivity({ part }: CourseActivityProps) {
  const htmlContent =
    part?.content || "<p>Welcome! This is the activity section...</p>";

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
