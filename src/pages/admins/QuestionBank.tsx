// src/pages/admins/QuestionBank.tsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  Pencil,
  Image as ImageIcon,
  X,
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import {
  BankQuestion,
  QuizBankCollection,
  QuizQuestionType,
} from "@/types/types";
import { questionBankService } from "@/services/questionBankService";
import { quizBankCollectionService } from "@/services/bankCollectionService";
import { tokenStorage } from "@/services/tokenStorage";
import CollectionGridCardSkeleton from "@/components/ui/CollectionGridCardSkeleton";
import CollectionListItemSkeleton from "@/components/ui/CollectionListItemSkeleton";
import BankQuestionSkeleton from "@/components/ui/BankQuestionSkeleton";

const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_in_the_blank: "Fill in the Blank",
  true_false: "True / False",
  matching: "Matching",
};

// Deterministic per-collection accent, keyed by id (not name) so renaming
// a collection never shuffles its color.
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

const SKELETON_COUNT = 6;

type DraftQuestion = Omit<
  BankQuestion,
  "id" | "createdById" | "createdByRole" | "createdAt" | "updatedAt"
>;

const emptyDraft = (
  type: QuizQuestionType,
  collectionId: number,
): DraftQuestion => {
  const base = { type, question: "", explanation: "", collectionId };
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
  const [collections, setCollections] = useState<QuizBankCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [activeCollection, setActiveCollection] =
    useState<QuizBankCollection | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () =>
      (localStorage.getItem("qb-collection-view") as "grid" | "list") || "grid",
  );

  const changeViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("qb-collection-view", mode);
  };

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftQuestion>(
    emptyDraft("multiple_choice", 0),
  );
  const [saving, setSaving] = useState(false);

  const [collectionModalMode, setCollectionModalMode] = useState<
    "new" | QuizBankCollection | null
  >(null);
  const [collectionDraft, setCollectionDraft] = useState({
    name: "",
    description: "",
  });
  const [savingCollection, setSavingCollection] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (activeCollection) loadQuestions(activeCollection.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCollection?.id]);

  const loadCollections = async () => {
    setCollectionsLoading(true);
    try {
      const data = await quizBankCollectionService.getAll();
      setCollections(data);
    } catch {
      toast.error("Failed to load collections.");
    } finally {
      setCollectionsLoading(false);
    }
  };

  const loadQuestions = async (collectionId: number) => {
    setQuestionsLoading(true);
    try {
      const data = await questionBankService.getAll(collectionId);
      setQuestions(data);
    } catch {
      toast.error("Failed to load questions.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const openCollection = (c: QuizBankCollection) => setActiveCollection(c);
  const backToCollections = () => {
    setActiveCollection(null);
    setQuestions([]);
  };

  const startCreateCollection = () => {
    setCollectionDraft({ name: "", description: "" });
    setCollectionModalMode("new");
  };

  const startRenameCollection = (c: QuizBankCollection) => {
    setCollectionDraft({ name: c.name, description: c.description ?? "" });
    setCollectionModalMode(c);
  };

  const cancelCollectionModal = () => setCollectionModalMode(null);

  const saveCollection = async () => {
    if (!collectionDraft.name.trim()) {
      toast.warning("Enter a collection name first.");
      return;
    }
    setSavingCollection(true);
    try {
      if (collectionModalMode === "new") {
        await quizBankCollectionService.create(collectionDraft);
        toast.success("Collection created.");
      } else if (collectionModalMode) {
        const updated = await quizBankCollectionService.update(
          collectionModalMode.id,
          collectionDraft,
        );
        toast.success("Collection renamed.");
        if (activeCollection?.id === updated.id) setActiveCollection(updated);
      }
      setCollectionModalMode(null);
      loadCollections();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the collection.",
      );
    } finally {
      setSavingCollection(false);
    }
  };

  const removeCollection = async (c: QuizBankCollection) => {
    if (
      !window.confirm(
        `Delete "${c.name}"? This deletes all ${c.questionCount} question(s) inside it and removes them from any quiz that uses them.`,
      )
    )
      return;
    try {
      const result = await quizBankCollectionService.delete(c.id);
      toast.success(
        result.quizzesAffected > 0
          ? `Deleted. Removed from ${result.quizzesAffected} quiz(zes).`
          : "Deleted.",
      );
      if (activeCollection?.id === c.id) backToCollections();
      loadCollections();
    } catch {
      toast.error("Failed to delete the collection.");
    }
  };

  const startCreate = () => {
    if (!activeCollection) return;
    setDraft(emptyDraft("multiple_choice", activeCollection.id));
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
      collectionId: q.collectionId,
    });
    setEditingId(q.id);
  };

  const cancelEdit = () => setEditingId(null);

  const changeType = (type: QuizQuestionType) => {
    setDraft((prev) => ({
      ...emptyDraft(type, prev.collectionId),
      question: prev.question,
      explanation: prev.explanation,
      imageUrl: prev.imageUrl,
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
        toast.success("Question added to the collection.");
      } else if (typeof editingId === "number") {
        await questionBankService.update(editingId, draft);
        toast.success("Question updated.");
      }
      setEditingId(null);
      if (activeCollection) loadQuestions(activeCollection.id);
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
      if (activeCollection) loadQuestions(activeCollection.id);
      loadCollections();
    } catch {
      toast.error("Failed to delete the question.");
    }
  };

  if (!activeCollection) {
    return (
      <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-4xl text-gray-900 dark:text-white">
              Question Bank
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Collections of reusable questions. Any quiz can pull from any
              collection.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
              <button
                onClick={() => changeViewMode("list")}
                className={`p-2.5 rounded ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
                aria-label="List view"
              >
                <ListIcon size={24} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => changeViewMode("grid")}
                className={`p-2.5 rounded ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={24} strokeWidth={1.5} />
              </button>
            </div>
            <button
              onClick={startCreateCollection}
              className="flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
            >
              <Plus size={20} />
              New Collection
            </button>
          </div>
        </div>

        {collectionsLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <CollectionGridCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-800">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <CollectionListItemSkeleton key={i} />
              ))}
            </div>
          )
        ) : collections.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No collections yet. Create one to start adding questions.
          </p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => (
              <div
                key={c.id}
                className="rounded-lg bg-white dark:bg-gray-800 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="h-1.5"
                  style={{ backgroundColor: colorForCollection(c.id) }}
                />
                <div
                  onClick={() => openCollection(c)}
                  className="p-5 flex-1 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ backgroundColor: colorForCollection(c.id) }}
                    >
                      {(c.name.trim().charAt(0) || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {c.name}
                      </h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {c.questionCount} question
                        {c.questionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <button
                    onClick={() => startRenameCollection(c)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Rename"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => removeCollection(c)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-800">
            {collections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: colorForCollection(c.id) }}
                >
                  {(c.name.trim().charAt(0) || "?").toUpperCase()}
                </div>
                <div
                  onClick={() => openCollection(c)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {c.name}
                  </p>
                  {c.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {c.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:inline">
                  {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startRenameCollection(c)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Rename"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => removeCollection(c)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {collectionModalMode !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {collectionModalMode === "new"
                    ? "New Collection"
                    : "Rename Collection"}
                </h2>
                <button
                  onClick={cancelCollectionModal}
                  className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={collectionDraft.name}
                onChange={(e) =>
                  setCollectionDraft((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Grade 5 Science — Weather Unit"
              />

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Description (optional)
              </label>
              <textarea
                value={collectionDraft.description}
                onChange={(e) =>
                  setCollectionDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={2}
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelCollectionModal}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCollection}
                  disabled={savingCollection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  {savingCollection ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-4xl text-gray-900 dark:text-white">
            {activeCollection.name}
          </h3>
          {activeCollection.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeCollection.description}
            </p>
          )}
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>

      {questionsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <BankQuestionSkeleton key={i} />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No questions in this collection yet.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-lg bg-white dark:bg-gray-800 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
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
      )}

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
