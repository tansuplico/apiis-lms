// src/pages/students/CourseQuiz.tsx
import { useOutletContext } from "react-router-dom";
import { Course, QuizQuestionType } from "@/types/types";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  Gem,
} from "lucide-react";
import { toast } from "react-toastify";
import { useStudentStore } from "@/stores/useStudentStore";
import { useNextPart } from "@/hooks/useNextPart";

const COIN_REWARDS_BY_DIFFICULTY: Record<string, number> = {
  Beginner: 5,
  Moderate: 10,
  Intermediate: 20,
  Advanced: 30,
  Expert: 50,
  "All Levels": 15,
};

const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_in_the_blank: "Fill in the Blank",
};

export default function CourseQuiz() {
  // ── Store & hooks
  const { course } = useOutletContext<{ course: Course }>();
  const { goToNext, hasNext, currentPartSlug } = useNextPart(course);
  const { completePart, currentStudent, saveQuizAnswers } = useStudentStore();

  // ── Derived: module & quiz
  const modNum =
    Number(window.location.pathname.match(/module-(\d+)/)?.[1]) || 1;
  const currentModule = course.modules.find((m) => m.number === modNum);
  const quizPart = currentModule?.parts.find((p) => p.slug === "quiz");
  const questions = quizPart?.quizQuestions ?? [];

  const alreadyCompleted =
    currentStudent?.courseProgress[course.id]?.completedParts.includes(
      currentPartSlug ?? "",
    ) ?? false;

  const quizKey = `${modNum}:quiz`;
  const alreadyCompletedQuiz =
    currentStudent?.courseProgress[course.id]?.completedParts.includes(
      quizKey,
    ) ?? false;

  const savedAnswers =
    currentStudent?.courseProgress[course.id]?.quizAnswers?.[modNum] ?? {};

  const restoredScore = questions.filter((q, idx) => {
    const saved = savedAnswers[idx];
    const type = q.type ?? "multiple_choice";
    if (type === "multiple_choice") {
      return saved === q.correctOptionIndex;
    }
    return (
      String(saved ?? "")
        .trim()
        .toLowerCase() === q.correctAnswer?.trim().toLowerCase()
    );
  }).length;

  const restoredCoins = (() => {
    if (!alreadyCompletedQuiz || questions.length === 0) return 0;
    const coins = COIN_REWARDS_BY_DIFFICULTY[course.level] ?? 5;
    return Math.round((restoredScore / questions.length) * coins);
  })();

  // ── State
  const [marked, setMarked] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<
    Record<number, number | string>
  >(alreadyCompletedQuiz ? savedAnswers : {});
  const [submitted, setSubmitted] = useState(alreadyCompletedQuiz);
  const [score, setScore] = useState(alreadyCompletedQuiz ? restoredScore : 0);
  const [earnedCoins, setEarnedCoins] = useState(
    alreadyCompletedQuiz ? restoredCoins : 0,
  );
  const [alreadyClaimed, setAlreadyClaimed] = useState(alreadyCompletedQuiz);

  const allAnswered = Object.keys(studentAnswers).length === questions.length;
  const percentage =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // ── Guards
  if (!currentModule || !quizPart) {
    return (
      <div className="p-10 text-center text-red-600 dark:text-red-400">
        Quiz not found
      </div>
    );
  }

  // ── Handlers
  const isCorrectAnswer = (qIndex: number, type: QuizQuestionType) => {
    const q = questions[qIndex];
    if (!q) return false;
    const answer = studentAnswers[qIndex];
    if (type === "multiple_choice") return answer === q.correctOptionIndex;
    return (
      String(answer ?? "")
        .trim()
        .toLowerCase() === q.correctAnswer?.trim().toLowerCase()
    );
  };

  const handleAnswerSelect = (
    questionIndex: number,
    value: number | string,
  ) => {
    if (submitted) return;
    setStudentAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = async () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const type = q.type ?? "multiple_choice";
      if (type === "multiple_choice") {
        if (studentAnswers[idx] === q.correctOptionIndex) correctCount++;
      } else {
        const correct = q.correctAnswer?.trim().toLowerCase();
        const given = String(studentAnswers[idx] ?? "")
          .trim()
          .toLowerCase();
        if (correct && given === correct) correctCount++;
      }
    });

    const coins = COIN_REWARDS_BY_DIFFICULTY[course.level] ?? 5;
    const earned = Math.round((correctCount / questions.length) * coins);

    setScore(correctCount);
    setSubmitted(true);

    if (!alreadyClaimed) {
      setEarnedCoins(earned);
      await saveQuizAnswers(course.id, modNum, studentAnswers);
      await completePart(course.id, "quiz", modNum);
      setAlreadyClaimed(true);
    } else {
      setEarnedCoins(0);
      await saveQuizAnswers(course.id, modNum, studentAnswers);
      toast.info(
        `Quiz retaken! You scored ${correctCount}/${questions.length}. No additional coins awarded.`,
      );
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStudentAnswers({});
    setScore(0);
    setEarnedCoins(0);
  };

  const handleNext = () => {
    if (!alreadyCompleted && !marked) {
      completePart(course.id, currentPartSlug!, modNum);
      setMarked(true);
      toast.success("Part completed! Progress saved.");
    }
    goToNext();
  };

  // ── Render
  return (
    <div className="text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        Knowledge Check Quiz
      </h2>
      <p className="text-lg leading-relaxed mb-8 text-gray-700 dark:text-gray-300">
        {quizPart.content}
      </p>

      <div className="mt-8 p-6 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-300">
            Test What You've Learned
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium">
            <Gem size={16} strokeWidth={1.6} />
            <span>
              Up to {COIN_REWARDS_BY_DIFFICULTY[course.level] ?? 5} gems
            </span>
          </div>
        </div>

        {questions.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No quiz questions yet.
          </p>
        ) : (
          <div className="space-y-8">
            {questions.map((q, idx) => {
              const type = q.type ?? "multiple_choice";
              const studentAnswer = studentAnswers[idx];
              const correct = isCorrectAnswer(idx, type);

              return (
                <div key={q.id}>
                  {/* question type badge */}
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
                      type === "multiple_choice"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : type === "identification"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    }`}
                  >
                    {QUESTION_TYPE_LABELS[type]}
                  </span>

                  <p className="font-semibold mb-3 text-gray-900 dark:text-white">
                    {idx + 1}.{" "}
                    {type !== "fill_in_the_blank" ? q.question : null}
                  </p>

                  {/* Multiple Choice */}
                  {type === "multiple_choice" && (
                    <ul className="space-y-2">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = studentAnswer === optIdx;
                        const isCorrectOption = optIdx === q.correctOptionIndex;

                        let optionStyle =
                          "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
                        if (submitted) {
                          if (isCorrectOption)
                            optionStyle =
                              "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200";
                          else if (isSelected && !isCorrectOption)
                            optionStyle =
                              "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200";
                        } else if (isSelected) {
                          optionStyle =
                            "border-blue-500 bg-blue-50 dark:bg-blue-900/30";
                        }

                        return (
                          <li
                            key={optIdx}
                            onClick={() => handleAnswerSelect(idx, optIdx)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${optionStyle} ${
                              !submitted
                                ? "hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${idx}`}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(idx, optIdx)}
                              className="text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                              disabled={submitted}
                            />
                            <span className="flex-1 text-sm">{opt}</span>
                            {submitted && isCorrectOption && (
                              <CheckCircle
                                size={18}
                                className="text-green-500 shrink-0"
                              />
                            )}
                            {submitted && isSelected && !isCorrectOption && (
                              <XCircle
                                size={18}
                                className="text-red-500 shrink-0"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Identification */}
                  {type === "identification" && (
                    <div>
                      <input
                        type="text"
                        value={String(studentAnswer ?? "")}
                        onChange={(e) =>
                          handleAnswerSelect(idx, e.target.value)
                        }
                        disabled={submitted}
                        placeholder="Type your answer..."
                        className={`w-full p-3 border rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          submitted
                            ? correct
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      {submitted && (
                        <p
                          className={`text-sm mt-1 font-medium ${correct ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                        >
                          {correct
                            ? "✓ Correct!"
                            : `✗ Correct answer: ${q.correctAnswer}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Fill in the Blank */}
                  {type === "fill_in_the_blank" && (
                    <div>
                      <div className="flex items-center flex-wrap gap-1 text-gray-900 dark:text-white font-semibold mb-3">
                        {q.question.split("___").map((part, i, arr) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1"
                          >
                            <span>{part}</span>
                            {i < arr.length - 1 && (
                              <input
                                type="text"
                                value={String(studentAnswer ?? "")}
                                onChange={(e) =>
                                  handleAnswerSelect(idx, e.target.value)
                                }
                                disabled={submitted}
                                placeholder="______"
                                className={`w-32 px-2 py-0.5 border-b-2 bg-transparent focus:outline-none text-center transition-colors ${
                                  submitted
                                    ? correct
                                      ? "border-green-500 text-green-600 dark:text-green-400"
                                      : "border-red-500 text-red-500 dark:text-red-400"
                                    : "border-gray-400 dark:border-gray-500 focus:border-blue-500"
                                }`}
                              />
                            )}
                          </span>
                        ))}
                      </div>
                      {submitted && (
                        <p
                          className={`text-sm font-medium ${correct ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                        >
                          {correct
                            ? "✓ Correct!"
                            : `✗ Correct answer: ${q.correctAnswer}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* explanation */}
                  {submitted && q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                        💡 {q.explanation}
                      </p>
                    </div>
                  )}

                  {/* correct/incorrect label for MC */}
                  {submitted && type === "multiple_choice" && (
                    <p
                      className={`text-sm font-medium mt-2 ${correct ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {correct ? "✓ Correct" : "✗ Incorrect"}
                    </p>
                  )}
                </div>
              );
            })}

            {/* submit / result actions */}
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="w-full py-3 mt-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200"
              >
                {allAnswered
                  ? "Submit Answers"
                  : `Answer all questions (${Object.keys(studentAnswers).length}/${questions.length})`}
              </button>
            ) : (
              <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-4">
                <Trophy size={40} className="mx-auto text-amber-500" />
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {score} / {questions.length}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {percentage}% correct
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-amber-600 dark:text-amber-400">
                  <Gem size={22} strokeWidth={1.6} />
                  <span>+{earnedCoins} gems earned</span>
                </div>

                {alreadyClaimed && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Coins already claimed — retrying won't award more.
                  </p>
                )}

                <div className="flex justify-center items-center gap-10">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200"
                  >
                    <RotateCcw size={16} />
                    Try Again
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200"
                  >
                    {hasNext ? (
                      <>
                        Next Part
                        <ArrowRight size={18} />
                      </>
                    ) : (
                      "Finish Course"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
