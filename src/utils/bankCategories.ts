// src/utils/bankCategories.ts
// Category-tag helpers shared by the Question Bank page and the quiz
// editor's bank picker.

export interface CategoryOption {
  key: string; // lower-cased tag, used as the filter value
  name: string; // first spelling seen, used as the label
  count: number;
}

// Tags present on the given questions, merged case-insensitively and
// sorted by name, with how many questions carry each one.
export function collectCategories(
  questions: { categories?: string[] }[],
): CategoryOption[] {
  const byKey = new Map<string, CategoryOption>();
  for (const q of questions) {
    for (const tag of q.categories ?? []) {
      const key = tag.toLowerCase();
      const entry = byKey.get(key);
      if (entry) entry.count++;
      else byKey.set(key, { key, name: tag, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Whether a question carries the tag with this key; "all" matches any.
export function hasCategory(
  q: { categories?: string[] },
  key: string,
): boolean {
  return (
    key === "all" || (q.categories ?? []).some((c) => c.toLowerCase() === key)
  );
}
