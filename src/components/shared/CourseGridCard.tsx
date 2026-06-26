// src/components/shared/courses/CourseGridCard.tsx
import { BookOpen } from "lucide-react";
import { Course, Role } from "@/types/types";
import { useCourseCard } from "@/hooks/useCourseCard";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

export default function CourseGridCard({
  course,
  role,
}: {
  course: Course;
  role: Role;
}) {
  // ── Hooks & derived
  const { thumbnailUrl, thumbnailLoading, onThumbnailSettled, handleClick } =
    useCourseCard(course, role);
  const { percentage, completedParts, totalParts } = useCourseProgress(course);

  const isCompleted = percentage === 100;
  const isStarted = completedParts > 0;

  // ── Render
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl dark:hover:shadow-2xl overflow-hidden flex flex-col h-full cursor-pointer border border-gray-200 dark:border-gray-700 transition-shadow"
      onClick={handleClick}
    >
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{ backgroundColor: course.bgColor }}
      >
        <span
          className="absolute top-4 left-4 z-10 text-white text-xs px-3 py-1 rounded-sm font-medium"
          style={{ backgroundColor: course.levelColor }}
        >
          {course.level}
        </span>

        {thumbnailLoading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
        <img
          src={resolveThumbnailUrl(thumbnailUrl)}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onLoad={onThumbnailSettled}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) {
              img.dataset.errored = "1";
              img.src = "/module-thumbnail.png";
            } else {
              // Fallback image itself errored — still settled, clear the
              // placeholder rather than leaving it pulsing forever.
              onThumbnailSettled();
            }
          }}
        />
      </div>

      <div className="px-5 py-6 flex flex-col gap-3 grow">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {course.category}
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
          {course.title}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 grow">
          {course.description}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <BookOpen size={18} className="text-gray-500 dark:text-gray-400" />
          <span>{course.modules?.length || 0} Modules</span>
        </div>

        {/* Progress bar — student only */}
        {role === "student" && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {isCompleted
                  ? "Course completed!"
                  : isStarted
                    ? `${completedParts}/${totalParts} parts completed`
                    : "Not started"}
              </span>
              <span
                className={`font-semibold ${isCompleted ? "text-green-600 dark:text-green-400" : isStarted ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}
              >
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? "bg-green-500" : "bg-blue-600 dark:bg-blue-500"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
