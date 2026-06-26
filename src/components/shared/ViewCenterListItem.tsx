// src/components/shared/ViewCenterListItem.tsx
import { Course } from "@/types/types";
import { Trash2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCourseCard } from "@/hooks/useCourseCard";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

interface ViewCenterListItemProps {
  course: Course;
  role: "admin" | "facilitator" | "student";
  disableNavigation?: boolean;
  onRemove?: (course: Course) => void;
  onClickCourse?: (course: Course) => void;
}

export default function ViewCenterListItem({
  course,
  role,
  disableNavigation = false,
  onRemove,
  onClickCourse,
}: ViewCenterListItemProps) {
  // ── Hooks & derived
  const online = useOnlineStatus();
  const { thumbnailUrl, thumbnailLoading, onThumbnailSettled, handleClick } =
    useCourseCard(course, role, disableNavigation);
  const { percentage } = useCourseProgress(course);

  const isStudent = role === "student";

  // ── Render
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 overflow-hidden flex items-center cursor-pointer border border-gray-200 dark:border-gray-700 relative group"
      onClick={onClickCourse ? () => onClickCourse(course) : handleClick}
    >
      {/* Thumbnail */}
      <div
        className="relative w-44 h-44 shrink-0 overflow-hidden"
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
              onThumbnailSettled();
            }
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col gap-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {course.category}
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
          {course.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {course.description}
        </p>

        {/* Progress bar — student only */}
        {isStudent && (
          <div className="pt-2">
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
        )}
      </div>

      {/* Remove button — admin/facilitator only */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(course);
          }}
          disabled={!online}
          title={!online ? "You're offline" : "Remove course from center"}
          className={`absolute top-3 right-3 p-2 rounded-lg shadow-sm text-red-600 dark:text-red-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm ${
            !online
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-red-50 dark:hover:bg-red-900/40 hover:shadow-md"
          }`}
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
