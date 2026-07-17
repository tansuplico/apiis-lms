import { apiClient } from "./apiClient";
import { BankQuestion } from "@/types/types";

export const questionBankService = {
  getAll: async (collectionId?: number): Promise<BankQuestion[]> => {
    const query = collectionId ? `?collectionId=${collectionId}` : "";
    const response = await apiClient.get<BankQuestion[]>(
      `/question-bank${query}`,
    );
    return response.data ?? [];
  },

  create: async (
    question: Omit<
      BankQuestion,
      "id" | "createdById" | "createdByRole" | "createdAt" | "updatedAt"
    >,
  ): Promise<BankQuestion> => {
    const response = await apiClient.post<BankQuestion>(
      "/question-bank",
      question,
    );
    return response.data!;
  },

  update: async (
    id: number,
    question: Omit<
      BankQuestion,
      "id" | "createdById" | "createdByRole" | "createdAt" | "updatedAt"
    >,
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
