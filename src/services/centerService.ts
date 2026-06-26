import { apiClient } from "./apiClient";
import { Center } from "@/types/types";

interface MessageResult {
  message: string;
}
export const centerService = {
  getAll: async (): Promise<Center[]> => {
    const response = await apiClient.get<Center[]>("/centers");
    return response.data ?? [];
  },

  getById: async (id: number): Promise<Center> => {
    const response = await apiClient.get<Center>(`/centers/${id}`);
    return response.data!;
  },

  create: async (data: {
    title: string;
    location?: string;
    coverColor?: string;
    thumbnailUrl?: string;
  }): Promise<Center> => {
    const response = await apiClient.post<Center>("/centers", data);
    return response.data!;
  },

  update: async (
    id: number,
    data: {
      title?: string;
      location?: string;
      coverColor?: string;
      thumbnailUrl?: string;
    },
  ): Promise<void> => {
    await apiClient.put(`/centers/${id}`, data);
  },

  delete: async (centerId: number): Promise<void> => {
    await apiClient.delete(`/centers/${centerId}`);
  },

  addStudent: async (
    centerId: number,
    studentId: number,
  ): Promise<MessageResult> => {
    const response = await apiClient.post<MessageResult>(
      `/centers/${centerId}/students`,
      { studentId },
    );
    return response.data!;
  },

  removeStudent: async (centerId: number, studentId: number): Promise<void> => {
    await apiClient.delete(`/centers/${centerId}/students/${studentId}`);
  },

  addCourse: async (
    centerId: number,
    courseId: number,
  ): Promise<MessageResult> => {
    const response = await apiClient.post<MessageResult>(
      `/centers/${centerId}/courses`,
      { courseId },
    );
    return response.data!;
  },

  removeCourse: async (centerId: number, courseId: number): Promise<void> => {
    await apiClient.delete(`/centers/${centerId}/courses/${courseId}`);
  },

  assignFacilitator: async (
    centerId: number,
    facilitatorId: number,
  ): Promise<void> => {
    await apiClient.post(`/centers/${centerId}/facilitators`, {
      facilitatorId,
    });
  },

  unassignFacilitator: async (
    centerId: number,
    facilitatorId: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/centers/${centerId}/facilitators/${facilitatorId}`,
    );
  },
};
