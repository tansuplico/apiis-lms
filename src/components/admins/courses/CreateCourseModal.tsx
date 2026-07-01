// src/components/admins/courses/CreateCourseModal.tsx
import React, { useState, useRef } from "react";
import { X, Upload, Loader2, ImageOff } from "lucide-react";
import { useCourseStore } from "@/stores/useCourseStore";
import { toast } from "react-toastify";
import { COURSE_CATEGORIES } from "@/data/courseCategories";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { tokenStorage } from "@/services/tokenStorage";
import { extractThumbnailFilename } from "@/utils/thumbnailHelper";
import { resolveThumbnailUrl } from "@/utils/imageUtils";

interface CreateCourseModalProps {
  onClose: () => void;
}

// const BASE_URL = (import.meta.env.VITE_API_URL as string).replace("/api", "");
const BASE_URL = (import.meta.env.VITE_API_URL as string).replace(/\/api$/, "");
const getLevelColor = (level: string) => {
  switch (level) {
    case "Easy":
      return "#2FE12F";
    case "Moderate":
      return "#F59E0B";
    case "Hard":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

export default function CreateCourseModal({ onClose }: CreateCourseModalProps) {
  // ── Store
  const { addCourse } = useCourseStore();
  const online = useOnlineStatus();

  // ── State: form fields
  const [form, setForm] = useState({
    title: "",
    instructor: "",
    level: "Easy",
    description: "",
    subtitle: "",
    bgColor: "#A056FF",
    category: "Personal Development",
  });

  // ── State: thumbnail (single upload, not a library pick)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const res = await fetch(`${BASE_URL}/api/thumbnails`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message ?? "Upload failed.");

      // Admin changed their mind before submitting — delete the previous
      // upload from this same create session so it doesn't sit orphaned.
      // Nothing references it yet (no course exists), so this is safe to
      // do immediately, unlike the edit flow which sequences after a save.
      const previousFilename = extractThumbnailFilename(thumbnailUrl);
      if (previousFilename) {
        fetch(`${BASE_URL}/api/thumbnails/${previousFilename}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => {
          // Best-effort — a failed cleanup here is just an orphaned file.
        });
      }

      setThumbnailUrl(json.data.url);
      toast.success("Thumbnail uploaded!", { position: "bottom-right" });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Handlers: form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Course title is required.");
      return;
    }

    try {
      await addCourse({
        title: form.title.trim(),
        instructor: form.instructor.trim() || "TBD",
        level: form.level,
        levelColor: getLevelColor(form.level),
        subtitle: form.subtitle.trim() || "",
        thumbnailUrl: thumbnailUrl ?? "",
        bgColor: form.bgColor,
        category: form.category || "Personal Development",
        description: form.description.trim() || "No description provided.",
      });
      onClose();
    } catch {
      // error surfaced by store
    }
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] scrollbar-thin scrollbar-thumb-gray overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Create New Course
          </h2>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X size={32} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Title */}
          <div className="space-y-3">
            <label
              htmlFor="title"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              maxLength={30}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. Atomic Habits for Students"
              required
            />
          </div>

          {/* Instructor */}
          <div className="space-y-3">
            <label
              htmlFor="instructor"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Instructor
            </label>
            <input
              id="instructor"
              type="text"
              value={form.instructor}
              maxLength={30}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. Prof. Elena Vargas"
            />
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label
              htmlFor="category"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg appearance-none"
            >
              {COURSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div className="space-y-3">
            <label
              htmlFor="level"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Level
            </label>
            <select
              id="level"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg appearance-none"
            >
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Subtitle */}
          <div className="space-y-3">
            <label
              htmlFor="subtitle"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Subtitle
            </label>
            <input
              id="subtitle"
              type="text"
              value={form.subtitle}
              maxLength={100}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. Small changes, remarkable results"
            />
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label
              htmlFor="description"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              placeholder="e.g. This course is about..."
            />
          </div>

          {/* Thumbnail — single upload, no library picker */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300">
              Thumbnail
            </label>

            <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
              )}
              {thumbnailUrl ? (
                <img
                  src={resolveThumbnailUrl(thumbnailUrl)}
                  alt="Course thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/module-thumbnail.png";
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                  <ImageOff size={28} />
                  <span className="text-xs">No image selected</span>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !online}
                className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {thumbnailUrl ? "Replace image" : "Upload image"}
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              JPEG, PNG, WebP or GIF · Max 10 MB
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-5  border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={!online}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white py-4 px-8 rounded-xl font-medium text-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 shadow-md hover:shadow-lg"
            >
              Create Course
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-4 px-8 rounded-xl font-medium text-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
