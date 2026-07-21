// src/pages/students/CourseQuiz.tsx
import { useParams, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Image as ImageIcon,
  X,
  Library,
  Lock,
  Search,
  ListChecks,
  PenLine,
  TextCursorInput,
  ToggleLeft,
  ArrowLeftRight,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  BankQuestion,
  Course,
  QuizBankCollection,
  QuizQuestion,
  QuizQuestionType,
} from "@/types/types";
import { tokenStorage } from "@/services/tokenStorage";

import { questionBankService } from "@/services/questionBankService";
import { quizBankCollectionService } from "@/services/bankCollectionService";

// ── Types
interface CourseQuizProps {
  quizQuestions?: QuizQuestion[];
  setQuizQuestions?: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  isEditMode?: boolean;
  showCorrectAnswers?: boolean;
  setShowCorrectAnswers?: React.Dispatch<React.SetStateAction<boolean>>;
}

// ── Constants
const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_in_the_blank: "Fill in the Blank",
  true_false: "True / False",
  matching: "Matching",
};

const QUESTION_TYPE_ICONS: Record<QuizQuestionType, typeof ListChecks> = {
  multiple_choice: ListChecks,
  identification: PenLine,
  fill_in_the_blank: TextCursorInput,
  true_false: ToggleLeft,
  matching: ArrowLeftRight,
};

const MAX_QUIZ_OPTIONS = 6;
const MAX_MATCHING_PAIRS = 6;
const MAX_IDENTIFICATION_ANSWERS = 10;

// Same palette/keying as QuestionBank.tsx, so a collection's accent dot
// matches wherever it shows up in the app.
const COLLECTION_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];
const colorForCollection = (id: number) =>
  COLLECTION_COLORS[id % COLLECTION_COLORS.length];

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
  showCorrectAnswers = true,
  setShowCorrectAnswers,
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

  // ── Collections (shared by the "Add from Bank" browser and the
  // "promote to bank" collection-choice prompt below)
  const [bankCollections, setBankCollections] = useState<QuizBankCollection[]>(
    [],
  );
  const [bankCollectionsLoading, setBankCollectionsLoading] = useState(false);

  const loadBankCollections = async () => {
    setBankCollectionsLoading(true);
    try {
      const data = await quizBankCollectionService.getAll();
      setBankCollections(data);
    } catch {
      toast.error("Failed to load collections.");
    } finally {
      setBankCollectionsLoading(false);
    }
  };

  // ── Promote a locally-created question into the bank
  const [promotingQuestion, setPromotingQuestion] =
    useState<QuizQuestion | null>(null);
  const [promoteCollectionId, setPromoteCollectionId] = useState<number | "">(
    "",
  );
  const [promoteCollectionSearch, setPromoteCollectionSearch] = useState("");

  const startPromoteToBank = (q: QuizQuestion) => {
    setPromotingQuestion(q);
    setPromoteCollectionId("");
    setPromoteCollectionSearch("");
    loadBankCollections();
  };

  const cancelPromoteToBank = () => setPromotingQuestion(null);

  const filteredPromoteCollections = bankCollections.filter((c) =>
    c.name.toLowerCase().includes(promoteCollectionSearch.trim().toLowerCase()),
  );

  const confirmPromoteToBank = async () => {
    if (!promotingQuestion || !setQuizQuestions) return;
    if (!promoteCollectionId) {
      toast.warning("Choose a collection first.");
      return;
    }
    const q = promotingQuestion;
    setPromotingIds((prev) => new Set(prev).add(q.id));
    try {
      const created = await questionBankService.create({
        ...q,
        collectionId: promoteCollectionId,
      });
      setQuizQuestions((prev) =>
        prev.map((qq) =>
          qq.id === q.id
            ? { ...created, id: qq.id, bankQuestionId: created.id }
            : qq,
        ),
      );
      toast.success("Added to the question bank.");
      setPromotingQuestion(null);
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

  // ── Question bank picker (browse a collection, add questions from it)
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [activeBankCollection, setActiveBankCollection] =
    useState<QuizBankCollection | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankQuestionsLoading, setBankQuestionsLoading] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(
    new Set(),
  );
  const [bankCollectionSearch, setBankCollectionSearch] = useState("");
  const [bankQuestionSearch, setBankQuestionSearch] = useState("");

  const openBankPicker = () => {
    setBankPickerOpen(true);
    setActiveBankCollection(null);
    setBankQuestions([]);
    setSelectedBankIds(new Set());
    setBankCollectionSearch("");
    setBankQuestionSearch("");
    loadBankCollections();
  };

  const closeBankPicker = () => {
    setBankPickerOpen(false);
    setActiveBankCollection(null);
    setBankQuestions([]);
    setSelectedBankIds(new Set());
    setBankCollectionSearch("");
    setBankQuestionSearch("");
  };

  const selectBankCollection = async (c: QuizBankCollection) => {
    setActiveBankCollection(c);
    setSelectedBankIds(new Set());
    setBankQuestionSearch("");
    setBankQuestionsLoading(true);
    try {
      const data = await questionBankService.getAll(c.id);
      const alreadyAdded = new Set(
        questions.filter((q) => q.bankQuestionId).map((q) => q.bankQuestionId),
      );
      setBankQuestions(data.filter((bq) => !alreadyAdded.has(bq.id)));
    } catch {
      toast.error("Failed to load questions in this collection.");
    } finally {
      setBankQuestionsLoading(false);
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

  const filteredBankCollections = bankCollections.filter((c) =>
    c.name.toLowerCase().includes(bankCollectionSearch.trim().toLowerCase()),
  );

  const filteredBankQuestions = bankQuestions.filter((bq) =>
    bq.question.toLowerCase().includes(bankQuestionSearch.trim().toLowerCase()),
  );

  const allFilteredSelected =
    filteredBankQuestions.length > 0 &&
    filteredBankQuestions.every((bq) => selectedBankIds.has(bq.id));

  const toggleSelectAllFiltered = () => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredBankQuestions.forEach((bq) => next.delete(bq.id));
      } else {
        filteredBankQuestions.forEach((bq) => next.add(bq.id));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!bankPickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBankPicker();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankPickerOpen]);

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
    closeBankPicker();
  };

  // ── Edit state: one question is authored/edited at a time via a modal,
  // instead of every question being permanently expanded inline.
  const [questionModalId, setQuestionModalId] = useState<number | "new" | null>(
    null,
  );
  const [questionDraft, setQuestionDraft] = useState<QuizQuestion>(() =>
    defaultQuestion("multiple_choice"),
  );
  const [questionAttemptedSave, setQuestionAttemptedSave] = useState(false);

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
  const removeQuestion = (id: number) => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const openAddQuestionModal = () => {
    setQuestionDraft(defaultQuestion("multiple_choice"));
    setQuestionAttemptedSave(false);
    setQuestionModalId("new");
  };

  const openEditQuestionModal = (q: QuizQuestion) => {
    setQuestionDraft(q);
    setQuestionAttemptedSave(false);
    setQuestionModalId(q.id);
  };

  const closeQuestionModal = () => setQuestionModalId(null);

  const changeQuestionDraftType = (type: QuizQuestionType) => {
    setQuestionDraft((prev) => ({
      ...defaultQuestion(type),
      id: prev.id,
      question: prev.question,
      explanation: prev.explanation,
      imageUrl: prev.imageUrl,
    }));
  };

  // Mirrors backend/src/utils/quizQuestions.ts validateQuestionShape() so
  // the problem shows up immediately instead of after a failed save.
  const validateQuestionDraft = (): string | null => {
    if (!questionDraft.question.trim()) return "Enter the question text first.";

    if (questionDraft.type === "multiple_choice") {
      const opts = questionDraft.options ?? [];
      if (opts.length < 2) return "Add at least 2 options.";
      if (opts.some((o) => !o.trim()))
        return "Fill in every option, or remove the empty ones.";
    } else if (questionDraft.type === "identification") {
      const answers = questionDraft.correctAnswers ?? [];
      if (answers.length < 1 || answers.some((a) => !a.trim()))
        return "Fill in every accepted answer, or remove the empty ones.";
    } else if (questionDraft.type === "matching") {
      const pairs = questionDraft.matchingPairs ?? [];
      if (pairs.length < 2) return "Add at least 2 matching pairs.";
      if (pairs.some((p) => !p.left.trim() || !p.right.trim()))
        return "Fill in both sides of every matching pair.";
    } else if (questionDraft.type === "fill_in_the_blank") {
      if (!questionDraft.correctAnswer?.trim())
        return "Enter the correct answer.";
      if (!questionDraft.question.includes("___"))
        return 'Use "___" in the question text to mark the blank.';
    }
    return null;
  };

  const addQuestionDraftOption = () =>
    setQuestionDraft((prev) => ({
      ...prev,
      options: [...(prev.options ?? []), ""],
    }));

  const removeQuestionDraftOption = (idx: number) =>
    setQuestionDraft((prev) => {
      const options = (prev.options ?? []).filter((_, i) => i !== idx);
      const prevCorrect = prev.correctOptionIndex ?? 0;
      const correctOptionIndex =
        prevCorrect === idx
          ? 0
          : prevCorrect > idx
            ? prevCorrect - 1
            : prevCorrect;
      return { ...prev, options, correctOptionIndex };
    });

  const handleQuestionDraftImageUpload = async (file: File) => {
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
      setQuestionDraft((prev) => ({
        ...prev,
        imageUrl: reader.result as string,
      }));
    };
    reader.onerror = () => toast.error("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const saveQuestionDraft = () => {
    const error = validateQuestionDraft();
    if (error) {
      setQuestionAttemptedSave(true);
      toast.warning(error);
      return;
    }
    if (!setQuizQuestions) return;
    if (questionModalId === "new") {
      setQuizQuestions((prev) => [...prev, questionDraft]);
      toast.success("Question added.");
    } else {
      setQuizQuestions((prev) =>
        prev.map((q) => (q.id === questionModalId ? questionDraft : q)),
      );
      toast.success("Question updated.");
    }
    setQuestionModalId(null);
  };

  useEffect(() => {
    if (questionModalId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuestionModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionModalId]);

  useEffect(() => {
    if (!promotingQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelPromoteToBank();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotingQuestion]);

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
            {/* Quiz settings */}
            <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 min-w-0">
                {showCorrectAnswers ? (
                  <Eye
                    size={18}
                    className="text-purple-600 dark:text-purple-400 shrink-0"
                  />
                ) : (
                  <EyeOff size={18} className="text-gray-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">
                    Show correct answers after submission
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When on, students see which answer was correct once they
                    submit this quiz. When off, they only see their score.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showCorrectAnswers}
                onClick={() => setShowCorrectAnswers?.((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  showCorrectAnswers
                    ? "bg-purple-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showCorrectAnswers ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

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
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Remove from this quiz (doesn't delete it from the bank)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-gray-900 dark:text-white line-clamp-2">
                        {q.question}
                      </p>
                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt="Question"
                          className="max-h-20 mt-2 rounded border border-gray-200 dark:border-gray-600"
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

                const TypeIcon =
                  QUESTION_TYPE_ICONS[q.type ?? "multiple_choice"];
                return (
                  <div
                    key={q.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className=" flex justify-between items-center gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-lg leading-none  dark:text-gray-400 shrink-0">
                            Question {idx + 1}
                          </span>
                          <p className="inline-flex items-center gap-1 text-xs leading-none px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shrink-0">
                            <TypeIcon size={11} />
                            {QUESTION_TYPE_LABELS[q.type ?? "multiple_choice"]}
                          </p>
                        </div>
                        <div className=" flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startPromoteToBank(q)}
                            disabled={promotingIds.has(q.id)}
                            title="Add this question to the reusable question bank"
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg disabled:opacity-50"
                          >
                            <Library size={16} />
                          </button>
                          <button
                            onClick={() => openEditQuestionModal(q)}
                            title="Edit"
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => removeQuestion(q.id)}
                            title="Delete"
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className=" text-gray-900 dark:text-white line-clamp-2">
                        {q.question || (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            Untitled question
                          </span>
                        )}
                      </p>
                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt="Question"
                          className="max-h-16 mt-2 rounded border border-gray-200 dark:border-gray-600"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Add question */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={openAddQuestionModal}
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
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closeBankPicker}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Library
                  size={18}
                  className="text-purple-600 dark:text-purple-400"
                />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add from Question Bank
                </h2>
              </div>
              <button
                onClick={closeBankPicker}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body: sidebar + question list */}
            <div className="flex-1 flex min-h-0">
              {/* Collections sidebar */}
              <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={bankCollectionSearch}
                      onChange={(e) => setBankCollectionSearch(e.target.value)}
                      placeholder="Search collections..."
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {bankCollectionsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      Loading...
                    </p>
                  ) : bankCollections.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      No collections yet. Create one from the Question Bank page
                      first.
                    </p>
                  ) : filteredBankCollections.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      No collections match &ldquo;{bankCollectionSearch}
                      &rdquo;.
                    </p>
                  ) : (
                    filteredBankCollections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectBankCollection(c)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left ${
                          activeBankCollection?.id === c.id
                            ? "bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-300 dark:ring-purple-700"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: colorForCollection(c.id) }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                            {c.name}
                          </span>
                          <span className="block text-xs text-gray-400 dark:text-gray-500">
                            {c.questionCount} question
                            {c.questionCount === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Question list */}
              <div className="flex-1 flex flex-col min-h-0">
                {!activeBankCollection ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                      Select a collection on the left to browse its questions.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
                      <div className="relative flex-1 min-w-0">
                        <Search
                          size={14}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={bankQuestionSearch}
                          onChange={(e) =>
                            setBankQuestionSearch(e.target.value)
                          }
                          placeholder={`Search in ${activeBankCollection.name}...`}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      {filteredBankQuestions.length > 0 && (
                        <button
                          onClick={toggleSelectAllFiltered}
                          className="text-xs font-medium text-purple-700 dark:text-purple-300 hover:underline whitespace-nowrap px-1 shrink-0"
                        >
                          {allFilteredSelected ? "Deselect all" : "Select all"}
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {bankQuestionsLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading...
                        </p>
                      ) : bankQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activeBankCollection.questionCount === 0
                            ? "This collection has no questions yet. Add some from the Question Bank page."
                            : "Every question in this collection is already in this quiz."}
                        </p>
                      ) : filteredBankQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No questions match &ldquo;{bankQuestionSearch}
                          &rdquo;.
                        </p>
                      ) : (
                        filteredBankQuestions.map((bq) => {
                          const TypeIcon = QUESTION_TYPE_ICONS[bq.type];
                          return (
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
                                className="mt-1 shrink-0"
                              />
                              {bq.imageUrl ? (
                                <img
                                  src={bq.imageUrl}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-600 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                  <TypeIcon
                                    size={16}
                                    className="text-gray-400 dark:text-gray-500"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mb-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  <TypeIcon size={11} />
                                  {QUESTION_TYPE_LABELS[bq.type]}
                                </span>
                                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                  {bq.question}
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedBankIds.size > 0
                  ? `${selectedBankIds.size} question${selectedBankIds.size === 1 ? "" : "s"} selected`
                  : "No questions selected"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={closeBankPicker}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedBankQuestions}
                  disabled={selectedBankIds.size === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  {selectedBankIds.size > 0
                    ? `Add ${selectedBankIds.size} Question${selectedBankIds.size === 1 ? "" : "s"}`
                    : "Add Selected"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {questionModalId !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closeQuestionModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {questionModalId === "new" ? "Add Question" : "Edit Question"}
              </h2>
              <button
                onClick={closeQuestionModal}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Question Type
              </label>
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {(Object.keys(QUESTION_TYPE_LABELS) as QuizQuestionType[]).map(
                  (t) => {
                    const Icon = QUESTION_TYPE_ICONS[t];
                    const active = questionDraft.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => changeQuestionDraftType(t)}
                        title={QUESTION_TYPE_LABELS[t]}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-center leading-tight ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[10px] font-medium">
                          {QUESTION_TYPE_LABELS[t]}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Question Text
              </label>
              <input
                type="text"
                value={questionDraft.question}
                onChange={(e) =>
                  setQuestionDraft((prev) => ({
                    ...prev,
                    question: e.target.value,
                  }))
                }
                className={`w-full p-2 border rounded mb-1 dark:bg-gray-700 dark:text-white ${
                  questionAttemptedSave && !questionDraft.question.trim()
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder={
                  questionDraft.type === "fill_in_the_blank"
                    ? 'e.g. "The capital of France is ___."'
                    : "Enter question..."
                }
              />
              {questionDraft.type === "fill_in_the_blank" && (
                <p
                  className={`text-xs mb-3 ${
                    questionAttemptedSave &&
                    questionDraft.question.trim() &&
                    !questionDraft.question.includes("___")
                      ? "text-red-500 dark:text-red-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Use{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                    ___
                  </code>{" "}
                  to mark where the blank should appear.
                </p>
              )}

              <div className="mb-4">
                {questionDraft.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={questionDraft.imageUrl}
                      alt="Question"
                      className="max-h-32 rounded border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      onClick={() =>
                        setQuestionDraft((prev) => ({
                          ...prev,
                          imageUrl: undefined,
                        }))
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
                        if (file) handleQuestionDraftImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Answer
              </p>

              {questionDraft.type === "multiple_choice" && (
                <div className="space-y-2 mb-1">
                  {(questionDraft.options ?? []).map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border ${
                        questionDraft.correctOptionIndex === idx
                          ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                          : "border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={questionDraft.correctOptionIndex === idx}
                        onChange={() =>
                          setQuestionDraft((prev) => ({
                            ...prev,
                            correctOptionIndex: idx,
                          }))
                        }
                        className="shrink-0 accent-green-600"
                        title="Mark as correct"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          setQuestionDraft((prev) => {
                            const next = [...(prev.options ?? [])];
                            next[idx] = e.target.value;
                            return { ...prev, options: next };
                          })
                        }
                        className={`flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white ${
                          questionAttemptedSave && !opt.trim()
                            ? "border-red-400 dark:border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        placeholder={`Option ${idx + 1}`}
                      />
                      {(questionDraft.options?.length ?? 0) > 2 && (
                        <button
                          onClick={() => removeQuestionDraftOption(idx)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(questionDraft.options?.length ?? 0) < MAX_QUIZ_OPTIONS && (
                    <button
                      onClick={addQuestionDraftOption}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + Add option
                    </button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                    Select the radio button next to the correct option.
                  </p>
                </div>
              )}

              {questionDraft.type === "identification" && (
                <div className="mb-1">
                  {(questionDraft.correctAnswers ?? [""]).map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={ans}
                        onChange={(e) =>
                          setQuestionDraft((prev) => {
                            const next = [...(prev.correctAnswers ?? [""])];
                            next[idx] = e.target.value;
                            return { ...prev, correctAnswers: next };
                          })
                        }
                        className={`flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white ${
                          questionAttemptedSave && !ans.trim()
                            ? "border-red-400 dark:border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        placeholder={
                          idx === 0 ? "e.g. Paris" : "Another accepted answer"
                        }
                      />
                      {(questionDraft.correctAnswers?.length ?? 1) > 1 && (
                        <button
                          onClick={() =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              correctAnswers: (
                                prev.correctAnswers ?? []
                              ).filter((_, i) => i !== idx),
                            }))
                          }
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(questionDraft.correctAnswers?.length ?? 0) <
                    MAX_IDENTIFICATION_ANSWERS && (
                    <button
                      onClick={() =>
                        setQuestionDraft((prev) => ({
                          ...prev,
                          correctAnswers: [
                            ...(prev.correctAnswers ?? [""]),
                            "",
                          ],
                        }))
                      }
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + Add another accepted answer
                    </button>
                  )}
                </div>
              )}

              {questionDraft.type === "fill_in_the_blank" && (
                <div className="mb-1">
                  <input
                    type="text"
                    value={questionDraft.correctAnswer ?? ""}
                    onChange={(e) =>
                      setQuestionDraft((prev) => ({
                        ...prev,
                        correctAnswer: e.target.value,
                      }))
                    }
                    className={`w-full p-2 border rounded dark:bg-gray-700 dark:text-white ${
                      questionAttemptedSave &&
                      !questionDraft.correctAnswer?.trim()
                        ? "border-red-400 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    placeholder="e.g. Paris (exact answer, case insensitive)"
                  />
                </div>
              )}

              {questionDraft.type === "true_false" && (
                <div className="mb-1 flex gap-2">
                  {[true, false].map((val) => {
                    const active =
                      (questionDraft.correctBoolean ?? true) === val;
                    return (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() =>
                          setQuestionDraft((prev) => ({
                            ...prev,
                            correctBoolean: val,
                          }))
                        }
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1.5 ${
                          active
                            ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {active && <Check size={14} />}
                        {val ? "True" : "False"}
                      </button>
                    );
                  })}
                </div>
              )}

              {questionDraft.type === "matching" && (
                <div className="mb-1">
                  {(questionDraft.matchingPairs ?? []).map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) =>
                          setQuestionDraft((prev) => {
                            const next = [...(prev.matchingPairs ?? [])];
                            next[idx] = { ...next[idx], left: e.target.value };
                            return { ...prev, matchingPairs: next };
                          })
                        }
                        className={`flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white ${
                          questionAttemptedSave && !pair.left.trim()
                            ? "border-red-400 dark:border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        placeholder="Left item"
                      />
                      <span className="text-gray-400 shrink-0">→</span>
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) =>
                          setQuestionDraft((prev) => {
                            const next = [...(prev.matchingPairs ?? [])];
                            next[idx] = {
                              ...next[idx],
                              right: e.target.value,
                            };
                            return { ...prev, matchingPairs: next };
                          })
                        }
                        className={`flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white ${
                          questionAttemptedSave && !pair.right.trim()
                            ? "border-red-400 dark:border-red-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        placeholder="Matching item"
                      />
                      {(questionDraft.matchingPairs?.length ?? 0) > 2 && (
                        <button
                          onClick={() =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              matchingPairs: (prev.matchingPairs ?? []).filter(
                                (_, i) => i !== idx,
                              ),
                            }))
                          }
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(questionDraft.matchingPairs?.length ?? 0) <
                    MAX_MATCHING_PAIRS && (
                    <button
                      onClick={() =>
                        setQuestionDraft((prev) => ({
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

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 mt-4">
                Explanation (optional)
              </label>
              <textarea
                value={questionDraft.explanation ?? ""}
                onChange={(e) =>
                  setQuestionDraft((prev) => ({
                    ...prev,
                    explanation: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <button
                onClick={closeQuestionModal}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestionDraft}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {questionModalId === "new" ? "Add Question" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {promotingQuestion && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={cancelPromoteToBank}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full shadow-2xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add to Question Bank
                </h2>
              </div>
              <button
                onClick={cancelPromoteToBank}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Preview of the question being promoted, so it's clear which one this refers to */}
              <div className="flex items-center gap-2 px-4 py-1 mb-4 rounded-lg  dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                {(() => {
                  const TypeIcon =
                    QUESTION_TYPE_ICONS[
                      promotingQuestion.type ?? "multiple_choice"
                    ];
                  return (
                    <TypeIcon
                      size={16}
                      className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5"
                    />
                  );
                })()}
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {promotingQuestion.question || (
                    <span className="italic text-gray-400">
                      Untitled question
                    </span>
                  )}
                </p>
              </div>

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Collection
              </label>

              {bankCollectionsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading...
                </p>
              ) : bankCollections.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No collections yet. Create one from the Question Bank page
                  first.
                </p>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={promoteCollectionSearch}
                      onChange={(e) =>
                        setPromoteCollectionSearch(e.target.value)
                      }
                      placeholder="Search collections..."
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredPromoteCollections.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No collections match &ldquo;{promoteCollectionSearch}
                        &rdquo;.
                      </p>
                    ) : (
                      filteredPromoteCollections.map((c) => {
                        const selected = promoteCollectionId === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setPromoteCollectionId(c.id)}
                            className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left ${
                              selected
                                ? "bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-300 dark:ring-purple-700"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: colorForCollection(c.id) }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                                {c.name}
                              </span>
                              <span className="block text-xs text-gray-400 dark:text-gray-500">
                                {c.questionCount} question
                                {c.questionCount === 1 ? "" : "s"}
                              </span>
                            </span>
                            {selected && (
                              <Check
                                size={16}
                                className="text-purple-600 dark:text-purple-400 shrink-0"
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <button
                onClick={cancelPromoteToBank}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmPromoteToBank}
                disabled={
                  !promoteCollectionId || promotingIds.has(promotingQuestion.id)
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
