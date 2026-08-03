import { toast } from "react-toastify";
import { apiClient, ApiError } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { Facilitator, AccountStatus } from "@/types/types";

export const facilitatorService = {
  login: async (email: string, password: string) => {
    await tokenStorage.clearAllTokens();
    const response = await apiClient.post<Facilitator>(
      "/auth/facilitator/login",
      { email, password },
      false,
    );
    if (response.token) {
      await tokenStorage.saveToken(response.token, "facilitator");
    }
    return response.user!;
  },

  logout: async (): Promise<void> => {
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

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    await apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  getAll: async (): Promise<Facilitator[]> => {
    const response = await apiClient.get<Facilitator[]>("/facilitators");
    return response.data ?? [];
  },

  getById: async (id: number): Promise<Facilitator> => {
    const response = await apiClient.get<Facilitator>(`/facilitators/${id}`);
    return response.data!;
  },

  create: async (data: {
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  }): Promise<{ facilitator: Facilitator; temporaryPassword: string }> => {
    const response = await apiClient.post<
      Facilitator & { temporaryPassword: string }
    >("/facilitators", data);
    const { temporaryPassword, ...facilitator } = response.data!;
    return { facilitator: facilitator as Facilitator, temporaryPassword };
  },

  update: async (
    id: number,
    data: {
      email?: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      status?: AccountStatus;
    },
  ): Promise<void> => {
    await apiClient.put(`/facilitators/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/facilitators/${id}`);
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    coverColor?: string;
    profilePicture?: string | null;
  }): Promise<void> => {
    await apiClient.patch("/facilitators/profile", data);
  },
};
