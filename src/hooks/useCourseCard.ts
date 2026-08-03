// src/hooks/useCourseCard.ts
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Course, Role } from "@/types/types";

export function useCourseCard(
  course: Course,
  role: Role,
  disableNavigation = false,
) {
  // ── Router
  const navigate = useNavigate();

  const thumbnailUrl = course.thumbnailUrl ?? null;
  const resolvedSrc = thumbnailUrl ?? "/module-thumbnail.png";

  const [thumbnailLoading, setThumbnailLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const probe = new Image();
    probe.src = resolvedSrc;
    return !probe.complete;
  });

  useEffect(() => {
    const probe = new Image();
    probe.src = resolvedSrc;
    setThumbnailLoading(!probe.complete);
  }, [resolvedSrc]);

  const onThumbnailSettled = () => setThumbnailLoading(false);

  // ── Handlers
  const handleClick = () => {
    if (disableNavigation) return;
    const base =
      role === "admin"
        ? "/admin"
        : role === "facilitator"
          ? "/facilitator"
          : "/student";
    navigate(`${base}/courses/${course.id}/course-preview`, {
      state: { course },
    });
  };

  // ── Return
  return {
    thumbnailUrl,
    thumbnailLoading,
    onThumbnailSettled,
    handleClick,
  };
}
