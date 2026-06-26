import { Course } from "@/types/types";

interface PreviewOverviewProps {
  course: Course;
  isEditing?: boolean;
  updateCourseField?: <K extends keyof Course>(
    field: K,
    value: Course[K],
  ) => void;
}

export default function PreviewOverview({
  course,
  isEditing = false,
  updateCourseField,
}: PreviewOverviewProps) {
  return (
    <section className="space-y-10">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-7 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What you'll learn
          </h2>
        </div>

        {isEditing ? (
          <textarea
            value={course.description ?? ""}
            onChange={(e) => updateCourseField?.("description", e.target.value)}
            className="w-full p-4 border rounded-lg bg-white dark:bg-gray-800 min-h-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Course description / learning outcomes"
          />
        ) : (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {course.description || "No description available."}
          </p>
        )}
      </div>
    </section>
  );
}
