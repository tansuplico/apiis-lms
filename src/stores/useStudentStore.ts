// src/stores/useStudentStore.ts
import { create } from "zustand";
import { Student, AccountStatus } from "@/types/types";
import { studentService } from "@/services/studentService";
import { tokenStorage } from "@/services/tokenStorage";
import { toast } from "react-toastify";
import { useShopStore } from "./useShopStore";
import { syncCoursesToLocal } from "@/services/syncService";
import { checkOnline, isOnline } from "@/services/networkStatus";
import { useCourseStore } from "./useCourseStore";
import {
  clearLocalSession,
  loadLocalSession,
  saveLocalSession,
} from "@/services/sessionStorage";
import { useCenterStore } from "./useCenterStore";
import {
  queueCompletePart,
  queueLastVisited,
  queueQuizAnswers,
  syncPendingProgress,
  syncPendingQuizAnswers,
} from "@/services/offlineProgressService";
import { navigateTo } from "@/services/navigationService";
import { ApiError } from "@/services/apiClient";

interface StudentStore {
  currentStudent: Student | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<{ coursesFetched: boolean }>;
  updatePassword: (current: string, newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<Student>) => Promise<boolean>;
  completePart: (
    courseId: number,
    partSlug: string,
    moduleNumber: number,
  ) => Promise<void>;
  updateLastVisited: (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ) => Promise<void>;
  saveQuizAnswers: (
    courseId: number,
    moduleNum: number,
    answers: Record<string, number | string | boolean | string[]>,
  ) => Promise<void>;
  purchaseAccessory: (accessoryId: number, price: number) => Promise<boolean>;
  updateStatus: (status: AccountStatus) => void;
  syncOfflineProgress: () => Promise<void>;
}

export const useStudentStore = create<StudentStore>()((set, get) => ({
  // ── State
  currentStudent: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions: restore session
  restoreSession: async () => {
    try {
      const role = await tokenStorage.getRole();
      if (role !== "student") return { coursesFetched: false };

      const token = await tokenStorage.getToken();
      if (!token) return { coursesFetched: false };

      const payload = JSON.parse(atob(token.split(".")[1]));
      const online = await checkOnline();

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        if (online) {
          await tokenStorage.clearAllTokens();
          await clearLocalSession();
          return { coursesFetched: false };
        }
      }

      if (online) {
        const student = await studentService.getById(payload.id);
        const progress = await studentService.getProgress();
        await useShopStore.getState().fetchItems();
        const fetchedFresh = await useCourseStore.getState().fetchCourses();
        await useCenterStore.getState().fetchCenters();
        if (fetchedFresh) {
          await syncCoursesToLocal(useCourseStore.getState().courses);
        }

        const fullStudent: Student = {
          ...student,
          courseProgress: progress.courseProgress ?? {},
          coins: progress.coins ?? student.coins,
          accessoriesOwned:
            progress.accessoriesOwned ?? student.accessoriesOwned,
        };

        await saveLocalSession(fullStudent);
        set({ currentStudent: fullStudent, isAuthenticated: true });
        return { coursesFetched: true };
      } else {
        const localStudent = await loadLocalSession();
        if (localStudent) {
          set({ currentStudent: localStudent, isAuthenticated: true });
          await useShopStore.getState().fetchItems();
          await useCourseStore.getState().fetchCourses();
          return { coursesFetched: true };
        }
        return { coursesFetched: false };
      }
    } catch (err) {
      if (!isOnline()) {
        const localStudent = await loadLocalSession();
        if (localStudent) {
          set({ currentStudent: localStudent, isAuthenticated: true });
        }
        return { coursesFetched: false };
      }

      // Genuinely invalid/expired token — safe to fully log out.
      if (err instanceof ApiError && err.statusCode === 401) {
        await tokenStorage.clearAllTokens();
        await clearLocalSession();
        set({ currentStudent: null, isAuthenticated: false });
        return { coursesFetched: false };
      }

      const localStudent = await loadLocalSession();
      if (localStudent) {
        set({ currentStudent: localStudent, isAuthenticated: true });
      }
      return { coursesFetched: false };
    }
  },

  // ── Actions: login
  login: async (idNumber: string, password: string): Promise<boolean> => {
    const online = await checkOnline();
    if (!online) {
      toast.error("No internet connection...");
      return false;
    }

    set({ isLoading: true });
    try {
      const student = await studentService.login(idNumber, password);
      const progress = await studentService.getProgress();
      await useShopStore.getState().fetchItems();
      const fetchedFresh = await useCourseStore.getState().fetchCourses();
      await useCenterStore.getState().fetchCenters();
      if (fetchedFresh) {
        await syncCoursesToLocal(useCourseStore.getState().courses);
      }
      const fullStudent: Student = {
        ...student,
        coins: progress.coins,
        courseProgress: progress.courseProgress,
        accessoriesOwned: progress.accessoriesOwned,
      };

      await saveLocalSession(fullStudent);

      set({
        currentStudent: fullStudent,
        isAuthenticated: true,
      });

      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Login failed.");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: logout
  logout: async () => {
    await studentService.logout();
    await clearLocalSession();
    set({ currentStudent: null, isAuthenticated: false });
    navigateTo("/student/login");
  },

  // ── Actions: update profile
  updateProfile: async (data) => {
    try {
      await studentService.updateProfile(data);
      const current = get().currentStudent;
      if (current) set({ currentStudent: { ...current, ...data } });
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile.");
      return false;
    }
  },

  // ── Actions: update password
  updatePassword: async (
    current: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      await studentService.changePassword(current, newPassword);
      const currentStudent = get().currentStudent;
      if (currentStudent) {
        set({
          currentStudent: {
            ...currentStudent,
            mustChangePassword: false,
          },
        });
      }
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password.");
      return false;
    }
  },

  // ── Actions: complete part
  completePart: async (
    courseId: number,
    partSlug: string,
    moduleNumber: number,
  ) => {
    try {
      const current = get().currentStudent;
      if (!current) return;

      const key = `${moduleNumber}:${partSlug}`;
      const existing = current.courseProgress[courseId] ?? {
        courseId,
        completedParts: [],
        lastVisitedModule: moduleNumber,
        lastVisitedPart: partSlug,
        quizAnswers: {},
      };

      if (existing.completedParts.includes(key)) return;

      const updatedStudent = {
        ...current,
        courseProgress: {
          ...current.courseProgress,
          [courseId]: {
            ...existing,
            completedParts: [...existing.completedParts, key],
            lastVisitedModule: moduleNumber,
            lastVisitedPart: partSlug,
          },
        },
      };

      set({ currentStudent: updatedStudent });
      await saveLocalSession(updatedStudent);

      if (isOnline()) {
        await studentService.completePart(courseId, moduleNumber, partSlug);
      } else {
        await queueCompletePart(courseId, moduleNumber, partSlug);
      }
    } catch (err: any) {
      if (isOnline()) {
        toast.error(err.message ?? "Failed to save progress.");
      }
    }
  },

  // ── Actions: update last visited
  updateLastVisited: async (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ) => {
    try {
      const current = get().currentStudent;
      if (!current) return;

      const existing = current.courseProgress[courseId] ?? {
        courseId,
        completedParts: [],
        lastVisitedModule: moduleNumber,
        lastVisitedPart: partSlug,
        quizAnswers: {},
      };

      const updatedStudent = {
        ...current,
        courseProgress: {
          ...current.courseProgress,
          [courseId]: {
            ...existing,
            lastVisitedModule: moduleNumber,
            lastVisitedPart: partSlug,
          },
        },
      };

      set({ currentStudent: updatedStudent });
      await saveLocalSession(updatedStudent);

      if (isOnline()) {
        await studentService.updateLastVisited(
          courseId,
          moduleNumber,
          partSlug,
        );
      } else {
        await queueLastVisited(courseId, moduleNumber, partSlug);
      }
    } catch (err: any) {
      if (isOnline()) {
        toast.error(err.message ?? "Failed to update last visited.");
      }
    }
  },

  // ── Actions: save quiz answers
  saveQuizAnswers: async (
    courseId: number,
    moduleNum: number,
    answers: Record<string, number | string | boolean | string[]>,
  ) => {
    try {
      if (!isOnline()) {
        const current = get().currentStudent;
        if (!current) return;

        const existing = current.courseProgress[courseId] ?? {
          courseId,
          completedParts: [],
          lastVisitedModule: moduleNum,
          lastVisitedPart: "quiz",
          quizAnswers: {},
        };

        const updatedStudent = {
          ...current,
          courseProgress: {
            ...current.courseProgress,
            [courseId]: {
              ...existing,
              quizAnswers: {
                ...existing.quizAnswers,
                [moduleNum]: answers,
              },
            },
          },
        };

        set({ currentStudent: updatedStudent });
        await saveLocalSession(updatedStudent);
        await queueQuizAnswers(courseId, moduleNum, answers);

        toast.info(
          "You're offline. Your answers are saved — gems will be awarded once you're back online.",
        );
        return;
      }

      const result = await studentService.saveQuizAnswers(
        courseId,
        moduleNum,
        answers,
      );

      const current = get().currentStudent;
      if (!current) return;

      const existing = current.courseProgress[courseId] ?? {
        courseId,
        completedParts: [],
        lastVisitedModule: moduleNum,
        lastVisitedPart: "quiz",
        quizAnswers: {},
      };

      set({
        currentStudent: {
          ...current,
          coins: current.coins + result.coinsAwarded,
          courseProgress: {
            ...current.courseProgress,
            [courseId]: {
              ...existing,
              quizAnswers: {
                ...existing.quizAnswers,
                [moduleNum]: answers,
              },
            },
          },
        },
      });

      if (result.coinsAwarded > 0) {
        toast.success(`+${result.coinsAwarded} gems awarded!`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save quiz answers.");
    }
  },

  // ── Actions: purchase accessory
  purchaseAccessory: async (
    accessoryId: number,
    price: number,
  ): Promise<boolean> => {
    try {
      const result = await studentService.purchaseAccessory(accessoryId, price);
      const current = get().currentStudent;
      if (!current) return false;

      set({
        currentStudent: {
          ...current,
          coins: result.remainingCoins,
          accessoriesOwned: [...current.accessoriesOwned, accessoryId],
        },
      });

      await useShopStore.getState().fetchItems();

      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to purchase accessory.");
      return false;
    }
  },

  // ── Actions: update status
  updateStatus: (status: AccountStatus) => {
    const current = get().currentStudent;
    if (!current) return;
    set({ currentStudent: { ...current, status } });
  },

  // ── Actions: sync offline progress
  syncOfflineProgress: async () => {
    const { synced, failed } = await syncPendingProgress(
      studentService.completePart,
      studentService.updateLastVisited,
    );

    const {
      synced: quizSynced,
      failed: quizFailed,
      coinsAwarded,
    } = await syncPendingQuizAnswers(studentService.saveQuizAnswers);

    const totalSynced = synced + quizSynced;
    const totalFailed = failed + quizFailed;
    if (totalSynced > 0) {
      const progress = await studentService.getProgress();
      const current = get().currentStudent;
      if (!current) return;

      const updatedStudent: Student = {
        ...current,
        coins: progress.coins,
        courseProgress: progress.courseProgress,
        accessoriesOwned: progress.accessoriesOwned,
      };
      set({ currentStudent: updatedStudent });
      await saveLocalSession(updatedStudent);

      toast.success(
        `${totalSynced} offline progress item${totalSynced > 1 ? "s" : ""} synced.`,
      );

      if (coinsAwarded > 0) {
        toast.success(
          `+${coinsAwarded} gems awarded for quizzes completed offline!`,
        );
      }
    }

    if (totalFailed > 0) {
      toast.warn(
        `${totalFailed} item${totalFailed > 1 ? "s" : ""} couldn't sync — will retry on next connection.`,
      );
    }
  },
}));
