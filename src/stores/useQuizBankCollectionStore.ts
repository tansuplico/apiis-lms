// src/stores/useQuizBankCollectionStore.ts
import { create } from "zustand";
import { QuizBankCollection } from "@/types/types";
import { quizBankCollectionService } from "@/services/bankCollectionService";
import { toast } from "react-toastify";

interface QuizBankCollectionStore {
  collections: QuizBankCollection[];
  isLoading: boolean;
  fetchCollections: () => Promise<void>;
}

export const useQuizBankCollectionStore = create<QuizBankCollectionStore>()(
  (set) => ({
    // ── State
    collections: [],
    isLoading: false,

    // ── Actions: fetch all
    fetchCollections: async () => {
      set({ isLoading: true });
      try {
        const collections = await quizBankCollectionService.getAll();
        set({ collections });
      } catch (err: any) {
        toast.error(err.message ?? "Failed to fetch collections.");
      } finally {
        set({ isLoading: false });
      }
    },
  }),
);
