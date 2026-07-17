// src/services/quizBankCollectionService.ts
import { apiClient } from "./apiClient";
import { QuizBankCollection } from "@/types/types";

export const quizBankCollectionService = {
  getAll: async (): Promise<QuizBankCollection[]> => {
    const response = await apiClient.get<QuizBankCollection[]>(
      "/quiz-bank-collections",
    );
    return response.data ?? [];
  },

  create: async (data: {
    name: string;
    description?: string;
  }): Promise<QuizBankCollection> => {
    const response = await apiClient.post<QuizBankCollection>(
      "/quiz-bank-collections",
      data,
    );
    return response.data!;
  },

  update: async (
    id: number,
    data: { name: string; description?: string },
  ): Promise<QuizBankCollection> => {
    const response = await apiClient.put<QuizBankCollection>(
      `/quiz-bank-collections/${id}`,
      data,
    );
    return response.data!;
  },

  delete: async (
    id: number,
  ): Promise<{ id: number; questionsDeleted: number; quizzesAffected: number }> => {
    const response = await apiClient.delete<{
      id: number;
      questionsDeleted: number;
      quizzesAffected: number;
    }>(`/quiz-bank-collections/${id}`);
    return response.data!;
  },
};