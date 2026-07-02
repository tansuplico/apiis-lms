// src/stores/useCenterStore.ts
import { create } from "zustand";
import { Center } from "@/types/types";
import { centerService } from "@/services/centerService";
import { toast } from "react-toastify";
import { toBase64 } from "@/utils/imageUtils";
import { useFacilitatorListStore } from "./useFacilitatorListStore";

export type AddStudentResult =
  | "success"
  | "already_in_center"
  | "in_other_center"
  | "no_permission";

interface CenterStore {
  centers: Center[];
  isLoading: boolean;

  fetchCenters: () => Promise<void>;
  createCenter: (
    data: Omit<Center, "id" | "students" | "courses">,
  ) => Promise<void>;
  updateCenter: (centerId: number, updates: Partial<Center>) => Promise<void>;
  deleteCenter: (centerId: number) => Promise<void>;

  addStudent: (
    centerId: number,
    studentId: number,
  ) => Promise<AddStudentResult>;
  removeStudent: (centerId: number, studentId: number) => Promise<boolean>;

  addCourse: (centerId: number, courseId: number) => Promise<boolean>;
  removeCourse: (centerId: number, courseId: number) => Promise<boolean>;

  assignFacilitator: (
    centerId: number,
    facilitatorId: number,
  ) => Promise<boolean>;
  unassignFacilitator: (
    centerId: number,
    facilitatorId: number,
  ) => Promise<boolean>;
}

export const useCenterStore = create<CenterStore>()((set, get) => ({
  // ── State
  centers: [],
  isLoading: false,

  // ── Actions: fetch all centers
  fetchCenters: async () => {
    set({ isLoading: true });
    try {
      const centers = await centerService.getAll();
      const base = (import.meta.env.VITE_API_URL as string).replace(
        /\/api$/,
        "",
      );
      const resolvedCenters: Center[] = await Promise.all(
        centers.map(async (center: Center) => {
          if (!center.thumbnailUrl?.startsWith("/api/")) return center;
          const fullUrl = `${base}${center.thumbnailUrl}`;
          const base64 = await toBase64(fullUrl);
          return {
            ...center,
            thumbnailUrl: base64 || fullUrl,
          };
        }),
      );
      set({ centers: resolvedCenters });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch centers.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: create center
  createCenter: async (data) => {
    try {
      const newCenter = await centerService.create(data);
      set((state) => ({ centers: [...state.centers, newCenter] }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create center.");
      throw err;
    }
  },

  // ── Actions: update center
  updateCenter: async (centerId, updates) => {
    try {
      await centerService.update(centerId, updates);
      await get().fetchCenters();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update center.");
      throw err;
    }
  },

  // ── Actions: delete center
  deleteCenter: async (centerId) => {
    try {
      await centerService.delete(centerId);
      set((state) => ({
        centers: state.centers.filter((c) => c.id !== centerId),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete center.");
      throw err;
    }
  },

  // ── Actions: add student to center
  addStudent: async (centerId, studentId): Promise<AddStudentResult> => {
    try {
      const center = get().centers.find((c) => c.id === centerId);
      if (!center) return "no_permission";

      if ((center.students ?? []).includes(studentId))
        return "already_in_center";

      const otherCenter = get().centers.find(
        (c) => c.id !== centerId && (c.students ?? []).includes(studentId),
      );
      if (otherCenter) return "in_other_center";

      await centerService.addStudent(centerId, studentId);
      await get().fetchCenters();

      return "success";
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student to center.");
      return "no_permission";
    }
  },

  // ── Actions: remove student from center
  removeStudent: async (centerId, studentId): Promise<boolean> => {
    try {
      await centerService.removeStudent(centerId, studentId);
      await get().fetchCenters();
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove student from center.");
      return false;
    }
  },

  // ── Actions: add course to center
  addCourse: async (centerId, courseId): Promise<boolean> => {
    try {
      const center = get().centers.find((c) => c.id === centerId);
      if (!center) return false;
      if (center.courses.includes(courseId)) return false;

      await centerService.addCourse(centerId, courseId);

      set((state) => ({
        centers: state.centers.map((c) =>
          c.id === centerId ? { ...c, courses: [...c.courses, courseId] } : c,
        ),
      }));

      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add course to center.");
      return false;
    }
  },

  // ── Actions: remove course from center
  removeCourse: async (centerId, courseId): Promise<boolean> => {
    try {
      await centerService.removeCourse(centerId, courseId);

      set((state) => ({
        centers: state.centers.map((c) =>
          c.id === centerId
            ? { ...c, courses: c.courses.filter((id) => id !== courseId) }
            : c,
        ),
      }));

      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove course from center.");
      return false;
    }
  },

  // ── Actions: assign facilitator to center
  assignFacilitator: async (centerId, facilitatorId): Promise<boolean> => {
    try {
      await centerService.assignFacilitator(centerId, facilitatorId);
      set((state) => ({
        centers: state.centers.map((c) =>
          c.id === centerId
            ? { ...c, facilitatorIds: [...c.facilitatorIds, facilitatorId] }
            : c,
        ),
      }));
      await useFacilitatorListStore.getState().fetchFacilitators();
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to assign facilitator.");
      return false;
    }
  },

  // ── Actions: unassign facilitator from center
  unassignFacilitator: async (centerId, facilitatorId): Promise<boolean> => {
    try {
      await centerService.unassignFacilitator(centerId, facilitatorId);
      set((state) => ({
        centers: state.centers.map((c) =>
          c.id === centerId
            ? {
                ...c,
                facilitatorIds: c.facilitatorIds.filter(
                  (id) => id !== facilitatorId,
                ),
              }
            : c,
        ),
      }));
      await useFacilitatorListStore.getState().fetchFacilitators();
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to unassign facilitator.");
      return false;
    }
  },
}));
