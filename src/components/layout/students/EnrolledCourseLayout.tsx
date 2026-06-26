// src/components/layout/EnrolledCourseLayout.tsx
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle,
  Video,
  X,
  Download,
  FileText,
  CloudOff,
  Loader2,
  Upload,
  FileUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Course, ModuleFile, ModuleVideo } from "@/types/types";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useCourseStore } from "@/stores/useCourseStore";
import { useSubmissionStore } from "@/stores/useSubmissionStore";
import { isOnline } from "@/services/networkStatus";
import { useVideoStream } from "@/hooks/useVideoStream";
import { toast } from "react-toastify";
import { fileService } from "@/services/fileService";
import { submissionService } from "@/services/submissionService";

// ── Helper: determine file type from MIME
function getFileType(mimeType: string): "pdf" | "docx" | "pptx" | "other" {
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "pptx";
  return "other";
}

// ── Helper: emoji icon based on file type
function getFileIcon(mimeType: string): string {
  const type = getFileType(mimeType);
  if (type === "pdf") return "📄";
  if (type === "docx") return "📝";
  if (type === "pptx") return "📊";
  return "📎";
}

// ── Sub‑component: file preview modal
function FilePreviewModal({
  file,
  onClose,
}: {
  file: ModuleFile;
  onClose: () => void;
}) {
  const fileType = getFileType(file.mimeType);
  const downloadUrl = `/api/files/${file.id}/download`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full overflow-hidden ${
          fileType === "pdf" ? "max-w-4xl" : "max-w-md"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText
              size={18}
              className="text-blue-600 dark:text-blue-400 shrink-0"
            />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-xs">
              {file.title}
            </h3>
            <span className="text-xs uppercase font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
              {fileType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer shrink-0 ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {fileType === "pdf" ? (
          <div className="w-full" style={{ height: "70vh" }}>
            <iframe
              src={downloadUrl}
              className="w-full h-full border-0"
              title={file.title}
            />
          </div>
        ) : (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl">{getFileIcon(file.mimeType)}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {file.originalFilename}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {fileType === "docx"
                  ? "Word Document"
                  : "PowerPoint Presentation"}{" "}
                cannot be previewed in-app
              </p>
            </div>

            <a
              href={downloadUrl}
              download={file.originalFilename}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download size={16} />
              Download to View
            </a>
          </div>
        )}

        {/* Footer */}
        {fileType === "pdf" && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <a
              href={downloadUrl}
              download={file.originalFilename}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Download size={14} />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EnrolledCourseLayout() {
  // ── Router & Store
  const { courseId, moduleNumber, partSlug } = useParams();
  const location = useLocation();
  const { courses, isLoading } = useCourseStore();
  const { mySubmissionsByModule, fetchMySubmissions, uploadSubmission } =
    useSubmissionStore();

  // ── State
  const currentModuleNum = Number(moduleNumber?.replace("module-", "")) || 1;
  const [expandedModule, setExpandedModule] = useState<number | null>(
    currentModuleNum,
  );
  const [previewVideo, setPreviewVideo] = useState<ModuleVideo | null>(null);
  const [previewFile, setPreviewFile] = useState<ModuleFile | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const downloadingRef = useRef<Set<number>>(new Set());

  // ── State: submission download
  const downloadingSubmissionRef = useRef<Set<number>>(new Set());
  const [downloadingSubmissionIds, setDownloadingSubmissionIds] = useState<
    Set<number>
  >(new Set());

  // ── State: submission upload
  const submissionFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingSubmissionModuleId, setPendingSubmissionModuleId] = useState<
    number | null
  >(null);
  const [uploadingSubmissionModuleId, setUploadingSubmissionModuleId] =
    useState<number | null>(null);

  // ── Effects
  const { streamUrl: onlineStreamUrl, loading: streamLoading } = useVideoStream(
    isOnline() ? (previewVideo?.id ?? null) : null,
  );

  useEffect(() => {
    setExpandedModule(currentModuleNum);
  }, [currentModuleNum]);

  // ── Derived: current course
  const course: Course | undefined =
    courses.find((c) => c.id === Number(courseId)) ??
    (location.state?.course as Course | undefined);

  // ── Effects: lazy-load my submissions when a module is expanded
  useEffect(() => {
    if (!course || expandedModule === null || !isOnline()) return;
    const mod = course.modules.find((m) => m.number === expandedModule);
    if (!mod) return;
    fetchMySubmissions(mod.id);
  }, [expandedModule, course]);

  // ── Derived: progress helper
  const { isPartCompleted } = useCourseProgress(course!);

  // ── Handlers: file download
  const handleFileDownload = async (
    fileId: number,
    originalFilename: string,
  ) => {
    if (downloadingRef.current.has(fileId)) return;

    downloadingRef.current.add(fileId);
    setDownloadingIds(new Set(downloadingRef.current));

    try {
      await fileService.download(fileId, originalFilename);
    } catch {
      toast.error("Failed to download file.", { position: "bottom-right" });
    } finally {
      downloadingRef.current.delete(fileId);
      setDownloadingIds(new Set(downloadingRef.current));
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

  // ── Handlers: submission upload
  const handleSubmissionFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    const moduleId = pendingSubmissionModuleId;
    if (!file || moduleId === null) return;

    setUploadingSubmissionModuleId(moduleId);
    try {
      await uploadSubmission(moduleId, file);
    } catch {
      // store already shows a toast
    } finally {
      setUploadingSubmissionModuleId(null);
      setPendingSubmissionModuleId(null);
      if (submissionFileInputRef.current) {
        submissionFileInputRef.current.value = "";
      }
    }
  };

  const openSubmissionPicker = (moduleId: number) => {
    setPendingSubmissionModuleId(moduleId);
    submissionFileInputRef.current?.click();
  };

  // ── Guards
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Course not found
      </div>
    );
  }

  // ── Render
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Main content */}
      <main className="flex-1 bg-white dark:bg-gray-950">
        <Outlet context={{ course }} />
      </main>

      {/* Hidden shared file input for submissions */}
      <input
        ref={submissionFileInputRef}
        type="file"
        accept=".pdf,.docx,image/jpeg,image/png"
        className="hidden"
        onChange={handleSubmissionFileChange}
      />

      {/* Right sidebar */}
      <aside className="hidden lg:block lg:w-80 xl:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 scrollbar-thin scrollbar-thumb-gray overflow-y-auto sticky top-0 h-screen p-6 transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Course Modules
          </h2>
        </div>

        <div className="space-y-4">
          {course?.modules.map((mod) => {
            const isExpanded = expandedModule === mod.number;
            const mySubmissionData = mySubmissionsByModule[mod.id];
            const submissions = mySubmissionData?.submissions ?? [];
            const submissionsActive = mySubmissionData?.isActive ?? false;
            const maxFiles = mySubmissionData?.maxFiles ?? 0;
            const atCap = submissions.length >= maxFiles;
            const showSubmissionsSection =
              submissionsActive || submissions.length > 0;

            return (
              <div key={mod.number}>
                {/* Module header */}
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
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                      {mod.number}
                    </div>
                    <span>{mod.title}</span>
                  </div>
                  <ChevronRight
                    size={18}
                    className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Expanded content */}
                <div
                  className={`ml-11 mt-0 overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-[1000px] opacity-100 py-2"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  {/* Parts */}
                  <div className="space-y-1.5">
                    {mod.parts.map((part) => (
                      <Link
                        key={part.slug}
                        to={`/student/course/${course.id}/module-${mod.number}/${part.slug}`}
                        className={`flex items-center justify-between py-2 px-3 rounded-md text-sm transition-colors ${
                          part.slug === partSlug
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <span>{part.name}</span>
                        {isPartCompleted(mod.number, part.slug) && (
                          <CheckCircle
                            size={14}
                            className="text-green-500 shrink-0"
                          />
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Videos section */}
                  {(mod.videos ?? []).length > 0 && (
                    <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Video size={12} />
                        Videos
                        {!isOnline() && (
                          <span className="ml-1 text-xs font-normal text-amber-500">
                            (offline)
                          </span>
                        )}
                      </p>
                      <div className="space-y-1">
                        {(mod.videos ?? [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((video) => (
                            <button
                              key={video.id}
                              onClick={() =>
                                isOnline() && setPreviewVideo(video)
                              }
                              disabled={!isOnline()}
                              className={`w-full flex items-center gap-2 py-2 px-3 rounded-md text-sm text-left transition-colors ${
                                isOnline()
                                  ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                  : "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                              }`}
                              title={
                                !isOnline()
                                  ? "Videos require an internet connection"
                                  : video.title
                              }
                            >
                              <Video
                                size={14}
                                className={`shrink-0 ${isOnline() ? "text-blue-500" : "text-gray-400 dark:text-gray-600"}`}
                              />
                              <span className="truncate flex-1">
                                {video.title}
                              </span>
                              {!isOnline() && (
                                <CloudOff
                                  size={12}
                                  className="shrink-0 text-gray-400 dark:text-gray-600"
                                />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Files section */}
                  {(mod.files ?? []).length > 0 && (
                    <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FileText size={12} />
                        Files
                        {!isOnline() && (
                          <span className="ml-1 text-xs font-normal text-amber-500">
                            (offline)
                          </span>
                        )}
                      </p>
                      <div className="space-y-1">
                        {(mod.files ?? [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((file) => (
                            <button
                              key={file.id}
                              onClick={() =>
                                !downloadingIds.has(file.id) &&
                                isOnline() &&
                                handleFileDownload(
                                  file.id,
                                  file.originalFilename,
                                )
                              }
                              disabled={
                                downloadingIds.has(file.id) || !isOnline()
                              }
                              className={`w-full flex items-center gap-2 py-2 px-3 rounded-md text-sm text-left transition-colors ${
                                downloadingIds.has(file.id) || !isOnline()
                                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                              }`}
                              title={
                                !isOnline()
                                  ? "Files require an internet connection"
                                  : `Download: ${file.title}`
                              }
                            >
                              <FileText
                                size={14}
                                className={`shrink-0 ${
                                  downloadingIds.has(file.id) || !isOnline()
                                    ? "text-gray-400 dark:text-gray-600"
                                    : "text-blue-500"
                                }`}
                              />
                              <span className="truncate flex-1">
                                {file.title}
                              </span>
                              {downloadingIds.has(file.id) ? (
                                <Loader2
                                  size={12}
                                  className="shrink-0 animate-spin text-blue-400"
                                />
                              ) : !isOnline() ? (
                                <CloudOff
                                  size={12}
                                  className="shrink-0 text-gray-400 dark:text-gray-600"
                                />
                              ) : (
                                <Download
                                  size={12}
                                  className="shrink-0 text-gray-400 dark:text-gray-500"
                                />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Submissions section */}
                  {showSubmissionsSection && (
                    <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FileUp size={12} />
                        Submission
                        {!isOnline() && (
                          <span className="ml-1 text-xs font-normal text-amber-500">
                            (offline)
                          </span>
                        )}
                      </p>

                      {submissions.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-2">
                          No file submitted yet.
                        </p>
                      ) : (
                        <div className="space-y-1 mb-2">
                          {submissions.map((sub) => (
                            <button
                              key={sub.id}
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
                              className={`w-full flex items-center gap-2 py-2 px-3 rounded-md text-sm text-left transition-colors ${
                                downloadingSubmissionIds.has(sub.id) ||
                                !isOnline()
                                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                              }`}
                              title={
                                !isOnline()
                                  ? "Files require an internet connection"
                                  : `Download: ${sub.originalFilename}`
                              }
                            >
                              <FileText
                                size={14}
                                className={`shrink-0 ${
                                  downloadingSubmissionIds.has(sub.id) ||
                                  !isOnline()
                                    ? "text-gray-400 dark:text-gray-600"
                                    : "text-blue-500"
                                }`}
                              />
                              <span className="truncate flex-1">
                                {sub.originalFilename}
                              </span>
                              {downloadingSubmissionIds.has(sub.id) ? (
                                <Loader2
                                  size={12}
                                  className="shrink-0 animate-spin text-blue-400"
                                />
                              ) : (
                                <Download
                                  size={12}
                                  className="shrink-0 text-gray-400 dark:text-gray-500"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {submissionsActive && (
                        <>
                          {atCap ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                              You've reached the maximum of {maxFiles} file
                              {maxFiles > 1 ? "s" : ""}.
                            </p>
                          ) : (
                            <button
                              onClick={() => openSubmissionPicker(mod.id)}
                              disabled={
                                !isOnline() ||
                                uploadingSubmissionModuleId === mod.id
                              }
                              className={`w-full py-2 text-sm rounded flex items-center justify-center gap-1 ${
                                !isOnline() ||
                                uploadingSubmissionModuleId === mod.id
                                  ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
                              }`}
                              title={
                                !isOnline()
                                  ? "Submissions require an internet connection"
                                  : "Submit a file (PDF, DOCX, JPEG, or PNG)"
                              }
                            >
                              {uploadingSubmissionModuleId === mod.id ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Upload size={16} />
                                  Submit File ({submissions.length}/{maxFiles})
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Video
                  size={18}
                  className="text-blue-600 dark:text-blue-400 shrink-0"
                />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-md">
                  {previewVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-black aspect-video flex items-center justify-center">
              {streamLoading && (
                <p className="text-white text-sm">Loading video...</p>
              )}
              {onlineStreamUrl && (
                <video
                  key={previewVideo.id}
                  controls
                  autoPlay
                  className="w-full h-full"
                  src={onlineStreamUrl}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            {!isOnline() && previewVideo.downloaded && (
              <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-700/50">
                <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Playing from local storage — no internet needed
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
