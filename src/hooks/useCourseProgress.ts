// hooks/useCourseProgress.ts
import { useStudentStore } from "@/stores/useStudentStore";
import { Course } from "@/types/types";

export function useCourseProgress(course: Course) {
  // ── Store
  const progress = useStudentStore(
    (s) => s.currentStudent?.courseProgress?.[course.id] ?? null,
  );

  // ── Derived
  const totalParts = (course.modules ?? []).reduce(
    (sum, mod) => sum + (mod.parts?.length ?? 0),
    0,
  );

  const completedCount = progress?.completedParts.length ?? 0;
  const percentage =
    totalParts > 0 ? Math.round((completedCount / totalParts) * 100) : 0;

  const isPartCompleted = (moduleNumber: number, partSlug: string) =>
    progress?.completedParts.includes(`${moduleNumber}:${partSlug}`) ?? false;

  // ── Return
  return {
    percentage,
    completedParts: completedCount,
    totalParts,
    lastVisitedModule: progress?.lastVisitedModule ?? 1,
    lastVisitedPart:
      progress?.lastVisitedPart ?? course.modules[0]?.parts[0]?.slug,
    isPartCompleted,
  };
}
