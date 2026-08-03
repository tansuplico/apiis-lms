// src/services/adminService.ts
import { toast } from "react-toastify";
import { apiClient, ApiError } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { Admin, AccountStatus } from "@/types/types";

// interface MessageResponse {
//   message: string;
//   updateProfilePicture: (url: string) => Promise<void>;
// }

export const adminService = {
  // AUTH SANG ADMIN
  login: async (email: string, password: string) => {
    await tokenStorage.clearAllTokens();
    const response = await apiClient.post<Admin>(
      "/auth/admin/login",
      { email, password },
      false,
    );
    if (response.token) {
      await tokenStorage.saveToken(response.token, "admin");
    }
    return response.user!;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch (err) {
      console.error("logout request failed:", err);
      if (!(err instanceof ApiError) || err.statusCode !== 401) {
        toast.warn(
          "Logout may not have fully synced with the server. If you have trouble logging back in right away, wait a few minutes and try again.",
        );
      }
    } finally {
      await tokenStorage.clearToken();
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  // ── CRUD
  getAll: async (): Promise<Admin[]> => {
    const response = await apiClient.get<Admin[]>("/admins");
    return response.data ?? [];
  },

  getById: async (id: number): Promise<Admin> => {
    const response = await apiClient.get<Admin>(`/admins/${id}`);
    return response.data!;
  },

  create: async (data: {
    email: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  }): Promise<Admin> => {
    const response = await apiClient.post<Admin>("/admins", data);
    return response.data!;
  },

  update: async (
    id: number,
    data: {
      email?: string;
      password?: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      status?: AccountStatus;
    },
  ): Promise<void> => {
    await apiClient.put(`/admins/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admins/${id}`);
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    coverColor?: string;
    profilePicture?: string;
  }): Promise<void> => {
    await apiClient.patch("/admins/profile", data);
  },
};
