// src/utils/quizQuestions.ts

export const MAX_QUIZ_OPTIONS = 6;
export const MAX_MATCHING_PAIRS = 6;
export const MAX_IDENTIFICATION_ANSWERS = 10;
export const MAX_CATEGORIES_PER_QUESTION = 5;
export const MAX_CATEGORY_LENGTH = 30;
// Refuse absurd payloads before doing any per-tag work.
const MAX_CATEGORIES_INPUT = 20;
export const QUESTION_IMAGE_REGEX =
  /^(https?:\/\/.+|\/api\/.+|data:image\/(jpeg|png|webp|gif);base64,.+)/;
export const MAX_QUESTION_IMAGE_SIZE = 1.5 * 1024 * 1024;

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
    const blankCount = (q.question.match(/___/g) ?? []).length;
    if (blankCount === 0) {
      return `${label} must contain ___ to mark the blank.`;
    }
    if (blankCount > 1) {
      return `${label} can only have one ___ blank, split this into separate questions.`;
    }
  }

  return null;
}

/**
 * Cleans a bank question's category tags: collapses whitespace, drops empty
 * tags and removes duplicates regardless of case (the first spelling wins).
 * Returns an error message instead if the input isn't a sensible tag list.
 */
export function normalizeCategories(
  input: unknown,
): { categories: string[] } | { error: string } {
  if (input === null || input === undefined) return { categories: [] };
  if (!Array.isArray(input) || input.length > MAX_CATEGORIES_INPUT) {
    return { error: "Categories must be a short list of text tags." };
  }

  const categories: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") {
      return { error: "Categories must be text." };
    }
    const tag = raw
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!tag) continue;
    if (tag.length > MAX_CATEGORY_LENGTH) {
      return {
        error: `Each category can be at most ${MAX_CATEGORY_LENGTH} characters.`,
      };
    }
    if (categories.some((c) => c.toLowerCase() === tag.toLowerCase())) continue;
    categories.push(tag);
  }

  if (categories.length > MAX_CATEGORIES_PER_QUESTION) {
    return {
      error: `A question can have at most ${MAX_CATEGORIES_PER_QUESTION} categories.`,
    };
  }
  return { categories };
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
