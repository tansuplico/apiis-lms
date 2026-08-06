// src/pages/admins/CourseModulePart.tsx
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  PlayCircle,
  CheckCircle,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import CourseQuiz from "../admins/CourseQuiz";
import TipTapEditor from "@/components/admins/courses/TipTapEditor";
import { Course, QuizQuestion } from "@/types/types";
import { useCourseStore } from "@/stores/useCourseStore";
import CoursePartViewer from "../admins/CoursePartViewer";
import { fileToCompressedDataUrl } from "@/utils/imageUtils";

export default function CourseModulePart() {
  // ── Routing
  const { courseSlug, moduleNumber, "*": partSlug } = useParams();
  const navigate = useNavigate();
  const { course, isEditMode } = useOutletContext<{
    course: Course;
    isEditMode: boolean;
  }>();

  // ── Store
  const {
    updatePart,
    updateQuizQuestions,
    deletePart,
    reorderPart,
    refreshCourse,
  } = useCourseStore();

  // ── Derived: current module + part
  const modNum = Number(moduleNumber?.replace("module-", "")) || 1;
  const currentModule = course.modules.find((m) => m.number === modNum);
  const currentPart =
    currentModule?.parts.find((p) => p.slug === partSlug) ||
    currentModule?.parts[0];

  // ── Edit state
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedQuestions, setEditedQuestions] = useState<QuizQuestion[]>([]);
  const [editedColor, setEditedColor] = useState("");
  const [editedShowCorrectAnswers, setEditedShowCorrectAnswers] =
    useState(true);

  // ── Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentPart) return;
    setEditedTitle(currentPart.name ?? "");
    setEditedContent(currentPart.content ?? "");
    setEditedColor(currentPart.coverColor ?? "#ffffff");
    setEditedQuestions(currentPart.quizQuestions ?? []);
    setEditedShowCorrectAnswers(currentPart.showCorrectAnswers ?? true);
  }, [currentPart?.id]);

  if (!currentModule || !currentPart) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Module or part not found
      </div>
    );
  }

  // ── Derived: part order
  const sortedParts = useMemo(
    () => [...currentModule.parts].sort((a, b) => a.order - b.order),
    [currentModule.parts],
  );
  const currentPartIndex = sortedParts.findIndex(
    (p) => p.id === currentPart.id,
  );
  const isFirst = currentPartIndex === 0;
  const isLast = currentPartIndex === sortedParts.length - 1;

  const Icon =
    {
      introduction: BookOpen,
      lessons: FileText,
      quiz: PlayCircle,
      activities: CheckCircle,
    }[currentPart.slug] || BookOpen;

  // ── Handlers
  const handleEditorChange = (html: string) => {
    setEditedContent(html);
  };

  const saveChanges = async () => {
    if (!course) {
      toast.error("No course loaded.");
      return;
    }

    const currentModuleData = course.modules.find((m) => m.number === modNum);
    if (!currentModuleData) {
      toast.error("Module not found.");
      return;
    }

    const currentPartData = currentModuleData.parts.find(
      (p) => p.slug === partSlug,
    );
    if (!currentPartData) {
      toast.error("Part not found.");
      return;
    }

    try {
      if (partSlug === "quiz") {
        await updateQuizQuestions(
          course.id,
          currentModuleData.id,
          currentPartData.id,
          editedQuestions,
          currentPartData.updatedAt,
          editedShowCorrectAnswers,
        );
      } else {
        await updatePart(course.id, currentModuleData.id, currentPartData.id, {
          name: editedTitle,
          coverColor: editedColor,
          content: editedContent,
          expectedUpdatedAt: currentPartData.updatedAt,
        });
      }
      toast.success("Changes saved!", {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (err: any) {
      if (err?.statusCode === 409) {
        await refreshCourse(course.id);
      }
    }
  };

  const handleReorder = async (direction: "up" | "down") => {
    try {
      await reorderPart(course.id, currentModule.id, currentPart.id, direction);
      toast.success(`Part moved ${direction}.`, {
        position: "bottom-right",
        autoClose: 1500,
      });
    } catch {}
  };

  const handleDeletePart = async () => {
    if (!currentModule || !currentPart) return;
    setIsDeleting(true);
    try {
      await deletePart(course.id, currentModule.id, currentPart.id);
      setShowDeleteModal(false);
      navigate(`/admin/course/${courseSlug}/module-${modNum}`);
      toast.success(`"${currentPart.name}" deleted successfully.`, {
        position: "bottom-right",
      });
    } catch (error) {
      toast.error("Failed to delete part.");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // src/pages/shared/CourseModulePart.tsx — replace handleImageUpload entirely (~line 179)

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed.");
      throw new Error("Unsupported image type.");
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      throw new Error("Image too large.");
    }

    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      // ~1.37x: base64 overhead plus the data: prefix.
      if (dataUrl.length > 700 * 1024) {
        toast.error(
          "Image is too large even after compression. Try a smaller one.",
        );
        throw new Error("Compressed image too large.");
      }
      return dataUrl;
    } catch (err) {
      console.error("handleImageUpload failed:", err);
      toast.error("Could not process that image. Please try another.");
      throw err;
    }
  };

  // ── Render
  return (
    <div className="p-6 md:p-8 lg:p-10 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen">
      {/* Main content card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="text-white px-6 py-5 flex items-center gap-4 justify-between"
          style={{
            backgroundColor: isEditMode ? editedColor : currentPart.coverColor,
          }}
        >
          <div className="flex items-center gap-4">
            <Icon size={28} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              title={currentPart.name}
            >
              {currentPart.name}
            </h1>
          </div>

          {/* Save + delete buttons (edit mode only) */}
          {isEditMode && (
            <div className="flex gap-2">
              <button
                onClick={() => handleReorder("up")}
                disabled={isFirst}
                className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                title="Move part up"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => handleReorder("down")}
                disabled={isLast}
                className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                title="Move part down"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={saveChanges}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <Trash2 size={18} />
                Delete Part
              </button>
            </div>
          )}
        </div>
        {/* Content area */}
        <div className="p-7 prose prose-lg max-w-4xl mx-auto text-gray-800 dark:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400">
          {isEditMode ? (
            <div className="space-y-6">
              {partSlug === "quiz" ? (
                <CourseQuiz
                  quizQuestions={editedQuestions}
                  setQuizQuestions={setEditedQuestions}
                  isEditMode={true}
                  showCorrectAnswers={editedShowCorrectAnswers}
                  setShowCorrectAnswers={setEditedShowCorrectAnswers}
                />
              ) : (
                <TipTapEditor
                  key={currentPart.id}
                  content={editedContent}
                  onChange={handleEditorChange}
                  editable={true}
                  onImageUpload={handleImageUpload}
                />
              )}
            </div>
          ) : (
            <>
              {partSlug === "quiz" ? (
                <CourseQuiz
                  quizQuestions={editedQuestions}
                  setQuizQuestions={setEditedQuestions}
                  isEditMode={false}
                />
              ) : (
                <CoursePartViewer
                  part={currentPart}
                  fallbackText={
                    {
                      introduction:
                        "Welcome! This is the introduction section...",
                      lessons: "Welcome! This is the Summary section...",
                      activities: "Welcome! This is the activity section...",
                    }[partSlug || ""] ||
                    "Welcome! This is the introduction section..."
                  }
                />
              )}
            </>
          )}
        </div>{" "}
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete Part?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Are you sure you want to delete{" "}
              <strong>{currentPart.name}</strong>? This will permanently remove
              the part and all its content. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeletePart}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 px-6 rounded-xl font-medium cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium cursor-pointer"
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
