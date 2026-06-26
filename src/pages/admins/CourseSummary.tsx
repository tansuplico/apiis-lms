// src/pages/admin/CourseSummary.tsx
import { CoursePart } from "@/types/types";

interface CourseSummaryProps {
  part?: CoursePart;
}

export default function CourseSummary({ part }: CourseSummaryProps) {
  const htmlContent =
    part?.content || "<p>Welcome! This is the Summary section...</p>";

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
