// src/utils/shuffle.ts
//
// Generic Fisher-Yates shuffle. Used to randomize per-student quiz question
// order (see pages/students/CourseQuiz.tsx). Always returns a new array —
// never mutates the input — so it's safe to call directly on state/props.
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
