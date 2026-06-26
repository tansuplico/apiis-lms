// src/pages/students/CoursePreview.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStudentStore } from "@/stores/useStudentStore";
import { useCenterStore } from "@/stores/useCenterStore";

import PreviewOverview from "@/components/shared/PreviewOverview";
import PreviewContents from "@/components/shared/PreviewContents";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

export default function CoursePreview() {
  // ── Store
  const navigate = useNavigate();
  const location = useLocation();
  const passedCourse = location.state?.course;
  const { currentStudent } = useStudentStore();
  const { centers } = useCenterStore();

  const [activeTab, setActiveTab] = useState<"overview" | "content">(
    "overview",
  );

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Content" },
  ];

  // ── Derived: student center & course access
  const studentCenter = centers.find(
    (c) => c.id === currentStudent?.currentCenter,
  );

  const isCourseInCenter =
    !!studentCenter &&
    studentCenter.students.includes(currentStudent?.id ?? -1) &&
    studentCenter.courses.includes(passedCourse.id);

  const courseProgress = currentStudent?.courseProgress?.[passedCourse.id];
  const hasProgress =
    courseProgress &&
    (courseProgress.completedParts.length > 0 ||
      courseProgress.lastVisitedPart !== "introduction" ||
      courseProgress.lastVisitedModule !== 1);

  // ── Handlers: navigation
  const handleOpenCourse = () => {
    const courseSlug = passedCourse.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const startingModuleNum = passedCourse.modules?.[0]?.number || 1;

    navigate(
      `/student/course/${courseSlug}/${startingModuleNum}/introduction`,
      { state: { course: passedCourse } },
    );
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Hero Banner */}
      <div className="relative border-b border-gray-200 dark:border-gray-800 dark:bg-[#111827] overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 py-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center">
            {/* Thumbnail */}
            <div className="w-full md:w-56 lg:w-120 shrink-0">
              <img
                src={resolveThumbnailUrl(passedCourse.thumbnailUrl ?? null)}
                alt="thumbnail"
                className="w-full aspect-video object-cover rounded-xl shadow-lg"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.errored) {
                    img.dataset.errored = "1";
                    img.src = "/module-thumbnail.png";
                  }
                }}
              />
            </div>
            {/* Text content */}
            <div className="flex-1 min-w-0 space-y-3">
              <span
                style={{
                  backgroundColor: passedCourse.levelColor ?? "#2FE12F",
                }}
                className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full"
              >
                {passedCourse.level || "Difficulty"}
              </span>

              <h1
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-snug truncate"
                title={passedCourse.title}
              >
                {passedCourse.title}
              </h1>

              {passedCourse.subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {passedCourse.subtitle}
                </p>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                by{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {passedCourse.instructor}
                </span>
              </p>

              {isCourseInCenter ? (
                <button
                  onClick={handleOpenCourse}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  {hasProgress ? "Continue Course" : "Open Course"}
                </button>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <span className="text-yellow-700 dark:text-yellow-400 text-sm">
                    This course is not available in your center. Please contact
                    your facilitator.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto scrollbar-hide space-x-3 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 font-medium text-base whitespace-nowrap rounded-lg transition-all
                  border-b-2 cursor-pointer
                  ${
                    activeTab === tab.id
                      ? "border-blue-600 dark:border-blue-400 bg-[#0070FF] dark:bg-blue-700 text-white font-semibold"
                      : "border-transparent text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === "overview" && <PreviewOverview course={passedCourse} />}
        {activeTab === "content" && <PreviewContents course={passedCourse} />}
      </div>
    </div>
  );
}
