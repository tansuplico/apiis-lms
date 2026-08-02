// src/components/shared/CoursePartViewer.tsx
import { CoursePart } from "@/types/types";

interface CoursePartViewerProps {
  part?: CoursePart;
  fallbackText: string;
}

export default function CoursePartViewer({
  part,
  fallbackText,
}: CoursePartViewerProps) {
  const htmlContent = part?.content || `<p>${fallbackText}</p>`;

  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
