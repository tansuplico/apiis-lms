import { apiClient } from "./apiClient";
import { Course, CourseModule, CoursePart, QuizQuestion } from "@/types/types";

interface CoursePayload {
  title?: string;
  subtitle?: string;
  description?: string;
  instructor?: string;
  level?: string;
  levelColor?: string;
  category?: string;
  bgColor?: string;
  thumbnailUrl?: string;
}

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>("/courses");
    return response.data ?? [];
  },

  getById: async (id: number): Promise<Course> => {
    const response = await apiClient.get<Course>(`/courses/${id}`);
    return response.data!;
  },

  create: async (data: CoursePayload & { title: string }): Promise<Course> => {
    const response = await apiClient.post<Course>("/courses", data);
    return response.data!;
  },

  update: async (id: number, data: CoursePayload): Promise<void> => {
    await apiClient.put(`/courses/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },

  // ── Module management
  addModule: async (
    courseId: number,
    title?: string,
  ): Promise<CourseModule> => {
    const response = await apiClient.post<CourseModule>(
      `/courses/${courseId}/modules`,
      { title },
    );
    return response.data!;
  },

  updateModule: async (
    courseId: number,
    moduleId: number,
    data: { title?: string; weight?: number | null },
  ): Promise<void> => {
    await apiClient.put(`/courses/${courseId}/modules/${moduleId}`, data);
  },

  deleteModule: async (courseId: number, moduleId: number): Promise<void> => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
  },

  // ── Part management
  addPart: async (
    courseId: number,
    moduleId: number,
    data: {
      slug: string;
      name: string;
      coverColor?: string;
      content?: string;
    },
  ): Promise<CoursePart> => {
    const response = await apiClient.post<CoursePart>(
      `/courses/${courseId}/modules/${moduleId}/parts`,
      data,
    );
    return response.data!;
  },

  updatePart: async (
    courseId: number,
    moduleId: number,
    partId: number,
    data: {
      name?: string;
      coverColor?: string;
      content?: string;
      expectedUpdatedAt?: string;
    },
  ): Promise<{ updatedAt?: string }> => {
    const response = await apiClient.put<{ updatedAt?: string }>(
      `/courses/${courseId}/modules/${moduleId}/parts/${partId}`,
      data,
    );
    return response.data ?? {};
  },

  deletePart: async (
    courseId: number,
    moduleId: number,
    partId: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/courses/${courseId}/modules/${moduleId}/parts/${partId}`,
    );
  },

  // ── Quiz management
  updateQuizQuestions: async (
    courseId: number,
    moduleId: number,
    partId: number,
    questions: QuizQuestion[],
    expectedUpdatedAt?: string,
  ): Promise<{ updatedAt?: string }> => {
    const response = await apiClient.put<{ updatedAt?: string }>(
      `/courses/${courseId}/modules/${moduleId}/parts/${partId}/quiz`,
      { questions, expectedUpdatedAt },
    );
    return response.data ?? {};
  },

  reorderPart: async (
    courseId: number,
    moduleId: number,
    partId: number,
    direction: "up" | "down",
  ): Promise<void> => {
    await apiClient.patch(
      `/courses/${courseId}/modules/${moduleId}/parts/${partId}/reorder`,
      { direction },
    );
  },
};
