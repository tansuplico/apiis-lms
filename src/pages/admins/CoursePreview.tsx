// src/pages/admins/CoursePreview.tsx
import { Edit, Save, Trash2Icon } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Course } from "@/types/types";
import { useCourseStore } from "@/stores/useCourseStore";
import { COURSE_CATEGORIES } from "@/data/courseCategories";
import { isOnline, onNetworkChange } from "@/services/networkStatus";
import PreviewContents from "@/components/shared/PreviewContents";
import PreviewOverview from "@/components/shared/PreviewOverview";
import { useRef, useState, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { tokenStorage } from "@/services/tokenStorage";
import { extractThumbnailFilename } from "@/utils/thumbnailHelper";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export default function CoursePreview() {
  // ── Routing & store
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { courses, updateCourse, deleteCourse } = useCourseStore();

  // ── Derived: resolve course from store, falling back to navigation state
  const passedCourse = location.state?.course;
  const storeCourse = courses.find(
    (c) => c.id === Number(courseId) || c.id === passedCourse?.id,
  );

  // ── Thumbnail upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── Course state (working copy + snapshot for cancel)
  const [course, setCourse] = useState(storeCourse ?? passedCourse);
  const [originalCourse, setOriginalCourse] = useState(
    storeCourse ?? passedCourse,
  );

  // ── Connectivity
  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    const unsubscribe = onNetworkChange(setOnline);
    return () => unsubscribe();
  }, []);

  // ── Effects: keep local course synced with store unless actively editing
  useEffect(() => {
    if (storeCourse) {
      if (!isEditing) {
        setCourse(storeCourse);
        setOriginalCourse(storeCourse);
      }
    }
  }, [storeCourse]);

  // ── Edit & tab state
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "content">(
    "overview",
  );

  const tabs: { id: "overview" | "content"; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "content", label: "Content" },
  ];

  // ── Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Handlers: delete
  const handleDeleteCourse = async () => {
    await deleteCourse(course.id);
    setShowDeleteModal(false);
    navigate("/admin/courses");
  };

  // ── Handlers: thumbnail upload
  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = await tokenStorage.getToken();
      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await fetch(`${BASE_URL}/thumbnails`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message ?? "Upload failed.");

      const currentFilename = extractThumbnailFilename(course.thumbnailUrl);
      const originalFilename = extractThumbnailFilename(
        originalCourse.thumbnailUrl,
      );
      if (currentFilename && currentFilename !== originalFilename) {
        fetch(`${BASE_URL}/thumbnails/${currentFilename}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => {
          // Best-effort — a failed cleanup here is just an orphaned file.
        });
      }

      updateCourseField("thumbnailUrl", json.data.url);
      toast.success("Thumbnail updated.", { position: "bottom-right" });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.", {
        position: "bottom-right",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Handlers: edit mode
  const cancelEdit = () => {
    setCourse(originalCourse);
    setIsEditing(false);
    toast.info("Changes discarded", {
      position: "bottom-right",
      autoClose: 4000,
    });
  };

  const saveChanges = async () => {
    try {
      // objects — never send them to the backend. Only send real string keys.
      const isPersistedThumbnail =
        course.thumbnailUrl &&
        typeof course.thumbnailUrl === "string" &&
        !course.thumbnailUrl.startsWith("data:") &&
        !course.thumbnailUrl.startsWith("blob:");

      const thumbnailToSave = isPersistedThumbnail
        ? course.thumbnailUrl.startsWith("http")
          ? new URL(course.thumbnailUrl).pathname // ← extract /api/thumbnails/uuid.png
          : course.thumbnailUrl
        : null;

      await updateCourse(course.id, {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        instructor: course.instructor,
        level: course.level,
        levelColor: course.levelColor,
        category: course.category,
        bgColor: course.bgColor,
        thumbnailUrl: thumbnailToSave,
      });

      setOriginalCourse(course);
      setIsEditing(false);
    } catch {
      // Error handled by store
    }
  };

  const updateCourseField = <K extends keyof Course>(
    field: K,
    value: Course[K],
  ) => {
    setCourse((prev: Course) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div>
        {!course ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
              Loading course...
            </p>
          </div>
        ) : (
          <>
            {/* Top bar: edit/save or edit/delete actions */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 px-6 py-4 flex items-center justify-end">
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-5 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={!online}
                      title={!online ? "You're offline" : undefined}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
                        online
                          ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                          : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={!online}
                      title={!online ? "You're offline" : undefined}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
                        online
                          ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Edit size={18} />
                      Edit Course
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={!online}
                      title={!online ? "You're offline" : undefined}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
                        online
                          ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                          : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Trash2Icon size={18} />
                      Delete Course
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hero banner: thumbnail + editable course details */}
            <div className="relative border-b border-gray-200 dark:border-gray-800 dark:bg-[#111827] overflow-hidden">
              <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 py-8">
                <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center">
                  {/* Thumbnail (click-to-upload while editing) */}
                  <div className="w-full md:w-56 lg:w-120 shrink-0">
                    <div
                      className={`relative group ${isEditing && online ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() =>
                        isEditing && online && fileInputRef.current?.click()
                      }
                    >
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
                          <Loader2
                            size={28}
                            className="animate-spin text-white"
                          />
                        </div>
                      )}

                      <img
                        src={resolveThumbnailUrl(course.thumbnailUrl)}
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

                      {isEditing && online && !uploading && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <div className="flex items-center gap-2 text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">
                            <Upload size={14} />
                            Change thumbnail
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                  </div>
                  {/* Text content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Level badge */}
                    {isEditing ? (
                      <div className="flex items-center gap-3">
                        <select
                          value={course.level ?? "Easy"}
                          onChange={(e) => {
                            const newLevel = e.target.value;
                            updateCourseField("level", newLevel);
                            const colors: Record<string, string> = {
                              easy: "#2FE12F",
                              moderate: "#F59E0B",
                              hard: "#EF4444",
                              "all levels": "#8B5CF6",
                            };
                            updateCourseField(
                              "levelColor",
                              colors[newLevel.toLowerCase()] ?? "#6B7280",
                            );
                          }}
                          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-xs font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Hard">Hard</option>
                          <option value="All Levels">All Levels</option>
                        </select>
                        <span
                          style={{ backgroundColor: course.levelColor }}
                          className="px-3 py-1 text-xs font-semibold text-white rounded-full"
                        >
                          {course.level || "Difficulty"}
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          backgroundColor: course.levelColor ?? "#2FE12F",
                        }}
                        className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full"
                      >
                        {course.level || "Difficulty"}
                      </span>
                    )}

                    {/* Category */}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={course.category ?? "Personal Development"}
                          onChange={(e) =>
                            updateCourseField("category", e.target.value)
                          }
                          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-white cursor-pointer"
                        >
                          {COURSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.category ?? "—"}
                        </span>
                      </p>
                    )}

                    {/* Title */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={course.title}
                        onChange={(e) =>
                          updateCourseField("title", e.target.value)
                        }
                        className="text-2xl md:text-3xl font-bold bg-transparent border-b border-gray-400 dark:border-gray-600 focus:outline-none focus:border-blue-500 w-full text-gray-900 dark:text-white"
                        maxLength={60}
                        placeholder="Course title"
                      />
                    ) : (
                      <h1
                        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-snug truncate"
                        title={course.title}
                      >
                        {course.title}
                      </h1>
                    )}

                    {/* Subtitle */}
                    {isEditing ? (
                      <textarea
                        value={course.subtitle ?? ""}
                        onChange={(e) =>
                          updateCourseField("subtitle", e.target.value)
                        }
                        className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                        placeholder="Course subtitle"
                        rows={2}
                        maxLength={120}
                      />
                    ) : (
                      course.subtitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {course.subtitle}
                        </p>
                      )
                    )}

                    {/* Instructor */}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          by
                        </span>
                        <input
                          type="text"
                          value={course.instructor ?? ""}
                          onChange={(e) =>
                            updateCourseField("instructor", e.target.value)
                          }
                          className="text-sm font-medium bg-transparent border-b border-gray-400 dark:border-gray-600 focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white w-full"
                          placeholder="Instructor name"
                          maxLength={60}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        by{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.instructor}
                        </span>
                      </p>
                    )}

                    {/* Open Course CTA */}
                    <button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 px-4 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        const courseSlug = passedCourse.title
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "");
                        const startingModuleNum =
                          passedCourse.modules?.[0]?.number || 1;
                        navigate(
                          `/admin/course/${courseSlug}/${startingModuleNum}/introduction`,
                          { state: { course: passedCourse } },
                        );
                      }}
                    >
                      Open Course
                    </button>
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
                      className={`px-6 py-3 font-medium text-base whitespace-nowrap rounded-lg border-b-2 cursor-pointer ${
                        activeTab === tab.id
                          ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold"
                          : "border-transparent text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              {activeTab === "overview" && (
                <PreviewOverview
                  course={course}
                  isEditing={isEditing}
                  updateCourseField={updateCourseField}
                />
              )}
              {activeTab === "content" && (
                <PreviewContents
                  course={course}
                  isEditing={isEditing}
                  updateCourseField={updateCourseField}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete Course?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Are you sure you want to delete <strong>{course.title}</strong>?
              This will permanently delete all modules, parts, and student
              progress. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteCourse}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
