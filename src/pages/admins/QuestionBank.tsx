// src/pages/admins/QuestionBank.tsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Pencil, Image as ImageIcon, X } from "lucide-react";
import { BankQuestion, Course, QuizQuestionType } from "@/types/types";
import { questionBankService } from "@/services/questionBankService";
import { courseService } from "@/services/courseService";
import { tokenStorage } from "@/services/tokenStorage";

const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_in_the_blank: "Fill in the Blank",
  true_false: "True / False",
  matching: "Matching",
};

type DraftQuestion = Omit<
  BankQuestion,
  "id" | "createdById" | "createdByRole" | "createdAt" | "updatedAt"
>;

const emptyDraft = (type: QuizQuestionType): DraftQuestion => {
  const base = { type, question: "", explanation: "", courseId: null };
  switch (type) {
    case "multiple_choice":
      return { ...base, options: ["", "", "", ""], correctOptionIndex: 0 };
    case "identification":
      return { ...base, correctAnswers: [""] };
    case "true_false":
      return { ...base, correctBoolean: true };
    case "matching":
      return {
        ...base,
        matchingPairs: [
          { left: "", right: "" },
          { left: "", right: "" },
        ],
      };
    case "fill_in_the_blank":
    default:
      return { ...base, correctAnswer: "" };
  }
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftQuestion>(
    emptyDraft("multiple_choice"),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestions();
    courseService
      .getAll()
      .then(setCourses)
      .catch(() => toast.error("Failed to load courses."));
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionBankService.getAll();
      setQuestions(data);
    } catch {
      toast.error("Failed to load the question bank.");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setDraft(emptyDraft("multiple_choice"));
    setEditingId("new");
  };

  const startEdit = (q: BankQuestion) => {
    setDraft({
      type: q.type,
      question: q.question,
      imageUrl: q.imageUrl,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      correctAnswer: q.correctAnswer,
      correctAnswers: q.correctAnswers,
      correctBoolean: q.correctBoolean,
      matchingPairs: q.matchingPairs,
      explanation: q.explanation,
      courseId: q.courseId,
    });
    setEditingId(q.id);
  };

  const cancelEdit = () => setEditingId(null);

  const changeType = (type: QuizQuestionType) => {
    setDraft((prev) => ({
      ...emptyDraft(type),
      question: prev.question,
      explanation: prev.explanation,
      imageUrl: prev.imageUrl,
      courseId: prev.courseId,
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    const token = await tokenStorage.getToken();
    const formData = new FormData();
    formData.append("image", file);
    fetch(`${import.meta.env.VITE_API_URL}/content-images`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).catch(() => {});

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.onerror = () => toast.error("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!draft.question.trim()) {
      toast.warning("Enter the question text first.");
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await questionBankService.create(draft);
        toast.success("Question added to the bank.");
      } else if (typeof editingId === "number") {
        await questionBankService.update(editingId, draft);
        toast.success("Question updated.");
      }
      setEditingId(null);
      loadQuestions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the question.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (
      !window.confirm(
        "Delete this question? It will also be removed from any quiz that references it.",
      )
    )
      return;
    try {
      const result = await questionBankService.delete(id);
      toast.success(
        result.quizzesAffected > 0
          ? `Deleted. Removed from ${result.quizzesAffected} quiz(zes).`
          : "Deleted.",
      );
      loadQuestions();
    } catch {
      toast.error("Failed to delete the question.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-4xl text-gray-900 dark:text-white">
            Question Bank
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reusable questions that can be added to any quiz. Editing a question
            here updates it everywhere it's used.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No questions in the bank yet.
        </p>
      ) : (
        <div className="space-y-8">
          {(() => {
            const courseTitleById = new Map(
              courses.map((c) => [c.id, c.title]),
            );
            const groups = new Map<number | null, BankQuestion[]>();
            for (const q of questions) {
              const key = q.courseId ?? null;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(q);
            }

            const sortedEntries = [...groups.entries()].sort((a, b) => {
              if (a[0] === null) return 1; // Uncategorized always last
              if (b[0] === null) return -1;
              const titleA = courseTitleById.get(a[0]) ?? "";
              const titleB = courseTitleById.get(b[0]) ?? "";
              return titleA.localeCompare(titleB);
            });

            return sortedEntries.map(([courseId, groupQuestions]) => (
              <div key={courseId ?? "uncategorized"}>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {courseId === null
                    ? "Uncategorized"
                    : (courseTitleById.get(courseId) ?? "Unknown Course")}
                  <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">
                    ({groupQuestions.length})
                  </span>
                </h4>
                <div className="space-y-3">
                  {groupQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {QUESTION_TYPE_LABELS[q.type]}
                        </span>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {q.question}
                        </p>
                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt="Question"
                            className="max-h-20 mt-2 rounded border border-gray-200 dark:border-gray-600"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(q)}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(q.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Create / Edit modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId === "new" ? "Add Question" : "Edit Question"}
              </h2>
              <button
                onClick={cancelEdit}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Course
            </label>
            <select
              value={draft.courseId ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  courseId: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Uncategorized</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Question Type
            </label>
            <select
              value={draft.type}
              onChange={(e) => changeType(e.target.value as QuizQuestionType)}
              className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {(Object.keys(QUESTION_TYPE_LABELS) as QuizQuestionType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ),
              )}
            </select>

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Question Text
            </label>
            <input
              type="text"
              value={draft.question}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, question: e.target.value }))
              }
              className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={
                draft.type === "fill_in_the_blank"
                  ? 'e.g. "The capital of France is ___."'
                  : "Enter question..."
              }
            />
            {draft.type === "fill_in_the_blank" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 -mt-2">
                Use{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  ___
                </code>{" "}
                to mark where the blank should appear.
              </p>
            )}

            <div className="mb-3">
              {draft.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={draft.imageUrl}
                    alt="Question"
                    className="max-h-32 rounded border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, imageUrl: undefined }))
                    }
                    className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg cursor-pointer dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ImageIcon size={16} />
                  Add image (optional)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {/* Multiple choice */}
            {draft.type === "multiple_choice" && (
              <div className="space-y-2 mb-3">
                {(draft.options ?? []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={draft.correctOptionIndex === idx}
                      onChange={() =>
                        setDraft((prev) => ({
                          ...prev,
                          correctOptionIndex: idx,
                        }))
                      }
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...(prev.options ?? [])];
                          next[idx] = e.target.value;
                          return { ...prev, options: next };
                        })
                      }
                      className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={`Option ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Identification */}
            {draft.type === "identification" && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Accepted Answers
                </label>
                {(draft.correctAnswers ?? [""]).map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...(prev.correctAnswers ?? [""])];
                          next[idx] = e.target.value;
                          return { ...prev, correctAnswers: next };
                        })
                      }
                      className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={
                        idx === 0 ? "e.g. Paris" : "Another accepted answer"
                      }
                    />
                    {(draft.correctAnswers?.length ?? 1) > 1 && (
                      <button
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            correctAnswers: (prev.correctAnswers ?? []).filter(
                              (_, i) => i !== idx,
                            ),
                          }))
                        }
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      correctAnswers: [...(prev.correctAnswers ?? [""]), ""],
                    }))
                  }
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add another accepted answer
                </button>
              </div>
            )}

            {/* Fill in the blank */}
            {draft.type === "fill_in_the_blank" && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Correct Answer
                </label>
                <input
                  type="text"
                  value={draft.correctAnswer ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      correctAnswer: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Paris (exact answer, case insensitive)"
                />
              </div>
            )}

            {/* True / False */}
            {draft.type === "true_false" && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Correct Answer
                </label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <label
                      key={String(val)}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="radio"
                        checked={(draft.correctBoolean ?? true) === val}
                        onChange={() =>
                          setDraft((prev) => ({ ...prev, correctBoolean: val }))
                        }
                      />
                      {val ? "True" : "False"}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Matching */}
            {draft.type === "matching" && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Matching Pairs
                </label>
                {(draft.matchingPairs ?? []).map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...(prev.matchingPairs ?? [])];
                          next[idx] = { ...next[idx], left: e.target.value };
                          return { ...prev, matchingPairs: next };
                        })
                      }
                      className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Left item"
                    />
                    <span className="text-gray-400">→</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...(prev.matchingPairs ?? [])];
                          next[idx] = { ...next[idx], right: e.target.value };
                          return { ...prev, matchingPairs: next };
                        })
                      }
                      className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Matching item"
                    />
                    {(draft.matchingPairs?.length ?? 0) > 2 && (
                      <button
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            matchingPairs: (prev.matchingPairs ?? []).filter(
                              (_, i) => i !== idx,
                            ),
                          }))
                        }
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {(draft.matchingPairs?.length ?? 0) < 6 && (
                  <button
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        matchingPairs: [
                          ...(prev.matchingPairs ?? []),
                          { left: "", right: "" },
                        ],
                      }))
                    }
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add another pair
                  </button>
                )}
              </div>
            )}

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Explanation (optional)
            </label>
            <textarea
              value={draft.explanation ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, explanation: e.target.value }))
              }
              className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
