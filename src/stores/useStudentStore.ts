// src/stores/useStudentStore.ts
import { create } from "zustand";
import { Student, AccountStatus } from "@/types/types";
import { studentService } from "@/services/studentService";
import { tokenStorage } from "@/services/tokenStorage";
import { toast } from "react-toastify";
import { useShopStore } from "./useShopStore";
import { syncCoursesInBackground } from "@/services/syncService";
import { isOnline } from "@/services/networkStatus";
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
import { clearLastPage } from "@/services/lastPageService";
import { ApiError } from "@/services/apiClient";
import { withNetworkRetry } from "@/services/networkRetryService";

interface StudentStore {
  currentStudent: Student | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idNumber: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<StudentRestoreResult>;
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

// What restoreSession already loaded, so App.tsx doesn't fetch it again.
type StudentRestoreResult = { coursesFetched: boolean; centersFetched: boolean };
const NOTHING_LOADED: StudentRestoreResult = {
  coursesFetched: false,
  centersFetched: false,
};
const ALL_LOADED: StudentRestoreResult = {
  coursesFetched: true,
  centersFetched: true,
};

// Loads a student's shop, courses and centers at the same time (each was a
// separate wait before), then saves the courses for offline use in the
// background when they came fresh from the server. Each failure is logged
// and doesn't stop the others. (fetchCenters returns early when offline.)
async function loadStudentData(context: string): Promise<{
  coursesFresh: boolean;
}> {
  const [shop, courses, centers] = await Promise.allSettled([
    useShopStore.getState().fetchItems(),
    useCourseStore.getState().fetchCourses(),
    useCenterStore.getState().fetchCenters(),
  ]);
  if (shop.status === "rejected") {
    console.error(`fetchItems failed ${context}:`, shop.reason);
  }
  if (courses.status === "rejected") {
    console.error(`fetchCourses failed ${context}:`, courses.reason);
  }
  if (centers.status === "rejected") {
    console.error(`fetchCenters failed ${context}:`, centers.reason);
  }
  const coursesFresh = courses.status === "fulfilled" && courses.value;
  if (coursesFresh) void syncCoursesInBackground();
  return { coursesFresh };
}

export const useStudentStore = create<StudentStore>()((set, get) => ({
  // ── State
  currentStudent: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions: restore session
  restoreSession: async () => {
    const restoreFromLocalCache = async (): Promise<StudentRestoreResult> => {
      const localStudent = await loadLocalSession();
      if (localStudent) {
        set({ currentStudent: localStudent, isAuthenticated: true });
        await loadStudentData("restoring from cache");
        return ALL_LOADED;
      }
      return NOTHING_LOADED;
    };

    try {
      const role = await tokenStorage.getRole();
      if (role !== "student") return NOTHING_LOADED;

      const token = await tokenStorage.getToken();
      if (!token) return NOTHING_LOADED;

      const payload = JSON.parse(atob(token.split(".")[1]));

      if (!isOnline()) {
        return await restoreFromLocalCache();
      }

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        await tokenStorage.clearAllTokens();
        await clearLocalSession();
        set({ currentStudent: null, isAuthenticated: false });
        return NOTHING_LOADED;
      }

      // Retry 5xx too: a brief server hiccup shouldn't look like a logout.
      const [student, progress] = await withNetworkRetry(
        () =>
          Promise.all([
            studentService.getById(payload.id),
            studentService.getProgress(),
          ]),
        2,
        800,
        6000,
        true,
      );

      const fullStudent: Student = {
        ...student,
        courseProgress: progress.courseProgress ?? {},
        coins: progress.coins ?? student.coins,
        accessoriesOwned: progress.accessoriesOwned ?? student.accessoriesOwned,
      };

      await saveLocalSession(fullStudent);
      set({ currentStudent: fullStudent, isAuthenticated: true });

      // Best-effort secondary data — a failure here must not discard the
      // fresh, correct core identity fetch already committed above.
      await loadStudentData("during restoreSession");

      return ALL_LOADED;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        await tokenStorage.clearAllTokens();
        await clearLocalSession();
        set({ currentStudent: null, isAuthenticated: false });
        return NOTHING_LOADED;
      }

      return await restoreFromLocalCache();
    }
  },

  // ── Actions: login
  login: async (idNumber: string, password: string): Promise<boolean> => {
    if (!isOnline()) {
      toast.error("No internet connection...");
      return false;
    }
    set({ isLoading: true });
    let student: Student;
    try {
      student = await withNetworkRetry(() =>
        studentService.login(idNumber, password),
      );
    } catch (err: any) {
      toast.error(err.message ?? "Login failed.");
      set({ isLoading: false });
      return false;
    }

    try {
      const progress = await studentService.getProgress();

      await loadStudentData("during login");

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
    } catch (err) {
      console.error("Post-login initialization failed:", err);

      if (err instanceof ApiError && err.statusCode === 401) {
        set({ currentStudent: null, isAuthenticated: false });
        toast.error("Something went wrong signing you in. Please try again.");
        return false;
      }

      const fallbackStudent: Student = {
        ...student,
        courseProgress: student.courseProgress ?? {},
        accessoriesOwned: student.accessoriesOwned ?? [],
      };

      try {
        await saveLocalSession(fallbackStudent);
      } catch {
        // best-effort only; not fatal to login
      }

      set({
        currentStudent: fallbackStudent,
        isAuthenticated: true,
      });

      return true;
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: logout
  logout: async () => {
    await studentService.logout();
    await clearLocalSession();
    set({ currentStudent: null, isAuthenticated: false });
    await clearLastPage(); // a deliberate logout starts fresh next time
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
        const updatedStudent = {
          ...currentStudent,
          mustChangePassword: false,
        };
        set({ currentStudent: updatedStudent });
        // Persist immediately — restoreSession() falls back to this cached
        // snapshot on any non-401 error (not just genuine offline states),
        // so without this a refresh right after a forced password change
        // could rehydrate mustChangePassword: true from a stale cache and
        // bounce the student straight back to the change-password page.
        await saveLocalSession(updatedStudent);
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
