import { apiClient } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import {
  Student,
  AccountStatus,
  CourseProgress,
  GradebookState,
} from "@/types/types";

interface StudentProgressResponse {
  coins: number;
  courseProgress: Record<number, CourseProgress>;
  accessoriesOwned: number[];
}

export interface GradebookEntry {
  moduleNumber: number;
  moduleTitle: string;
  weight: number | null;
  coinsAwarded: number;
  alreadyClaimed: boolean;
  answers: Record<string, number | string>;
}

export const studentService = {
  login: async (idNumber: string, password: string) => {
    await tokenStorage.clearAllTokens();
    const response = await apiClient.post<Student>(
      "/auth/student/login",
      { idNumber, password },
      false,
    );
    if (response.token) {
      await tokenStorage.saveToken(response.token, "student");
    }
    return response.user!;
  },

  logout: async (): Promise<void> => {
    await tokenStorage.clearToken();
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

  getAll: async (): Promise<Student[]> => {
    const response = await apiClient.get<Student[]>("/students?limit=all");
    return response.data ?? [];
  },

  getById: async (id: number): Promise<Student> => {
    const response = await apiClient.get<Student>(`/students/${id}`);
    return response.data!;
  },

  create: async (data: {
    idNumber: string;
    password: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    currentCenter?: number | null;
  }): Promise<Student> => {
    const response = await apiClient.post<Student>("/students", data);
    return response.data!;
  },

  update: async (
    id: number,
    data: {
      idNumber?: string;
      password?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string;
      status?: AccountStatus;
      currentCenter?: number | null;
    },
  ): Promise<void> => {
    await apiClient.put(`/students/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/students/${id}`);
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    coverColor?: string;
    profilePicture?: string;
  }): Promise<void> => {
    await apiClient.patch("/students/profile", data);
  },

  getProgress: async (): Promise<StudentProgressResponse> => {
    const response = await apiClient.get<StudentProgressResponse>("/progress");
    return response.data!;
  },

  getCourseProgress: async (courseId: number): Promise<CourseProgress> => {
    const response = await apiClient.get<CourseProgress>(
      `/progress/course/${courseId}`,
    );
    return response.data!;
  },

  completePart: async (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ): Promise<void> => {
    await apiClient.post("/progress/complete-part", {
      courseId,
      moduleNumber,
      partSlug,
    });
  },

  updateLastVisited: async (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ): Promise<void> => {
    await apiClient.put("/progress/last-visited", {
      courseId,
      moduleNumber,
      partSlug,
    });
  },

  saveQuizAnswers: async (
    courseId: number,
    moduleNumber: number,
    answers: Record<string, number | string>,
  ): Promise<{ coinsAwarded: number; alreadyClaimed: boolean }> => {
    const response = await apiClient.post<{
      coinsAwarded: number;
      alreadyClaimed: boolean;
    }>("/progress/save-quiz", {
      courseId,
      moduleNumber,
      answers,
    });
    return response.data!;
  },

  purchaseAccessory: async (
    accessoryId: number,
    price: number,
  ): Promise<{ remainingCoins: number }> => {
    const response = await apiClient.post<{ remainingCoins: number }>(
      "/progress/purchase-accessory",
      { accessoryId, price },
    );
    return response.data!;
  },

  getProgressById: async (
    studentId: number,
  ): Promise<StudentProgressResponse> => {
    const response = await apiClient.get<StudentProgressResponse>(
      `/progress/${studentId}`,
    );
    return response.data!;
  },

  // studentService.ts
  getGradebook: async (
    studentId: number,
    courseId: number,
  ): Promise<GradebookState> => {
    const response = await apiClient.get<GradebookState>(
      `/progress/${studentId}/gradebook?courseId=${courseId}`,
    );
    return response.data!;
  },
};
