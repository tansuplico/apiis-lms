// src/utils/courseEdits.ts
import type { Course } from "@/types/types";
import type { CoursePayload } from "@/services/courseService";

interface SaveCourseEditsArgs {
  course: Course;
  original: Course;
  updateCourse: (id: number, data: CoursePayload) => Promise<void>;
  updateModule: (
    courseId: number,
    moduleId: number,
    data: { title: string },
  ) => Promise<void>;
  // Called after every step that reached the server, with the values the
  // server now has, so Cancel never restores something already saved.
  onSaved: (snapshot: Course) => void;
}

// Only persisted thumbnail keys go to the backend: local previews
// (data:/blob:) and empty values become null, absolute URLs become their
// /api/... path.
const thumbnailForSave = (url: string | null): string | null => {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("blob:")) return null;
  return url.startsWith("http") ? new URL(url).pathname : url;
};

/**
 * Saves the course fields, then each changed module title, one request at a
 * time. Adding, deleting and weighting modules already save immediately, so
 * module titles are the only module change left here. Returns false as soon
 * as a step fails (the store has already shown the error) and saves nothing
 * after it.
 */
export async function saveCourseEdits({
  course,
  original,
  updateCourse,
  updateModule,
  onSaved,
}: SaveCourseEditsArgs): Promise<boolean> {
  try {
    await updateCourse(course.id, {
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      instructor: course.instructor,
      level: course.level,
      levelColor: course.levelColor,
      category: course.category,
      bgColor: course.bgColor,
      thumbnailUrl: thumbnailForSave(course.thumbnailUrl),
    });
    let snapshot: Course = { ...course, modules: original.modules };
    onSaved(snapshot);

    for (const mod of course.modules) {
      const before = original.modules.find((m) => m.id === mod.id);
      if (!before || before.title === mod.title) continue;

      await updateModule(course.id, mod.id, { title: mod.title });
      snapshot = {
        ...snapshot,
        modules: snapshot.modules.map((m) =>
          m.id === mod.id ? { ...m, title: mod.title } : m,
        ),
      };
      onSaved(snapshot);
    }
    return true;
  } catch {
    return false;
  }
}
