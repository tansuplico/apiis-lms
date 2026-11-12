import { apiClient } from "./apiClient";
import { BankCategory, BankQuestion, BankQuestionInput } from "@/types/types";

export const questionBankService = {
  getAll: async (collectionId?: number): Promise<BankQuestion[]> => {
    const query = collectionId ? `?collectionId=${collectionId}` : "";
    const response = await apiClient.get<BankQuestion[]>(
      `/question-bank${query}`,
    );
    return response.data ?? [];
  },

  // Category tags in use across the whole library (for tag suggestions).
  getCategories: async (): Promise<BankCategory[]> => {
    const response = await apiClient.get<BankCategory[]>(
      "/question-bank/categories",
    );
    return response.data ?? [];
  },

  create: async (question: BankQuestionInput): Promise<BankQuestion> => {
    const response = await apiClient.post<BankQuestion>(
      "/question-bank",
      question,
    );
    return response.data!;
  },

  update: async (
    id: number,
    question: BankQuestionInput,
  ): Promise<BankQuestion> => {
    const response = await apiClient.put<BankQuestion>(
      `/question-bank/${id}`,
      question,
    );
    return response.data!;
  },

  delete: async (
    id: number,
  ): Promise<{ id: number; quizzesAffected: number }> => {
    const response = await apiClient.delete<{
      id: number;
      quizzesAffected: number;
    }>(`/question-bank/${id}`);
    return response.data!;
  },
};
