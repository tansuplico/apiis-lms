// src/stores/useAdminStore.ts
import { create } from "zustand";
import { Admin } from "@/types/types";
import { adminService } from "@/services/adminService";
import { tokenStorage } from "@/services/tokenStorage";
import { toast } from "react-toastify";
import { useCenterStore } from "./useCenterStore";
import { useCourseStore } from "./useCourseStore";
import { useStudentListStore } from "./useStudentListStore";
import { useFacilitatorListStore } from "./useFacilitatorListStore";
import { useShopStore } from "./useShopStore";
import { navigateTo } from "@/services/navigationService";
import { ApiError } from "@/services/apiClient";
import { useTicketStore } from "./useTicketStore";
import { useQuizBankCollectionStore } from "./useQuizBankCollectionStore";
import { isOnline } from "@/services/networkStatus";
import { withNetworkRetry } from "@/services/networkRetryService";

interface AdminStore {
  currentAdmin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (current: string, newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<Admin>) => Promise<boolean>;
  restoreSession: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>()((set, get) => ({
  // ── State
  currentAdmin: null,
  isAuthenticated: false,
  isLoading: false,

  // ── Actions: restore session
  restoreSession: async () => {
    try {
      const role = await tokenStorage.getRole();
      if (role !== "admin") return;

      const token = await tokenStorage.getToken();
      if (!token) return;

      const payload = JSON.parse(atob(token.split(".")[1]));

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        await tokenStorage.clearAllTokens();
        return;
      }

      if (!isOnline()) return;

      const admin = await withNetworkRetry(() =>
        adminService.getById(payload.id),
      );
      set({ currentAdmin: admin, isAuthenticated: true });

      try {
        await useShopStore.getState().fetchItems();
      } catch (err) {
        console.error("fetchItems failed during restoreSession:", err);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        await tokenStorage.clearAllTokens();
        set({ currentAdmin: null, isAuthenticated: false });
      }
    }
  },

  // ── Actions: login
  login: async (email: string, password: string): Promise<void> => {
    if (!isOnline()) {
      throw new ApiError(0, "No internet connection.");
    }

    set({ isLoading: true });
    try {
      const admin = await withNetworkRetry(() =>
        adminService.login(email, password),
      );
      await useShopStore.getState().fetchItems();
      await useCenterStore.getState().fetchCenters();
      await useCourseStore.getState().fetchCourses();
      await useStudentListStore.getState().fetchStudents();
      await useFacilitatorListStore.getState().fetchFacilitators();
      await useTicketStore.getState().fetchTickets();
      await useQuizBankCollectionStore.getState().fetchCollections();
      set({ currentAdmin: admin, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: logout
  logout: async () => {
    await adminService.logout();
    set({ currentAdmin: null });
    navigateTo("/facilitator-admin/login");
  },

  // ── Actions: update password
  updatePassword: async (
    current: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      await adminService.changePassword(current, newPassword);
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password.");
      return false;
    }
  },

  // ── Actions: update profile
  updateProfile: async (data: Partial<Admin>) => {
    try {
      await adminService.updateProfile(data);
      const current = get().currentAdmin;
      if (current) {
        set({ currentAdmin: { ...current, ...data } });
      }
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile.");
      return false;
    }
  },
}));
