// hooks/useNextPart.ts
import { useParams, useNavigate } from "react-router-dom";
import { Course } from "@/types/types";

export function useNextPart(course: Course) {
  // ── Router
  const { moduleNumber, "*": partSlug } = useParams();
  const navigate = useNavigate();

  // ── Derived
  const modNum = Number(moduleNumber?.replace("module-", "")) || 1;
  const currentModule = course.modules.find((m) => m.number === modNum);
  const currentPartIndex =
    currentModule?.parts.findIndex((p) => p.slug === partSlug) ?? -1;
  const nextPart = currentModule?.parts[currentPartIndex + 1];
  const nextModule = course.modules.find((m) => m.number === modNum + 1);

  // ── Handlers
  const goToNext = () => {
    if (nextPart) {
      navigate(
        `/student/course/${course.id}/module-${modNum}/${nextPart.slug}`,
      );
    } else if (nextModule) {
      navigate(
        `/student/course/${course.id}/module-${nextModule.number}/${nextModule.parts[0].slug}`,
      );
    } else {
      navigate(`/student/courses`);
    }
  };

  // ── Return
  return {
    goToNext,
    hasNext: !!(nextPart || nextModule),
    currentPartSlug: partSlug ?? "",
    modNum,
  };
}
