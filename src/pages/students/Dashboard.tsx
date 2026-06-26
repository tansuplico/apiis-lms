// src/pages/students/Dashboard.tsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Clock, ShoppingBag } from "lucide-react";

import { useStudentStore } from "@/stores/useStudentStore";
import CourseCard from "@/components/students/dashboard/CourseCard";
import { useCenterStore } from "@/stores/useCenterStore";
import { useCourseStore } from "@/stores/useCourseStore";

export default function Dashboard() {
  // ── Store
  const { currentStudent } = useStudentStore();
  const { centers } = useCenterStore();
  const { courses } = useCourseStore();
  const navigate = useNavigate();

  // ── Derived: greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  // ── Derived: current center & enrolled courses
  const currentCenter = centers.find(
    (c) =>
      c.id === currentStudent?.currentCenter &&
      c.students.includes(currentStudent?.id ?? -1),
  );

  const enrolledCourses = useMemo(() => {
    if (!currentCenter) return [];
    return courses.filter((c) => currentCenter.courses.includes(c.id));
  }, [courses, currentCenter]);

  const recentCourses = enrolledCourses.slice(0, 3);
  const accessoriesCount = currentStudent?.accessoriesOwned?.length ?? 0;

  // ── Handlers: navigate to course preview
  const handleClick = (course: any) => {
    const slug =
      course.slug ||
      course.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    navigate(`/student/courses/${slug}/course-preview`, { state: { course } });
  };

  // ── Guard: not logged in
  if (!currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-400">
        Please log in to view your dashboard.
      </div>
    );
  }

  // ── Render
  return (
    <div className="space-y-10 pb-10 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero Greeting */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {greeting}, {currentStudent.firstName}!
        </h1>
        <p className="text-lg md:text-xl opacity-90 mt-5">
          Today is{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen
                size={24}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enrolled Courses
              </p>
              <p className="text-2xl text-gray-900 dark:text-white">
                {enrolledCourses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <ShoppingBag
                size={24}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accessories Bought
              </p>
              <p className="text-2xl text-gray-900 dark:text-white">
                {accessoriesCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Clock
                size={24}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Assigned Center
              </p>
              <p className="text-2xl text-gray-900 dark:text-white">
                {currentCenter ? currentCenter.title : "Not Assigned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-gray-900 dark:text-white">
            Continue Learning
          </h2>
          <Link
            to="/student/courses"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            View all
          </Link>
        </div>

        {recentCourses.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No enrolled courses yet — start learning today!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={handleClick}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
