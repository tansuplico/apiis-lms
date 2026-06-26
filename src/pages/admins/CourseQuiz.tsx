// src/pages/students/CourseQuiz.tsx
import { useParams, useOutletContext } from "react-router-dom";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { Course, QuizQuestion, QuizQuestionType } from "@/types/types";

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
};

const defaultQuestion = (type: QuizQuestionType): QuizQuestion => {
  const base = { id: Date.now(), type, question: "", explanation: "" };
  if (type === "multiple_choice") {
    return { ...base, options: ["", "", "", ""], correctOptionIndex: 0 };
  }
  return { ...base, correctAnswer: "" };
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
    Record<number, string | number>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

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
  const handleAnswerSelect = (questionId: number, value: string | number) => {
    if (submitted) return;
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitAnswers = () => {
    if (Object.keys(studentAnswers).length < questions.length) {
      toast.warning("Please answer all questions before submitting.");
      return;
    }

    let correctCount = 0;
    questions.forEach((q) => {
      const answer = studentAnswers[q.id];
      if (q.type === "multiple_choice") {
        if (answer === q.correctOptionIndex) correctCount++;
      } else {
        // case-insensitive match for text types
        const correct = q.correctAnswer?.trim().toLowerCase();
        const given = String(answer).trim().toLowerCase();
        if (correct && given === correct) correctCount++;
      }
    });

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

  const changeQuestionType = (id: number, newType: QuizQuestionType) => {
    if (!setQuizQuestions) return;
    setQuizQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (newType === "multiple_choice") {
          return {
            id: q.id,
            type: newType,
            question: q.question,
            explanation: q.explanation,
            options: ["", "", "", ""],
            correctOptionIndex: 0,
          };
        }
        return {
          id: q.id,
          type: newType,
          question: q.question,
          explanation: q.explanation,
          correctAnswer: "",
        };
      }),
    );
  };

  const isCorrect = (q: QuizQuestion) => {
    const answer = studentAnswers[q.id];
    if (q.type === "multiple_choice") return answer === q.correctOptionIndex;
    return (
      String(answer).trim().toLowerCase() ===
      q.correctAnswer?.trim().toLowerCase()
    );
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
              questions.map((q, idx) => (
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

                  {/* Identification / fill in the blank correct answer */}
                  {(q.type === "identification" ||
                    q.type === "fill_in_the_blank") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Correct Answer
                      </label>
                      <input
                        type="text"
                        value={q.correctAnswer ?? ""}
                        onChange={(e) =>
                          updateQuestion(q.id, "correctAnswer", e.target.value)
                        }
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder={
                          q.type === "identification"
                            ? "e.g. Paris"
                            : "e.g. Paris (exact answer, case insensitive)"
                        }
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Graded by exact match, case insensitive.
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
              ))
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
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}
                    >
                      {QUESTION_TYPE_LABELS[q.type ?? "multiple_choice"]}
                    </span>

                    <p className="font-medium text-gray-900 dark:text-white">
                      Question {idx + 1}: {q.question}
                    </p>

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
                              : `✗ Correct answer: ${q.correctAnswer}`}
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
    </div>
  );
}
