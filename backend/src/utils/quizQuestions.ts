// src/utils/quizQuestions.ts
//
// Shared logic for quiz questions, used by both courseController's
// direct quiz editor (quiz_questions table) and questionBankController's
// reusable question bank (question_bank table). Keeping validation and
// question_data serialization in one place means a new question type only
// has to be taught here, not duplicated across two controllers.
import pool from "../config/db";

export const MAX_QUIZ_OPTIONS = 6;
export const MAX_MATCHING_PAIRS = 6;
export const MAX_IDENTIFICATION_ANSWERS = 10;
// Question images are embedded as base64 data URIs (same pattern as course
// content images), not just http(s)/api URLs — hence the separate regex.
export const QUESTION_IMAGE_REGEX =
  /^(https?:\/\/.+|\/api\/.+|data:image\/(jpeg|png|webp|gif);base64,.+)/;
export const MAX_QUESTION_IMAGE_SIZE = 1.5 * 1024 * 1024; // base64 string length

/**
 * Validates a single question object (from the quiz editor or the bank
 * form). Returns an error message string if invalid, or null if valid.
 */
export function validateQuestionShape(q: any, index: number): string | null {
  const label = `Question ${index + 1}`;
  const type = q.type ?? "multiple_choice";

  if (
    ![
      "multiple_choice",
      "identification",
      "fill_in_the_blank",
      "true_false",
      "matching",
    ].includes(type)
  ) {
    return `${label} has an invalid type.`;
  }

  if (!q.question?.trim()) {
    return `${label} is missing question text.`;
  }

  if (q.imageUrl !== undefined && q.imageUrl !== null) {
    if (
      typeof q.imageUrl !== "string" ||
      !QUESTION_IMAGE_REGEX.test(q.imageUrl)
    ) {
      return `${label} has an invalid image URL.`;
    }
    if (q.imageUrl.length > MAX_QUESTION_IMAGE_SIZE) {
      return `${label}'s image is too large.`;
    }
  }

  if (type === "multiple_choice") {
    if (
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > MAX_QUIZ_OPTIONS
    ) {
      return `${label} must have between 2 and ${MAX_QUIZ_OPTIONS} options.`;
    }
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j]?.trim()) {
        return `${label}, option ${j + 1} cannot be empty.`;
      }
    }
    if (
      typeof q.correctOptionIndex !== "number" ||
      q.correctOptionIndex < 0 ||
      q.correctOptionIndex >= q.options.length
    ) {
      return `${label} has an invalid correct option index.`;
    }
  } else if (type === "identification") {
    if (
      !Array.isArray(q.correctAnswers) ||
      q.correctAnswers.length < 1 ||
      q.correctAnswers.length > MAX_IDENTIFICATION_ANSWERS
    ) {
      return `${label} must have between 1 and ${MAX_IDENTIFICATION_ANSWERS} accepted answers.`;
    }
    for (let j = 0; j < q.correctAnswers.length; j++) {
      if (!q.correctAnswers[j]?.trim()) {
        return `${label}, accepted answer ${j + 1} cannot be empty.`;
      }
    }
  } else if (type === "true_false") {
    if (typeof q.correctBoolean !== "boolean") {
      return `${label} must have a true/false correct answer.`;
    }
  } else if (type === "matching") {
    if (
      !Array.isArray(q.matchingPairs) ||
      q.matchingPairs.length < 2 ||
      q.matchingPairs.length > MAX_MATCHING_PAIRS
    ) {
      return `${label} must have between 2 and ${MAX_MATCHING_PAIRS} matching pairs.`;
    }
    for (let j = 0; j < q.matchingPairs.length; j++) {
      const pair = q.matchingPairs[j];
      if (!pair?.left?.trim() || !pair?.right?.trim()) {
        return `${label}, matching pair ${j + 1} must have both sides filled in.`;
      }
    }
  } else {
    // fill_in_the_blank
    if (!q.correctAnswer?.trim()) {
      return `${label} is missing a correct answer.`;
    }
    if (!q.question.includes("___")) {
      return `${label} must contain ___ to mark the blank.`;
    }
  }

  return null;
}

/** Builds the question_data JSON to persist, trimming/normalizing per type. */
export function buildQuestionData(q: any): Record<string, unknown> {
  const type = q.type ?? "multiple_choice";

  let typeFields: Record<string, unknown>;
  if (type === "multiple_choice") {
    typeFields = {
      options: q.options.map((o: string) => o.trim()),
      correctOptionIndex: q.correctOptionIndex,
    };
  } else if (type === "identification") {
    typeFields = {
      correctAnswers: q.correctAnswers.map((a: string) => a.trim()),
    };
  } else if (type === "true_false") {
    typeFields = { correctBoolean: q.correctBoolean };
  } else if (type === "matching") {
    typeFields = {
      matchingPairs: q.matchingPairs.map(
        (p: { left: string; right: string }) => ({
          left: p.left.trim(),
          right: p.right.trim(),
        }),
      ),
    };
  } else {
    typeFields = { correctAnswer: q.correctAnswer.trim() };
  }

  return {
    type,
    question: q.question.trim(),
    ...(q.imageUrl?.trim() ? { imageUrl: q.imageUrl.trim() } : {}),
    ...typeFields,
    explanation: q.explanation?.trim() || null,
  };
}

/** Maps a raw question_data JSONB blob back into the frontend QuizQuestion shape. */
export function mapQuestionData(
  id: number,
  questionData: any,
  bankQuestionId?: number,
) {
  return {
    id,
    type: questionData.type ?? "multiple_choice",
    question: questionData.question,
    imageUrl: questionData.imageUrl,
    options: questionData.options,
    correctOptionIndex: questionData.correctOptionIndex,
    correctAnswer: questionData.correctAnswer,
    correctAnswers: questionData.correctAnswers,
    correctBoolean: questionData.correctBoolean,
    matchingPairs: questionData.matchingPairs,
    explanation: questionData.explanation,
    ...(bankQuestionId ? { bankQuestionId } : {}),
  };
}

export type MergedQuestionRow = {
  id: number;
  part_id: number;
  question_data: any;
  order_num: number;
  bank_question_id?: number;
};

/**
 * Fetches questions for one or more course parts, merging directly-authored
 * quiz_questions with bank-referenced questions (via quiz_bank_refs), in a
 * single combined order per part. Used by both the course/quiz GET
 * endpoints and progress grading, so the order a student sees a quiz in and
 * the order grading uses always agree.
 */
export async function getMergedQuizQuestions(
  partIds: number[],
  client: Pick<typeof pool, "query"> = pool,
): Promise<Map<number, MergedQuestionRow[]>> {
  const merged = new Map<number, MergedQuestionRow[]>();
  for (const partId of partIds) merged.set(partId, []);
  if (partIds.length === 0) return merged;

  const [directResult, bankResult] = await Promise.all([
    client.query(
      `SELECT id, part_id, question_data, COALESCE(order_num, id) AS order_num
       FROM quiz_questions WHERE part_id = ANY($1::int[])`,
      [partIds],
    ),
    client.query(
      `SELECT qbr.id, qbr.part_id, qb.id AS bank_question_id, qb.question_data, qbr.order_num
       FROM quiz_bank_refs qbr
       JOIN question_bank qb ON qb.id = qbr.bank_question_id
       WHERE qbr.part_id = ANY($1::int[])`,
      [partIds],
    ),
  ]);

  for (const row of directResult.rows) {
    merged.get(row.part_id)?.push(row);
  }
  for (const row of bankResult.rows) {
    merged.get(row.part_id)?.push(row);
  }

  for (const rows of merged.values()) {
    rows.sort((a, b) => a.order_num - b.order_num || a.id - b.id);
  }

  return merged;
}
