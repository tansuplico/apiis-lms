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

  // ── Derived
  const courseSlug = course.title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const thumbnailUrl = course.thumbnailUrl ?? null;
  const resolvedSrc = thumbnailUrl ?? "/module-thumbnail.png";

  // thumbnailLoading was previously a hardcoded `false` constant — the
  // pulse-placeholder JSX in every consumer (CourseGridCard, CourseListItem,
  // ViewCenterGridCard, ViewCenterListItem) branched on it correctly, but
  // the value never reflected real load state, so the placeholder never
  // showed and course.bgColor flashed through on every mount/remount.
  //
  // Initialize by checking the browser's own image cache synchronously
  // (new Image().complete is true instantly for already-cached images) so
  // a previously-seen thumbnail doesn't get a needless placeholder flash on
  // remount/navigate-back — only genuinely-uncached images show the pulse.
  const [thumbnailLoading, setThumbnailLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const probe = new Image();
    probe.src = resolvedSrc;
    return !probe.complete;
  });

  // Reset when the actual image source changes (new thumbnail uploaded, or
  // a different course swapped into this card slot) — same cache check.
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
    navigate(`${base}/courses/${courseSlug}/course-preview`, {
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
