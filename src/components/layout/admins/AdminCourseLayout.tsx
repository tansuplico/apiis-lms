// src/components/layout/admin/AdminCourseLayout.tsx
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  X,
  Upload,
  XIcon,
  Video,
  Scale,
  FileUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCourseStore } from "@/stores/useCourseStore";
import { useSubmissionStore } from "@/stores/useSubmissionStore";
import { toast } from "react-toastify";
import { FileText, FileDown } from "lucide-react";
import DeleteConfirmationModal from "@/components/admins/courses/DeleteConfirmationModal";
import WeightModal from "@/components/admins/courses/WeightModal";
import VideoPreviewModal from "@/components/admins/courses/VideoPreviewModal";
import AddPartModal from "@/components/admins/courses/AddPartModal";
import { fileService } from "@/services/fileService";
import { submissionService } from "@/services/submissionService";
import { isOnline } from "@/services/networkStatus";

export default function AdminCourseLayout() {
  // ── Store
  const navigate = useNavigate();
  const { courseSlug, moduleNumber, partSlug } = useParams();
  const currentModuleNum = Number(moduleNumber?.replace("module-", "")) || 1;

  const {
    courses,
    addModule: storeAddModule,
    deleteModule: storeDeleteModule,
    addPart: storeAddPart,
    deletePart: storeDeletePart,
    updateModule: storeUpdateModule,
    uploadVideo: storeUploadVideo,
    deleteVideo: storeDeleteVideo,
    uploadFile: storeUploadFile,
    deleteFile: storeDeleteFile,
  } = useCourseStore();

  const {
    settingsByModule,
    submissionsByModule,
    fetchSettings: fetchSubmissionSettings,
    updateSettings: updateSubmissionSettings,
    fetchModuleSubmissions,
    deleteSubmission: storeDeleteSubmission,
  } = useSubmissionStore();

  // ── State: UI
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [addPartModuleIndex, setAddPartModuleIndex] = useState<number | null>(
    null,
  );
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(
    currentModuleNum,
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // ── State: delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "module" | "part";
    moduleId?: number;
    moduleIndex?: number;
    partId?: number;
    partSlug?: string;
  } | null>(null);

  // ── State: editing module title
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  // ── State: video upload
  const [uploadingModuleId, setUploadingModuleId] = useState<number | null>(
    null,
  );
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewVideo, setPreviewVideo] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // ── State: file upload
  const [uploadingFileModuleId, setUploadingFileModuleId] = useState<
    number | null
  >(null);
  const [uploadFileTitle, setUploadFileTitle] = useState("");
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileDocInputRef = useRef<HTMLInputElement>(null);

  // ── State: file download
  const downloadingRef = useRef<Set<number>>(new Set());
  const [downloadingFileIds, setDownloadingFileIds] = useState<Set<number>>(
    new Set(),
  );

  // ── State: submission download
  const downloadingSubmissionRef = useRef<Set<number>>(new Set());
  const [downloadingSubmissionIds, setDownloadingSubmissionIds] = useState<
    Set<number>
  >(new Set());

  // ── Constants
  const PREDEFINED_PARTS = [
    { slug: "lessons", name: "Lessons", color: "#8A2BE2" },
    { slug: "activities", name: "Activities", color: "#FE5A1D" },
  ] as const;

  // ── Derived: current course
  const course =
    courses.find(
      (c) =>
        c.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") === courseSlug,
    ) ?? courses[0];

  // ── Effects: lazy-load submission settings + list when a module is expanded
  useEffect(() => {
    if (!course || expandedModule === null) return;
    const mod = course.modules.find((m) => m.number === expandedModule);
    if (!mod) return;
    fetchSubmissionSettings(mod.id);
    fetchModuleSubmissions(mod.id);
  }, [expandedModule, course]);

  // ── Guard: course not found
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Course not found.
      </div>
    );
  }

  // ── Handlers: module / part creation
  const addModule = async () => {
    if (!isEditMode) return;
    try {
      await storeAddModule(course.id);
    } catch {}
  };

  const addPart = async (type: "lessons" | "activities") => {
    if (addPartModuleIndex === null) return;
    const module = course.modules[addPartModuleIndex];
    if (!module) return;

    const predefined = PREDEFINED_PARTS.find((p) => p.slug === type)!;
    const existingCount = module.parts.filter((p) =>
      p.slug.startsWith(type),
    ).length;

    if (existingCount >= 2) return;

    const slug = existingCount === 0 ? type : `${type}-2`;

    try {
      await storeAddPart(course.id, module.id, {
        slug,
        name: existingCount === 0 ? predefined.name : `${predefined.name} 2`,
        coverColor: predefined.color,
        content: "",
      });
      setShowAddPartModal(false);
      setAddPartModuleIndex(null);
    } catch {}
  };

  // ── Handlers: delete module / part
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !course) return;

    try {
      if (
        deleteTarget.type === "module" &&
        deleteTarget.moduleId !== undefined
      ) {
        await storeDeleteModule(course.id, deleteTarget.moduleId);

        const remainingModules = course.modules.filter(
          (m) => m.id !== deleteTarget.moduleId,
        );
        const safeModuleNum = Math.max(
          1,
          Math.min(currentModuleNum, remainingModules.length),
        );
        const firstPartSlug =
          remainingModules[safeModuleNum - 1]?.parts[0]?.slug || "introduction";

        setTimeout(() => {
          navigate(
            `/admin/course/${courseSlug}/module-${safeModuleNum}/${firstPartSlug}`,
          );
        }, 100);
      } else if (
        deleteTarget.type === "part" &&
        deleteTarget.moduleId !== undefined &&
        deleteTarget.partId !== undefined
      ) {
        await storeDeletePart(
          course.id,
          deleteTarget.moduleId,
          deleteTarget.partId,
        );
      }
    } catch {
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // ── Handlers: weight saving
  const saveWeights = async (weights: Record<number, string>) => {
    const explicitEntries = course.modules.filter(
      (mod) => weights[mod.number]?.trim() !== "",
    );
    const blankEntries = course.modules.filter(
      (mod) => weights[mod.number]?.trim() === "",
    );

    const explicitValues = explicitEntries.map((mod) =>
      parseFloat(weights[mod.number]),
    );
    const explicitSum = explicitValues.reduce((a, b) => a + b, 0);

    const remaining = 100 - explicitSum;
    const equalShare =
      blankEntries.length > 0
        ? parseFloat((remaining / blankEntries.length).toFixed(2))
        : 0;

    for (const mod of course.modules) {
      const isBlank = weights[mod.number]?.trim() === "";
      const weight = isBlank ? equalShare : parseFloat(weights[mod.number]);
      await storeUpdateModule(course.id, mod.id, { weight });
    }

    toast.success("Module weights saved.", { position: "bottom-right" });
  };

  // ── Handlers: video upload
  const handleVideoUpload = async () => {
    if (!uploadFile || !uploadTitle.trim() || uploadingModuleId === null)
      return;
    const module = course.modules.find((m) => m.id === uploadingModuleId);
    if (!module) return;

    setIsUploading(true);
    try {
      await storeUploadVideo(
        course.id,
        uploadingModuleId,
        uploadFile,
        uploadTitle.trim(),
      );
      setUploadTitle("");
      setUploadFile(null);
      setUploadingModuleId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
    } finally {
      setIsUploading(false);
    }
  };

  // ── Handlers: file upload
  const handleFileUpload = async () => {
    if (
      !uploadFileObj ||
      !uploadFileTitle.trim() ||
      uploadingFileModuleId === null
    )
      return;

    setIsUploadingFile(true);
    try {
      await storeUploadFile(
        course.id,
        uploadingFileModuleId,
        uploadFileObj,
        uploadFileTitle.trim(),
      );
      setUploadFileTitle("");
      setUploadFileObj(null);
      setUploadingFileModuleId(null);
      if (fileDocInputRef.current) fileDocInputRef.current.value = "";
    } catch {
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ── Handlers: file download
  const handleFileDownload = async (
    fileId: number,
    originalFilename: string,
  ) => {
    if (downloadingRef.current.has(fileId)) return;

    downloadingRef.current.add(fileId);
    setDownloadingFileIds(new Set(downloadingRef.current));

    try {
      await fileService.download(fileId, originalFilename);
    } catch {
      toast.error("Failed to download file.", { position: "bottom-right" });
    } finally {
      downloadingRef.current.delete(fileId);
      setDownloadingFileIds(new Set(downloadingRef.current));
    }
  };

  // ── Handlers: submission download
  const handleSubmissionDownload = async (
    submissionId: number,
    originalFilename: string,
  ) => {
    if (downloadingSubmissionRef.current.has(submissionId)) return;

    downloadingSubmissionRef.current.add(submissionId);
    setDownloadingSubmissionIds(new Set(downloadingSubmissionRef.current));

    try {
      await submissionService.download(submissionId, originalFilename);
    } catch {
      toast.error("Failed to download submission.", {
        position: "bottom-right",
      });
    } finally {
      downloadingSubmissionRef.current.delete(submissionId);
      setDownloadingSubmissionIds(new Set(downloadingSubmissionRef.current));
    }
  };

  // ── Handlers: submission delete
  const handleSubmissionDelete = async (
    moduleId: number,
    submissionId: number,
  ) => {
    try {
      await storeDeleteSubmission(moduleId, submissionId);
    } catch {}
  };

  // ── Render
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden bg-white dark:bg-gray-950">
        <Outlet context={{ course, isEditMode }} />
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block lg:w-80 xl:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 scrollbar-thin scrollbar-thumb-gray overflow-y-auto sticky top-0 h-screen p-6">
        {/* Sidebar header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Course Modules
          </h2>
          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer"
            >
              <Pencil size={14} />
              Edit Course
            </button>
          ) : (
            <button
              onClick={() => setIsEditMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-all cursor-pointer"
            >
              <X size={14} />
              Done
            </button>
          )}
        </div>

        <div className="space-y-4">
          {course.modules.map((mod, modIdx) => {
            const isExpanded = expandedModule === mod.number;
            const submissionSettings = settingsByModule[mod.id] ?? {
              isActive: false,
              maxFiles: 1,
            };
            const submissions = submissionsByModule[mod.id] ?? [];

            return (
              <div key={mod.number}>
                <div
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
                    mod.number === currentModuleNum
                      ? "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-600 dark:border-blue-500 font-medium text-gray-900 dark:text-white"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() =>
                    setExpandedModule(isExpanded ? null : mod.number)
                  }
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium shrink-0">
                      {mod.number}
                    </div>
                    <div
                      className="flex-1 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditMode && editingModuleId === mod.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingModuleTitle}
                          onChange={(e) =>
                            setEditingModuleTitle(e.target.value)
                          }
                          onBlur={async () => {
                            if (editingModuleTitle.trim()) {
                              await storeUpdateModule(course.id, mod.id, {
                                title: editingModuleTitle.trim(),
                              });
                            }
                            setEditingModuleId(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingModuleId(null);
                            }
                          }}
                          className="w-full text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded px-2 py-0.5 focus:outline-none text-gray-900 dark:text-white"
                          maxLength={60}
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!isEditMode) return;
                            setEditingModuleId(mod.id);
                            setEditingModuleTitle(mod.title);
                          }}
                          className={`flex items-center gap-1.5 ${isEditMode ? "cursor-text group/title" : ""}`}
                        >
                          <span
                            className={`truncate max-w-36 block text-md ${
                              isEditMode
                                ? "text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-dashed"
                                : ""
                            }`}
                            title={mod.title}
                          >
                            {mod.title}
                          </span>
                          {isEditMode && (
                            <Pencil
                              size={11}
                              className="shrink-0 text-blue-500 dark:text-blue-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
                            />
                          )}
                        </div>
                      )}
                      {mod.weight != null && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {parseFloat(String(mod.weight)).toFixed(1)}% weight
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      size={18}
                      className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
                    />
                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            type: "module",
                            moduleId: mod.id,
                            moduleIndex: modIdx,
                          });
                          setShowDeleteModal(true);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`ml-11 mt-0 overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-250 opacity-100 py-2"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-1.5">
                    {mod.parts.map((part) => (
                      <div
                        key={part.slug}
                        className="flex items-center justify-between py-2 px-3 rounded-md text-sm transition-colors"
                      >
                        <Link
                          to={`/admin/course/${courseSlug}/module-${mod.number}/${part.slug}`}
                          className={`flex-1 truncate ${
                            part.slug === partSlug
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                          title={part.name}
                        >
                          {part.name}
                        </Link>
                      </div>
                    ))}
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => {
                        setAddPartModuleIndex(modIdx);
                        setShowAddPartModal(true);
                      }}
                      className="w-full py-2 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={16} />
                      Add New Part
                    </button>
                  )}

                  {/* Videos section */}
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Video size={12} />
                      Videos
                    </p>
                    {(mod.videos ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-2">
                        No videos yet.
                      </p>
                    ) : (
                      <div className="space-y-1 mb-2">
                        {(mod.videos ?? [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((video) => (
                            <div
                              key={video.id}
                              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-gray-50 dark:bg-gray-800"
                            >
                              <button
                                onClick={() =>
                                  setPreviewVideo({
                                    id: video.id,
                                    title: video.title,
                                  })
                                }
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 text-left cursor-pointer"
                                title={`Watch: ${video.title}`}
                              >
                                {video.title}
                              </button>
                              {isEditMode && (
                                <button
                                  onClick={() =>
                                    storeDeleteVideo(
                                      course.id,
                                      mod.id,
                                      video.id,
                                    )
                                  }
                                  className="shrink-0 text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Delete video"
                                >
                                  <XIcon size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    {isEditMode && (
                      <>
                        {uploadingModuleId === mod.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Video title"
                              value={uploadTitle}
                              onChange={(e) => setUploadTitle(e.target.value)}
                              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/mp4"
                              onChange={(e) =>
                                setUploadFile(e.target.files?.[0] ?? null)
                              }
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className={`w-full py-1.5 px-2 text-xs rounded border-2 border-dashed flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                uploadFile
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              }`}
                            >
                              <Video size={12} />
                              {uploadFile ? uploadFile.name : "Choose MP4 file"}
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={handleVideoUpload}
                                disabled={
                                  isUploading ||
                                  !uploadFile ||
                                  !uploadTitle.trim()
                                }
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded font-medium cursor-pointer"
                              >
                                {isUploading ? "Uploading..." : "Upload"}
                              </button>
                              <button
                                onClick={() => {
                                  setUploadingModuleId(null);
                                  setUploadTitle("");
                                  setUploadFile(null);
                                }}
                                disabled={isUploading}
                                className="flex-1 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs rounded font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadingModuleId(mod.id);
                              setUploadTitle("");
                              setUploadFile(null);
                            }}
                            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Upload size={16} />
                            Upload Video
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Files section */}
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FileText size={12} />
                      Files
                    </p>
                    {(mod.files ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-2">
                        No files yet.
                      </p>
                    ) : (
                      <div className="space-y-1 mb-2">
                        {(mod.files ?? [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-gray-50 dark:bg-gray-800"
                            >
                              <button
                                onClick={() =>
                                  !downloadingFileIds.has(file.id) &&
                                  isOnline() &&
                                  handleFileDownload(
                                    file.id,
                                    file.originalFilename,
                                  )
                                }
                                disabled={
                                  downloadingFileIds.has(file.id) || !isOnline()
                                }
                                className={`text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 text-left ${
                                  downloadingFileIds.has(file.id) || !isOnline()
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                                title={
                                  !isOnline()
                                    ? "Files require an internet connection"
                                    : `Download: ${file.title}`
                                }
                              >
                                {file.title}
                              </button>
                              {isEditMode && (
                                <button
                                  onClick={() =>
                                    storeDeleteFile(course.id, mod.id, file.id)
                                  }
                                  className="shrink-0 text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Delete file"
                                >
                                  <XIcon size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    {isEditMode && (
                      <>
                        {uploadingFileModuleId === mod.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="File title"
                              value={uploadFileTitle}
                              onChange={(e) =>
                                setUploadFileTitle(e.target.value)
                              }
                              className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              ref={fileDocInputRef}
                              type="file"
                              accept=".pdf,.docx,.pptx"
                              onChange={(e) =>
                                setUploadFileObj(e.target.files?.[0] ?? null)
                              }
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileDocInputRef.current?.click()}
                              className={`w-full py-1.5 px-2 text-xs rounded border-2 border-dashed flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                uploadFileObj
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              }`}
                            >
                              <FileText size={12} />
                              {uploadFileObj
                                ? uploadFileObj.name
                                : "Choose PDF / DOCX / PPTX"}
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={handleFileUpload}
                                disabled={
                                  isUploadingFile ||
                                  !uploadFileObj ||
                                  !uploadFileTitle.trim()
                                }
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded font-medium cursor-pointer"
                              >
                                {isUploadingFile ? "Uploading..." : "Upload"}
                              </button>
                              <button
                                onClick={() => {
                                  setUploadingFileModuleId(null);
                                  setUploadFileTitle("");
                                  setUploadFileObj(null);
                                }}
                                disabled={isUploadingFile}
                                className="flex-1 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs rounded font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadingFileModuleId(mod.id);
                              setUploadFileTitle("");
                              setUploadFileObj(null);
                            }}
                            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <FileDown size={16} />
                            Upload File
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Submissions section */}
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FileUp size={12} />
                      Student Submissions
                    </p>

                    {isEditMode ? (
                      <div className="flex items-center justify-between gap-2 mb-2 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={submissionSettings.isActive}
                            onChange={(e) =>
                              updateSubmissionSettings(
                                mod.id,
                                e.target.checked,
                                submissionSettings.maxFiles,
                              )
                            }
                            className="cursor-pointer"
                          />
                          Active
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Max:
                          </span>
                          <input
                            key={`${mod.id}-${submissionSettings.maxFiles}`}
                            type="number"
                            min={1}
                            max={20}
                            defaultValue={submissionSettings.maxFiles}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (
                                !isNaN(val) &&
                                val >= 1 &&
                                val <= 20 &&
                                val !== submissionSettings.maxFiles
                              ) {
                                updateSubmissionSettings(
                                  mod.id,
                                  submissionSettings.isActive,
                                  val,
                                );
                              }
                            }}
                            className="w-12 text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {submissionSettings.isActive
                          ? `Active · up to ${submissionSettings.maxFiles} file${submissionSettings.maxFiles > 1 ? "s" : ""} per student`
                          : "Inactive"}
                      </p>
                    )}

                    {submissions.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-2">
                        No submissions yet.
                      </p>
                    ) : (
                      <div className="space-y-1 mb-2">
                        {submissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-gray-50 dark:bg-gray-800"
                          >
                            <button
                              onClick={() =>
                                !downloadingSubmissionIds.has(sub.id) &&
                                isOnline() &&
                                handleSubmissionDownload(
                                  sub.id,
                                  sub.originalFilename,
                                )
                              }
                              disabled={
                                downloadingSubmissionIds.has(sub.id) ||
                                !isOnline()
                              }
                              className={`text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 text-left ${
                                downloadingSubmissionIds.has(sub.id) ||
                                !isOnline()
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                              title={
                                !isOnline()
                                  ? "Files require an internet connection"
                                  : `${sub.studentName} — Download: ${sub.originalFilename}`
                              }
                            >
                              {sub.studentName}
                            </button>
                            {isEditMode && (
                              <button
                                onClick={() =>
                                  handleSubmissionDelete(mod.id, sub.id)
                                }
                                className="shrink-0 text-red-500 hover:text-red-700 cursor-pointer"
                                title="Delete submission"
                              >
                                <XIcon size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isEditMode && (
          <div className="mt-6 space-y-3">
            <button
              onClick={addModule}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              Add New Module
            </button>
            <button
              onClick={() => setShowWeightModal(true)}
              className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Scale size={18} />
              Set Module Weights
            </button>
          </div>
        )}
      </aside>

      {/* Weight Distribution Modal */}
      <WeightModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        modules={course.modules.map((m) => ({
          id: m.id,
          number: m.number,
          title: m.title,
          weight: m.weight,
        }))}
        onSave={saveWeights}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTarget?.type === "module" ? "Delete Module?" : "Delete Part?"
        }
        message={
          deleteTarget?.type === "module"
            ? "This will permanently delete the module and all its parts. This action cannot be undone."
            : "This will permanently delete the selected part. This action cannot be undone."
        }
      />

      {/* Add Part Modal */}
      {showAddPartModal && addPartModuleIndex !== null && (
        <AddPartModal
          isOpen={showAddPartModal && addPartModuleIndex !== null}
          onClose={() => {
            setShowAddPartModal(false);
            setAddPartModuleIndex(null);
          }}
          partOptions={PREDEFINED_PARTS}
          moduleParts={course.modules[addPartModuleIndex ?? 0]?.parts ?? []}
          onAddPart={addPart}
        />
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
}
