// src/pages/students/Dashboard.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Trophy, MapPin, Sparkles } from "lucide-react";

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

  // ── Hero banner color — picked once per mount, so it re-shuffles every
  // time the student navigates to the Dashboard (route change unmounts
  // this component). Add more entries here if you want more variety.
  const HERO_COLORS = [
    "var(--student-coral)",
    "var(--student-teal)",
    "var(--student-blue)",
  ];
  const [heroColor] = useState(
    () => HERO_COLORS[Math.floor(Math.random() * HERO_COLORS.length)],
  );

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

  // ── Derived: how many enrolled courses are fully completed. Mirrors the
  // percentage math in useCourseProgress — can't call that hook in a loop
  // here (rules of hooks), so it's inlined against courseProgress directly.
  const completedCoursesCount = useMemo(() => {
    if (!currentStudent) return 0;
    return enrolledCourses.filter((course) => {
      const totalParts = (course.modules ?? []).reduce(
        (sum, mod) => sum + (mod.parts?.length ?? 0),
        0,
      );
      if (totalParts === 0) return false;
      const completedParts =
        currentStudent.courseProgress?.[course.id]?.completedParts.length ?? 0;
      return completedParts >= totalParts;
    }).length;
  }, [enrolledCourses, currentStudent]);

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
      <div
        className="relative rounded-3xl overflow-hidden "
        style={{ backgroundColor: heroColor }}
      >
        <div className="px-8 pt-8 pb-12 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="opacity-90" strokeWidth={2} />
            <span className="text-sm font-semibold uppercase tracking-wide opacity-90">
              {greeting}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            Hi, {currentStudent.firstName}!
          </h1>
          <p className="text-base md:text-lg opacity-90">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {currentCenter ? ` · ${currentCenter.title}` : ""}
          </p>
        </div>

        {/* Scalloped edge — the one bold shape on this page, everything
            else stays quiet. Fill matches the page background so it
            reads as a cut edge rather than a decoration. */}
        <svg
          className="absolute bottom-0 left-0 w-full text-white dark:text-gray-950"
          style={{ height: "22px" }}
          viewBox="0 0 1200 22"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,22 L0,11 Q50,-3 100,11 T200,11 T300,11 T400,11 T500,11 T600,11 T700,11 T800,11 T900,11 T1000,11 T1100,11 T1200,11 L1200,22 Z"
          />
        </svg>
      </div>

      {/* Quick Stats — "sticker" cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 border-b-4"
          style={{ borderBottomColor: "var(--student-blue)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "var(--student-blue-soft)" }}
            >
              <BookOpen size={22} style={{ color: "var(--student-blue)" }} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                My Courses
              </p>
              <p
                className="text-2xl font-extrabold"
                style={{ color: "var(--student-ink)" }}
              >
                {enrolledCourses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 border-b-4 border-b-amber-400 dark:border-b-amber-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/30">
              <Trophy
                size={22}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Courses Completed
              </p>
              <p
                className="text-2xl font-extrabold"
                style={{ color: "var(--student-ink)" }}
              >
                {completedCoursesCount}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 border-b-4"
          style={{ borderBottomColor: "var(--student-coral)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "var(--student-coral-soft)" }}
            >
              <MapPin size={22} style={{ color: "var(--student-coral)" }} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                My Center
              </p>
              <p
                className="text-2xl font-extrabold truncate"
                style={{ color: "var(--student-ink)" }}
              >
                {currentCenter ? currentCenter.title : "Not assigned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--student-ink)" }}
          >
            Keep Learning
          </h2>
          <Link
            to="/student/courses"
            className="font-semibold flex items-center gap-1 hover:opacity-80"
            style={{ color: "var(--student-blue)" }}
          >
            View all
          </Link>
        </div>

        {recentCourses.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No courses yet — pick one and start learning!
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
