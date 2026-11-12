// src/components/shared/CategoryTagInput.tsx
import { useState } from "react";
import { X } from "lucide-react";

// Mirror MAX_CATEGORIES_PER_QUESTION / MAX_CATEGORY_LENGTH in
// backend/src/utils/quizQuestions.ts, which is what actually enforces them.
const DEFAULT_MAX_TAGS = 5;
const DEFAULT_MAX_LENGTH = 30;
const MAX_SUGGESTIONS = 6;

interface CategoryTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Category names already in use elsewhere, offered as the person types. */
  suggestions?: string[];
  maxTags?: number;
  maxLength?: number;
  disabled?: boolean;
}

export default function CategoryTagInput({
  value,
  onChange,
  suggestions = [],
  maxTags = DEFAULT_MAX_TAGS,
  maxLength = DEFAULT_MAX_LENGTH,
  disabled = false,
}: CategoryTagInputProps) {
  // ── State
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const atLimit = value.length >= maxTags;
  const has = (tags: string[], tag: string) =>
    tags.some((t) => t.toLowerCase() === tag.toLowerCase());

  // ── Derived: suggestions that match what's typed and aren't already added
  const query = text.trim().toLowerCase();
  const matches = suggestions
    .filter(
      (s) =>
        !has(value, s) && (query === "" || s.toLowerCase().includes(query)),
    )
    .slice(0, MAX_SUGGESTIONS);

  // Adds one or more tags (commas separate them), skipping empties, case-
  // insensitive duplicates and anything past the limit.
  const addTags = (raw: string) => {
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = part.replace(/\s+/g, " ").trim().slice(0, maxLength);
      if (!tag || next.length >= maxTags || has(next, tag)) continue;
      next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
    setText("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTags(text);
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              aria-label={`Remove ${tag}`}
              className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/50"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (text.trim()) addTags(text);
          }}
          disabled={disabled || atLimit}
          placeholder={
            atLimit
              ? "Category limit reached"
              : value.length === 0
                ? "Type a category and press Enter"
                : "Add another..."
          }
          aria-label="Add a category"
          className="flex-1 min-w-32 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {focused && !atLimit && matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="Existing categories"
          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden py-1"
        >
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                // mousedown would blur the input first and hide this list
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTags(s)}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Up to {maxTags} categories, {maxLength} characters each. Press Enter or
        a comma to add one.
      </p>
    </div>
  );
}
