// src/stores/useStudentProgressCache.ts
import { create } from "zustand";
import { CourseProgress } from "@/types/types";

// ── Store type
interface StudentProgressCache {
  cache: Record<number, Record<number, CourseProgress>>;
  gradebookCache: Record<string, any>;
  setProgress: (
    studentId: number,
    progress: Record<number, CourseProgress>,
  ) => void;
  getProgress: (studentId: number) => Record<number, CourseProgress> | null;
  setGradebook: (studentId: number, courseId: number, data: any) => void;
  getGradebook: (studentId: number, courseId: number) => any | null;
}

// ── Store
export const useStudentProgressCache = create<StudentProgressCache>()(
  (set, get) => ({
    // ── State
    cache: {},
    gradebookCache: {},

    // ── Progress cache actions
    setProgress: (studentId, progress) => {
      set((state) => ({
        cache: { ...state.cache, [studentId]: progress },
      }));
    },

    getProgress: (studentId) => get().cache[studentId] ?? null,

    // ── Gradebook cache actions
    setGradebook: (studentId, courseId, data) => {
      const key = `${studentId}-${courseId}`;
      set((state) => ({
        gradebookCache: { ...state.gradebookCache, [key]: data },
      }));
    },

    getGradebook: (studentId, courseId) => {
      const key = `${studentId}-${courseId}`;
      return get().gradebookCache[key] ?? null;
    },
  }),
);
