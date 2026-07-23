// src/stores/useFacilitatorStore.ts
import { create } from "zustand";
import { Facilitator } from "@/types/types";
import { facilitatorService } from "@/services/facilitatorService";
import { tokenStorage } from "@/services/tokenStorage";
import { toast } from "react-toastify";
import { useCenterStore } from "./useCenterStore";
import { useCourseStore } from "./useCourseStore";
import { useStudentListStore } from "./useStudentListStore";
import { useShopStore } from "./useShopStore";
import { navigateTo } from "@/services/navigationService";
import { ApiError } from "@/services/apiClient";
import { useQuizBankCollectionStore } from "./useQuizBankCollectionStore";

interface FacilitatorStore {
  currentFacilitator: Facilitator | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (current: string, newPassword: string) => Promise<boolean>;
  updatePasswordForced: (newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<Facilitator>) => Promise<boolean>;
  restoreSession: () => Promise<void>;
}

export const useFacilitatorStore = create<FacilitatorStore>()((set, get) => ({
  // ── State
  currentFacilitator: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions: restore session
  restoreSession: async () => {
    try {
      const role = await tokenStorage.getRole();
      if (role !== "facilitator") return;

      const token = await tokenStorage.getToken();
      if (!token) return;

      const payload = JSON.parse(atob(token.split(".")[1]));

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        await tokenStorage.clearAllTokens();
        return;
      }

      await useShopStore.getState().fetchItems();

      const facilitator = await facilitatorService.getById(payload.id);
      set({ currentFacilitator: facilitator, isAuthenticated: true });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        // Genuinely invalid/expired token — safe to log out.
        await tokenStorage.clearAllTokens();
        set({ currentFacilitator: null, isAuthenticated: false });
      }
    }
  },

  // ── Actions: login
  login: async (email: string, password: string): Promise<void> => {
    set({ isLoading: true });
    try {
      const facilitator = await facilitatorService.login(email, password);

      if (!facilitator.mustChangePassword) {
        await useShopStore.getState().fetchItems();
        await useCenterStore.getState().fetchCenters();
        await useCourseStore.getState().fetchCourses();
        await useStudentListStore.getState().fetchStudents();
        await useQuizBankCollectionStore.getState().fetchCollections();
      }

      set({ currentFacilitator: facilitator, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: logout
  logout: async () => {
    await facilitatorService.logout();
    set({ currentFacilitator: null, isAuthenticated: false });
    navigateTo("/facilitator-admin/login");
  },

  // ── Actions: update password (with current password)
  updatePassword: async (current, newPassword) => {
    try {
      await facilitatorService.changePassword(current, newPassword);
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password.");
      return false;
    }
  },

  // ── Actions: force password change (first login)
  updatePasswordForced: async (newPassword) => {
    try {
      await facilitatorService.changePassword("", newPassword);
      const current = get().currentFacilitator;
      if (current) {
        set({ currentFacilitator: { ...current, mustChangePassword: false } });
      }

      await useShopStore.getState().fetchItems();
      await useCenterStore.getState().fetchCenters();
      await useCourseStore.getState().fetchCourses();
      await useStudentListStore.getState().fetchStudents();
      await useQuizBankCollectionStore.getState().fetchCollections();

      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password.");
      return false;
    }
  },

  // ── Actions: update profile
  updateProfile: async (data) => {
    try {
      await facilitatorService.updateProfile(data);
      const current = get().currentFacilitator;
      if (current) set({ currentFacilitator: { ...current, ...data } });
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile.");
      return false;
    }
  },
}));
