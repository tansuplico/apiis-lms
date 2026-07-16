// src/pages/students/CourseQuiz.tsx
import { useParams, useOutletContext } from "react-router-dom";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  Library,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  BankQuestion,
  Course,
  QuizQuestion,
  QuizQuestionType,
} from "@/types/types";
import { tokenStorage } from "@/services/tokenStorage";

import { questionBankService } from "@/services/questionBankService";

// ── Types
interface CourseQuizProps {
  quizQuestions?: QuizQuestion[];
  setQuizQuestions?: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  isEditMode?: boolean;
}

// ── Constants
const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_in_the_blank: "Fill in the Blank",
  true_false: "True / False",
  matching: "Matching",
};

const defaultQuestion = (type: QuizQuestionType): QuizQuestion => {
  const base = { id: Date.now(), type, question: "", explanation: "" };
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

export default function CourseQuiz({
  quizQuestions: propQuizQuestions,
  setQuizQuestions,
  isEditMode = false,
}: CourseQuizProps) {
  // ── Routing
  const { moduleNumber } = useParams();
  const { course } = useOutletContext<{ course: Course }>();

  // ── Derived: current module + quiz part
  const modNum = Number(moduleNumber?.replace("module-", "")) || 1;
  const currentModule = course.modules.find((m) => m.number === modNum);
  const quizPart = currentModule?.parts.find((p) => p.slug === "quiz");

  // ── Student quiz state
  const [studentAnswers, setStudentAnswers] = useState<
    Record<number, string | number | boolean | string[]>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [promotingIds, setPromotingIds] = useState<Set<number>>(new Set());

  const promoteToBank = async (q: QuizQuestion) => {
    if (!setQuizQuestions) return;
    setPromotingIds((prev) => new Set(prev).add(q.id));
    try {
      const created = await questionBankService.create({
        ...q,
        courseId: course.id,
      });
      setQuizQuestions((prev) =>
        prev.map((qq) =>
          qq.id === q.id
            ? { ...created, id: qq.id, bankQuestionId: created.id }
            : qq,
        ),
      );
      toast.success("Added to the question bank.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to add this question to the bank.",
      );
    } finally {
      setPromotingIds((prev) => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
    }
  };

  // ── Question bank picker
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(
    new Set(),
  );

  const openBankPicker = async () => {
    setBankPickerOpen(true);
    setSelectedBankIds(new Set());
    setBankLoading(true);
    try {
      const data = await questionBankService.getAll();
      const alreadyAdded = new Set(
        questions.filter((q) => q.bankQuestionId).map((q) => q.bankQuestionId),
      );
      setBankQuestions(data.filter((bq) => !alreadyAdded.has(bq.id)));
    } catch {
      toast.error("Failed to load the question bank.");
    } finally {
      setBankLoading(false);
    }
  };

  const toggleBankSelection = (id: number) => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedBankQuestions = () => {
    if (!setQuizQuestions) return;
    const toAdd = bankQuestions
      .filter((bq) => selectedBankIds.has(bq.id))
      .map((bq) => ({
        ...bq,
        id: Date.now() + bq.id, // unique within this in-progress edit session
        bankQuestionId: bq.id,
      }));
    setQuizQuestions((prev) => [...prev, ...toAdd]);
    setBankPickerOpen(false);
  };

  // ── Edit state
  const [newQuestionType, setNewQuestionType] =
    useState<QuizQuestionType>("multiple_choice");

  if (!currentModule || !quizPart) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Quiz not found
      </div>
    );
  }

  const questions = isEditMode
    ? propQuizQuestions || []
    : quizPart.quizQuestions || [];

  // ── Handlers: student quiz
  const handleAnswerSelect = (
    questionId: number,
    value: string | number | boolean | string[],
  ) => {
    if (submitted) return;
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitAnswers = () => {
    if (Object.keys(studentAnswers).length < questions.length) {
      toast.warning("Please answer all questions before submitting.");
      return;
    }

    const correctCount = questions.filter((q) => isCorrect(q)).length;

    setScore(correctCount);
    setSubmitted(true);
    toast.success(`You scored ${correctCount}/${questions.length}!`);
  };

  const resetQuiz = () => {
    setSubmitted(false);
    setStudentAnswers({});
    setScore(0);
  };

  // ── Handlers: edit mode
  const addQuestion = () => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) => [...prev, defaultQuestion(newQuestionType)]);
  };

  const updateQuestion = (
    id: number,
    field: keyof QuizQuestion,
    value: any,
  ) => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const removeQuestion = (id: number) => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleQuestionImageUpload = async (id: number, file: File) => {
    if (!setQuizQuestions) return;

    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    // Fire-and-forget copy to the server (same pattern as course content
    // images) — the base64 embed below is what's actually stored/rendered,
    // so a failure here doesn't block the question image from working.
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
      updateQuestion(id, "imageUrl", reader.result as string);
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const changeQuestionType = (id: number, newType: QuizQuestionType) => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const carried = {
          id: q.id,
          type: newType,
          question: q.question,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
        };
        switch (newType) {
          case "multiple_choice":
            return {
              ...carried,
              options: ["", "", "", ""],
              correctOptionIndex: 0,
            };
          case "identification":
            return { ...carried, correctAnswers: [""] };
          case "true_false":
            return { ...carried, correctBoolean: true };
          case "matching":
            return {
              ...carried,
              matchingPairs: [
                { left: "", right: "" },
                { left: "", right: "" },
              ],
            };
          case "fill_in_the_blank":
          default:
            return { ...carried, correctAnswer: "" };
        }
      }),
    );
  };

  const isCorrect = (q: QuizQuestion) => {
    const answer = studentAnswers[q.id];
    switch (q.type) {
      case "multiple_choice":
        return answer === q.correctOptionIndex;
      case "true_false": {
        if (typeof answer === "undefined") return false;
        const normalized =
          typeof answer === "string"
            ? answer.trim().toLowerCase() === "true"
            : Boolean(answer);
        return normalized === q.correctBoolean;
      }
      case "identification": {
        if (typeof answer !== "string") return false;
        const accepted =
          q.correctAnswers ?? (q.correctAnswer ? [q.correctAnswer] : []);
        const given = answer.trim().toLowerCase();
        return accepted.some((a) => a.trim().toLowerCase() === given);
      }
      case "matching": {
        if (!Array.isArray(answer) || !q.matchingPairs) return false;
        if (answer.length !== q.matchingPairs.length) return false;
        return q.matchingPairs.every(
          (pair, i) =>
            typeof answer[i] === "string" &&
            answer[i].trim().toLowerCase() === pair.right.trim().toLowerCase(),
        );
      }
      case "fill_in_the_blank":
      default:
        return (
          typeof answer === "string" &&
          answer.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()
        );
    }
  };

  // ── Render
  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Knowledge Check Quiz
      </h2>

      <p className="text-lg leading-relaxed mb-8 text-gray-700 dark:text-gray-300">
        {quizPart.content}
      </p>

      <div className="mt-8 p-6 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-sm">
        {isEditMode ? (
          /* Edit mode */
          <div className="space-y-6">
            {questions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No questions yet. Add one below.
              </p>
            ) : (
              questions.map((q, idx) => {
                if (q.bankQuestionId) {
                  return (
                    <div
                      key={q.id}
                      className="p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">Question {idx + 1}</h4>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            <Library size={12} />
                            From Bank
                          </span>
                        </div>
                        <button
                          onClick={() => promoteToBank(q)}
                          disabled={promotingIds.has(q.id)}
                          title="Add this question to the reusable question bank"
                          className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded disabled:opacity-50"
                        >
                          <Library size={16} />
                        </button>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Remove from this quiz (doesn't delete it from the bank)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-gray-900 dark:text-white">
                        {q.question}
                      </p>
                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt="Question"
                          className="max-h-32 mt-2 rounded border border-gray-200 dark:border-gray-600"
                        />
                      )}
                      <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <Lock size={12} />
                        Read-only here — edit this question from the Question
                        Bank page (changes apply everywhere it's used).
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Question header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Question {idx + 1}</h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.type ?? "multiple_choice"}
                          onChange={(e) =>
                            changeQuestionType(
                              q.id,
                              e.target.value as QuizQuestionType,
                            )
                          }
                          className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(QUESTION_TYPE_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Type badge */}
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${
                        q.type === "multiple_choice"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : q.type === "identification"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : q.type === "true_false"
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                              : q.type === "matching"
                                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}
                    >
                      {QUESTION_TYPE_LABELS[q.type ?? "multiple_choice"]}
                    </span>

                    {/* Question text */}
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(q.id, "question", e.target.value)
                      }
                      className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={
                        q.type === "fill_in_the_blank"
                          ? 'e.g. "The capital of France is ___."'
                          : "Enter question..."
                      }
                    />

                    {/* Question image */}
                    <div className="mb-3">
                      {q.imageUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={q.imageUrl}
                            alt="Question"
                            className="max-h-40 rounded border border-gray-200 dark:border-gray-600"
                          />
                          <button
                            onClick={() =>
                              updateQuestion(q.id, "imageUrl", undefined)
                            }
                            className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
                            title="Remove image"
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
                              if (file) handleQuestionImageUpload(q.id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Fill in the blank hint */}
                    {q.type === "fill_in_the_blank" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 -mt-2">
                        Use{" "}
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                          ___
                        </code>{" "}
                        to mark where the blank should appear.
                      </p>
                    )}

                    {/* Multiple choice options */}
                    {(q.type === "multiple_choice" || !q.type) && (
                      <div className="space-y-2">
                        {q.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input
                              type="radio"
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() =>
                                setQuizQuestions?.((prev) =>
                                  prev.map((qq) =>
                                    qq.id === q.id
                                      ? { ...qq, correctOptionIndex: optIdx }
                                      : qq,
                                  ),
                                )
                              }
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) =>
                                setQuizQuestions?.((prev) => {
                                  const newOpts = [...(q.options ?? [])];
                                  newOpts[optIdx] = e.target.value;
                                  return prev.map((qq) =>
                                    qq.id === q.id
                                      ? { ...qq, options: newOpts }
                                      : qq,
                                  );
                                })
                              }
                              className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-400 mt-1">
                          Select the radio button next to the correct answer.
                        </p>
                      </div>
                    )}

                    {/* Identification: multiple accepted answers */}
                    {q.type === "identification" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Accepted Answers
                        </label>
                        <div className="space-y-2">
                          {(q.correctAnswers ?? [""]).map((ans, ansIdx) => (
                            <div
                              key={ansIdx}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={ans}
                                onChange={(e) =>
                                  setQuizQuestions?.((prev) =>
                                    prev.map((qq) => {
                                      if (qq.id !== q.id) return qq;
                                      const next = [
                                        ...(qq.correctAnswers ?? [""]),
                                      ];
                                      next[ansIdx] = e.target.value;
                                      return { ...qq, correctAnswers: next };
                                    }),
                                  )
                                }
                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder={
                                  ansIdx === 0
                                    ? "e.g. Paris"
                                    : "Another accepted answer"
                                }
                              />
                              {(q.correctAnswers?.length ?? 1) > 1 && (
                                <button
                                  onClick={() =>
                                    setQuizQuestions?.((prev) =>
                                      prev.map((qq) =>
                                        qq.id === q.id
                                          ? {
                                              ...qq,
                                              correctAnswers: (
                                                qq.correctAnswers ?? []
                                              ).filter((_, i) => i !== ansIdx),
                                            }
                                          : qq,
                                      ),
                                    )
                                  }
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            setQuizQuestions?.((prev) =>
                              prev.map((qq) =>
                                qq.id === q.id
                                  ? {
                                      ...qq,
                                      correctAnswers: [
                                        ...(qq.correctAnswers ?? [""]),
                                        "",
                                      ],
                                    }
                                  : qq,
                              ),
                            )
                          }
                          className="text-xs text-blue-600 hover:underline mt-2"
                        >
                          + Add another accepted answer
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                          A student's answer is correct if it matches any one of
                          these, case insensitive.
                        </p>
                      </div>
                    )}

                    {/* Fill in the blank correct answer */}
                    {q.type === "fill_in_the_blank" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Correct Answer
                        </label>
                        <input
                          type="text"
                          value={q.correctAnswer ?? ""}
                          onChange={(e) =>
                            updateQuestion(
                              q.id,
                              "correctAnswer",
                              e.target.value,
                            )
                          }
                          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="e.g. Paris (exact answer, case insensitive)"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Graded by exact match, case insensitive.
                        </p>
                      </div>
                    )}

                    {/* True / False */}
                    {q.type === "true_false" && (
                      <div>
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
                                checked={(q.correctBoolean ?? true) === val}
                                onChange={() =>
                                  updateQuestion(q.id, "correctBoolean", val)
                                }
                              />
                              {val ? "True" : "False"}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching pairs */}
                    {q.type === "matching" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Matching Pairs
                        </label>
                        <div className="space-y-2">
                          {(q.matchingPairs ?? []).map((pair, pairIdx) => (
                            <div
                              key={pairIdx}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={pair.left}
                                onChange={(e) =>
                                  setQuizQuestions?.((prev) =>
                                    prev.map((qq) => {
                                      if (qq.id !== q.id) return qq;
                                      const next = [
                                        ...(qq.matchingPairs ?? []),
                                      ];
                                      next[pairIdx] = {
                                        ...next[pairIdx],
                                        left: e.target.value,
                                      };
                                      return { ...qq, matchingPairs: next };
                                    }),
                                  )
                                }
                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Left item"
                              />
                              <span className="text-gray-400">→</span>
                              <input
                                type="text"
                                value={pair.right}
                                onChange={(e) =>
                                  setQuizQuestions?.((prev) =>
                                    prev.map((qq) => {
                                      if (qq.id !== q.id) return qq;
                                      const next = [
                                        ...(qq.matchingPairs ?? []),
                                      ];
                                      next[pairIdx] = {
                                        ...next[pairIdx],
                                        right: e.target.value,
                                      };
                                      return { ...qq, matchingPairs: next };
                                    }),
                                  )
                                }
                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Matching item"
                              />
                              {(q.matchingPairs?.length ?? 0) > 2 && (
                                <button
                                  onClick={() =>
                                    setQuizQuestions?.((prev) =>
                                      prev.map((qq) =>
                                        qq.id === q.id
                                          ? {
                                              ...qq,
                                              matchingPairs: (
                                                qq.matchingPairs ?? []
                                              ).filter((_, i) => i !== pairIdx),
                                            }
                                          : qq,
                                      ),
                                    )
                                  }
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {(q.matchingPairs?.length ?? 0) < 6 && (
                          <button
                            onClick={() =>
                              setQuizQuestions?.((prev) =>
                                prev.map((qq) =>
                                  qq.id === q.id
                                    ? {
                                        ...qq,
                                        matchingPairs: [
                                          ...(qq.matchingPairs ?? []),
                                          { left: "", right: "" },
                                        ],
                                      }
                                    : qq,
                                ),
                              )
                            }
                            className="text-xs text-blue-600 hover:underline mt-2"
                          >
                            + Add another pair
                          </button>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Students will match each left item to its correct
                          right item.
                        </p>
                      </div>
                    )}

                    {/* Explanation */}
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) =>
                        updateQuestion(q.id, "explanation", e.target.value)
                      }
                      className="w-full p-2 mt-3 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Explanation / feedback (optional)"
                    />
                  </div>
                );
              })
            )}

            {/* Add question */}
            <div className="flex items-center gap-3 mt-6">
              <select
                value={newQuestionType}
                onChange={(e) =>
                  setNewQuestionType(e.target.value as QuizQuestionType)
                }
                className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={addQuestion}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Question
              </button>
              <button
                onClick={openBankPicker}
                className="py-2.5 px-4 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Library size={18} />
                Add from Bank
              </button>
            </div>
          </div>
        ) : (
          /* Student view */
          <div className="space-y-6">
            {questions.length ? (
              <>
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3">
                    {/* Type badge */}
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.type === "multiple_choice"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : q.type === "identification"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : q.type === "true_false"
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                              : q.type === "matching"
                                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}
                    >
                      {QUESTION_TYPE_LABELS[q.type ?? "multiple_choice"]}
                    </span>

                    <p className="font-medium text-gray-900 dark:text-white">
                      Question {idx + 1}: {q.question}
                    </p>

                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="Question"
                        className="max-h-56 rounded border border-gray-200 dark:border-gray-700"
                      />
                    )}

                    {/* Multiple choice */}
                    {(q.type === "multiple_choice" || !q.type) && (
                      <ul className="space-y-2">
                        {q.options?.map((opt, optIdx) => (
                          <li
                            key={optIdx}
                            className={`flex items-center gap-2 ${
                              submitted && optIdx === q.correctOptionIndex
                                ? "text-green-600 font-medium"
                                : submitted &&
                                    studentAnswers[q.id] === optIdx &&
                                    optIdx !== q.correctOptionIndex
                                  ? "text-red-500 line-through"
                                  : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${idx}`}
                              checked={studentAnswers[q.id] === optIdx}
                              onChange={() => handleAnswerSelect(q.id, optIdx)}
                              disabled={submitted}
                            />
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Identification */}
                    {q.type === "identification" && (
                      <div>
                        <input
                          type="text"
                          value={String(studentAnswers[q.id] ?? "")}
                          onChange={(e) =>
                            handleAnswerSelect(q.id, e.target.value)
                          }
                          disabled={submitted}
                          placeholder="Type your answer..."
                          className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            submitted
                              ? isCorrect(q)
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : ""
                          }`}
                        />
                        {submitted && (
                          <p
                            className={`text-sm mt-1 ${isCorrect(q) ? "text-green-600" : "text-red-500"}`}
                          >
                            {isCorrect(q)
                              ? "✓ Correct!"
                              : `✗ Correct answer: ${(q.correctAnswers ?? [q.correctAnswer]).filter(Boolean).join(" / ")}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* True / False */}
                    {q.type === "true_false" && (
                      <div className="flex gap-4">
                        {[true, false].map((val) => (
                          <label
                            key={String(val)}
                            className={`flex items-center gap-2 ${
                              submitted && val === q.correctBoolean
                                ? "text-green-600 font-medium"
                                : submitted &&
                                    studentAnswers[q.id] === val &&
                                    val !== q.correctBoolean
                                  ? "text-red-500 line-through"
                                  : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${idx}`}
                              checked={studentAnswers[q.id] === val}
                              onChange={() => handleAnswerSelect(q.id, val)}
                              disabled={submitted}
                            />
                            {val ? "True" : "False"}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Matching */}
                    {q.type === "matching" && (
                      <div className="space-y-2">
                        {(q.matchingPairs ?? []).map((pair, pairIdx) => {
                          const answerArr =
                            (studentAnswers[q.id] as string[] | undefined) ??
                            [];
                          const given = answerArr[pairIdx] ?? "";
                          const pairCorrect =
                            submitted &&
                            given.trim().toLowerCase() ===
                              pair.right.trim().toLowerCase();
                          return (
                            <div
                              key={pairIdx}
                              className="flex items-center gap-2"
                            >
                              <span className="flex-1 text-gray-700 dark:text-gray-300">
                                {pair.left}
                              </span>
                              <span className="text-gray-400">→</span>
                              <select
                                value={given}
                                disabled={submitted}
                                onChange={(e) => {
                                  const next = [...answerArr];
                                  next[pairIdx] = e.target.value;
                                  handleAnswerSelect(q.id, next);
                                }}
                                className={`flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                  submitted
                                    ? pairCorrect
                                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                      : "border-red-500 bg-red-50 dark:bg-red-900/20"
                                    : ""
                                }`}
                              >
                                <option value="">Select a match...</option>
                                {(q.matchingPairs ?? []).map((p, i) => (
                                  <option key={i} value={p.right}>
                                    {p.right}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        {submitted && (
                          <p
                            className={`text-sm mt-1 ${isCorrect(q) ? "text-green-600" : "text-red-500"}`}
                          >
                            {isCorrect(q)
                              ? "✓ All pairs correct!"
                              : "✗ One or more pairs were incorrect."}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fill in the blank */}
                    {q.type === "fill_in_the_blank" && (
                      <div>
                        <div className="flex items-center flex-wrap gap-1 text-gray-900 dark:text-white">
                          {q.question.split("___").map((part, i, arr) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1"
                            >
                              <span>{part}</span>
                              {i < arr.length - 1 && (
                                <input
                                  type="text"
                                  value={String(studentAnswers[q.id] ?? "")}
                                  onChange={(e) =>
                                    handleAnswerSelect(q.id, e.target.value)
                                  }
                                  disabled={submitted}
                                  className={`w-32 px-2 py-0.5 border-b-2 bg-transparent focus:outline-none text-center ${
                                    submitted
                                      ? isCorrect(q)
                                        ? "border-green-500 text-green-600"
                                        : "border-red-500 text-red-500"
                                      : "border-gray-400 dark:border-gray-500 focus:border-blue-500"
                                  }`}
                                />
                              )}
                            </span>
                          ))}
                        </div>
                        {submitted && (
                          <p
                            className={`text-sm mt-1 ${isCorrect(q) ? "text-green-600" : "text-red-500"}`}
                          >
                            {isCorrect(q)
                              ? "✓ Correct!"
                              : `✗ Correct answer: ${q.correctAnswer}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Explanation (shown after submit) */}
                    {submitted && q.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                {/* Submit / result */}
                {!submitted ? (
                  <button
                    onClick={submitAnswers}
                    className="w-full py-3 mt-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      Object.keys(studentAnswers).length !== questions.length
                    }
                  >
                    Submit All Answers
                  </button>
                ) : (
                  <div className="text-center mt-8 space-y-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      Your Score: {score} / {questions.length}
                    </div>
                    <button
                      onClick={resetQuiz}
                      className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No quiz questions yet.
              </p>
            )}
          </div>
        )}
      </div>

      {bankPickerOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Add from Question Bank
              </h2>
              <button
                onClick={() => setBankPickerOpen(false)}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {bankLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              ) : bankQuestions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  The question bank is empty. Add questions to it from the
                  Question Bank page first.
                </p>
              ) : (
                bankQuestions.map((bq) => (
                  <label
                    key={bq.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                      selectedBankIds.has(bq.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBankIds.has(bq.id)}
                      onChange={() => toggleBankSelection(bq.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {QUESTION_TYPE_LABELS[bq.type]}
                      </span>
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {bq.question}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBankPickerOpen(false)}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addSelectedBankQuestions}
                disabled={selectedBankIds.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
