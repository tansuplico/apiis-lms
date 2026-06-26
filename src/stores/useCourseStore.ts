// src/stores/useCourseStore.ts
import { create } from "zustand";
import {
  Course,
  CoursePart,
  ModuleFile,
  ModuleVideo,
  QuizQuestion,
} from "@/types/types";
import { courseService } from "@/services/courseService";
import { toast } from "react-toastify";
import { getLocalCourses } from "@/services/syncService";
import { isOnline } from "@/services/networkStatus";
import { videoService } from "@/services/videoService";
import { fileService } from "@/services/fileService";

interface CourseStore {
  courses: Course[];
  isLoading: boolean;

  fetchCourses: () => Promise<boolean>;
  addCourse: (data: Omit<Course, "id" | "modules">) => Promise<void>;
  updateCourse: (id: number, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: number) => Promise<void>;
  updateCourseField: (
    courseId: number,
    field: keyof Course,
    value: any,
  ) => Promise<void>;
  addModule: (courseId: number, title?: string) => Promise<void>;
  updateModule: (
    courseId: number,
    moduleId: number,
    data: { title?: string; weight?: number | null },
  ) => Promise<void>;
  deleteModule: (courseId: number, moduleId: number) => Promise<void>;
  addPart: (
    courseId: number,
    moduleId: number,
    data: {
      slug: string;
      name: string;
      coverColor?: string;
      content?: string;
    },
  ) => Promise<void>;
  updatePart: (
    courseId: number,
    moduleId: number,
    partId: number,
    data: Partial<CoursePart>,
  ) => Promise<void>;
  deletePart: (
    courseId: number,
    moduleId: number,
    partId: number,
  ) => Promise<void>;
  updateQuizQuestions: (
    courseId: number,
    moduleId: number,
    partId: number,
    questions: QuizQuestion[],
  ) => Promise<void>;
  reorderPart: (
    courseId: number,
    moduleId: number,
    partId: number,
    direction: "up" | "down",
  ) => Promise<void>;
  uploadVideo: (
    courseId: number,
    moduleId: number,
    file: File,
    title: string,
  ) => Promise<void>;
  deleteVideo: (
    courseId: number,
    moduleId: number,
    videoId: number,
  ) => Promise<void>;
  uploadFile: (
    courseId: number,
    moduleId: number,
    file: File,
    title: string,
  ) => Promise<void>;
  deleteFile: (
    courseId: number,
    moduleId: number,
    fileId: number,
  ) => Promise<void>;
}

export const useCourseStore = create<CourseStore>()((set, _get) => ({
  // ── State
  courses: [],
  isLoading: false,

  // ── Actions: fetch courses
  fetchCourses: async (): Promise<boolean> => {
    set({ isLoading: true });
    try {
      if (!isOnline()) {
        const courses = await getLocalCourses();
        set({ courses });
        return false; // came from cache, not a fresh server sync
      }
      const courses = await courseService.getAll();
      set({ courses });
      return true;
    } catch (err: any) {
      if (!isOnline()) {
        try {
          const courses = await getLocalCourses();
          if (courses.length > 0) {
            set({ courses });
            toast.warn(
              "Could not reach server. Showing cached course content.",
            );
            return false;
          }
        } catch {
          // SQLite also failed — nothing to show
        }
      }
      toast.error(err.message ?? "Failed to fetch courses.");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: course CRUD
  addCourse: async (courseData) => {
    try {
      const response = await courseService.create(courseData);

      const fullCourse = await courseService.getById(response.id);

      set((state) => ({
        courses: [fullCourse, ...state.courses],
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create course.");
    }
  },

  updateCourse: async (id, data) => {
    try {
      await courseService.update(id, data);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === id ? { ...c, ...data } : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update course.");
      throw err;
    }
  },

  deleteCourse: async (courseId: number) => {
    try {
      await courseService.delete(courseId);
      set((state) => ({
        courses: state.courses.filter((c) => c.id !== courseId),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete course.");
    }
  },

  updateCourseField: async (courseId, field, value) => {
    try {
      await courseService.update(courseId, { [field]: value });

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, [field]: value } : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update course.");
      throw err;
    }
  },

  // ── Actions: module management
  addModule: async (courseId, title) => {
    try {
      const newModule = await courseService.addModule(courseId, title);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, modules: [...c.modules, newModule] } : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add module.");
      throw err;
    }
  },

  updateModule: async (courseId, moduleId, data) => {
    try {
      await courseService.updateModule(courseId, moduleId, data);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId ? { ...m, ...data } : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update module.");
      throw err;
    }
  },

  deleteModule: async (courseId, moduleId) => {
    try {
      await courseService.deleteModule(courseId, moduleId);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules
                  .filter((m) => m.id !== moduleId)
                  // ← renumber remaining modules
                  .map((m, index) => ({ ...m, number: index + 1 })),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete module.");
      throw err;
    }
  },

  // ── Actions: part management
  addPart: async (courseId, moduleId, data) => {
    try {
      const newPart = await courseService.addPart(courseId, moduleId, data);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? { ...m, parts: [...m.parts, newPart] }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add part.");
      throw err;
    }
  },

  updatePart: async (courseId, moduleId, partId, data) => {
    try {
      await courseService.updatePart(courseId, moduleId, partId, data);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        parts: m.parts.map((p) =>
                          p.id === partId ? { ...p, ...data } : p,
                        ),
                      }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update part.");
      throw err;
    }
  },

  deletePart: async (courseId, moduleId, partId) => {
    try {
      await courseService.deletePart(courseId, moduleId, partId);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        parts: m.parts.filter((p) => p.id !== partId),
                      }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete part.");
      throw err;
    }
  },

  // ── Actions: quiz management
  updateQuizQuestions: async (courseId, moduleId, partId, questions) => {
    try {
      await courseService.updateQuizQuestions(
        courseId,
        moduleId,
        partId,
        questions,
      );

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        parts: m.parts.map((p) =>
                          p.id === partId
                            ? { ...p, quizQuestions: questions }
                            : p,
                        ),
                      }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update quiz.");
      throw err;
    }
  },

  // ── Actions: reorder parts
  reorderPart: async (
    courseId: number,
    moduleId: number,
    partId: number,
    direction: "up" | "down",
  ) => {
    try {
      await courseService.reorderPart(courseId, moduleId, partId, direction);
      set((state) => ({
        courses: state.courses.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            modules: c.modules.map((m) => {
              if (m.id !== moduleId) return m;
              const parts = [...m.parts].sort((a, b) => a.order - b.order);
              const idx = parts.findIndex((p) => p.id === partId);
              if (idx === -1) return m;

              const swapIdx = direction === "up" ? idx - 1 : idx + 1;
              if (swapIdx < 0 || swapIdx >= parts.length) return m;

              // ← swap orders
              const temp = parts[idx].order;
              parts[idx] = { ...parts[idx], order: parts[swapIdx].order };
              parts[swapIdx] = { ...parts[swapIdx], order: temp };

              return { ...m, parts: parts.sort((a, b) => a.order - b.order) };
            }),
          };
        }),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reorder part.");
      throw err;
    }
  },

  // ── Actions: video management
  uploadVideo: async (courseId, moduleId, file, title) => {
    try {
      const newVideo: ModuleVideo = await videoService.upload(
        moduleId,
        file,
        title,
      );

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? { ...m, videos: [...(m.videos ?? []), newVideo] }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload video.");
      throw err;
    }
  },

  deleteVideo: async (courseId, moduleId, videoId) => {
    try {
      await videoService.delete(videoId);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        videos: (m.videos ?? []).filter(
                          (v) => v.id !== videoId,
                        ),
                      }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete video.");
      throw err;
    }
  },

  // ── Actions: file management
  uploadFile: async (courseId, moduleId, file, title) => {
    try {
      const newFile: ModuleFile = await fileService.upload(
        moduleId,
        file,
        title,
      );

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? { ...m, files: [...(m.files ?? []), newFile] }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload file.");
      throw err;
    }
  },

  deleteFile: async (courseId, moduleId, fileId) => {
    try {
      await fileService.delete(fileId);

      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                modules: c.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        files: (m.files ?? []).filter((f) => f.id !== fileId),
                      }
                    : m,
                ),
              }
            : c,
        ),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete file.");
      throw err;
    }
  },
}));
