// components/students/CourseCard.tsx
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { CourseCardProps } from "@/types/types";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

export default function CourseCard({ course, onClick }: CourseCardProps) {
  // ── Store
  const { percentage } = useCourseProgress(course);

  // ── Render
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col h-full cursor-pointer border border-gray-200 dark:border-gray-700"
      onClick={() => onClick(course)}
    >
      {/* Thumbnail */}
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

        <img
          src={resolveThumbnailUrl(course.thumbnailUrl ?? null)}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) {
              img.dataset.errored = "1";
              img.src = "/module-thumbnail.png";
            }
          }}
        />
      </div>

      {/* Content */}
      <div className="px-5 py-6 flex flex-col gap-3 grow">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {course.category}
        </div>
        <h4 className="text-lg font-semibold leading-tight line-clamp-2 text-gray-900 dark:text-white">
          {course.title}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 grow">
          {course.description}
        </p>
        <div className="mt-auto pt-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>{percentage}% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
