// src/stores/useSubmissionStore.ts
import { create } from "zustand";
import { toast } from "react-toastify";
import {
  submissionService,
  SubmissionSettings,
  ModuleSubmission,
  MySubmissionsData,
} from "@/services/submissionService";

interface SubmissionStore {
  settingsByModule: Record<number, SubmissionSettings>;
  submissionsByModule: Record<number, ModuleSubmission[]>;
  mySubmissionsByModule: Record<number, MySubmissionsData>;
  isLoading: boolean;
  isUploading: boolean;

  // ── Admin/facilitator
  fetchSettings: (moduleId: number) => Promise<void>;
  updateSettings: (
    moduleId: number,
    isActive: boolean,
    maxFiles: number,
  ) => Promise<void>;
  fetchModuleSubmissions: (moduleId: number) => Promise<void>;
  deleteSubmission: (moduleId: number, submissionId: number) => Promise<void>;

  // ── Student
  fetchMySubmissions: (moduleId: number) => Promise<void>;
  uploadSubmission: (moduleId: number, file: File) => Promise<void>;
}

export const useSubmissionStore = create<SubmissionStore>()((set) => ({
  settingsByModule: {},
  submissionsByModule: {},
  mySubmissionsByModule: {},
  isLoading: false,
  isUploading: false,

  // ── Admin/facilitator: settings
  fetchSettings: async (moduleId) => {
    try {
      const settings = await submissionService.getSettings(moduleId);
      set((state) => ({
        settingsByModule: { ...state.settingsByModule, [moduleId]: settings },
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch submission settings.", {
        position: "bottom-right",
      });
    }
  },

  updateSettings: async (moduleId, isActive, maxFiles) => {
    try {
      const settings = await submissionService.updateSettings(
        moduleId,
        isActive,
        maxFiles,
      );
      set((state) => ({
        settingsByModule: { ...state.settingsByModule, [moduleId]: settings },
      }));
      toast.success("Submission settings updated.", {
        position: "bottom-right",
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update submission settings.", {
        position: "bottom-right",
      });
      throw err;
    }
  },

  // ── Admin/facilitator: list + delete
  fetchModuleSubmissions: async (moduleId) => {
    set({ isLoading: true });
    try {
      const submissions = await submissionService.listSubmissions(moduleId);
      set((state) => ({
        submissionsByModule: {
          ...state.submissionsByModule,
          [moduleId]: submissions,
        },
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch submissions.", {
        position: "bottom-right",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteSubmission: async (moduleId, submissionId) => {
    try {
      await submissionService.deleteSubmission(submissionId);
      set((state) => ({
        submissionsByModule: {
          ...state.submissionsByModule,
          [moduleId]: (state.submissionsByModule[moduleId] ?? []).filter(
            (s) => s.id !== submissionId,
          ),
        },
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete submission.", {
        position: "bottom-right",
      });
      throw err;
    }
  },

  // ── Student: my submissions + upload
  fetchMySubmissions: async (moduleId) => {
    set({ isLoading: true });
    try {
      const data = await submissionService.getMySubmissions(moduleId);
      set((state) => ({
        mySubmissionsByModule: {
          ...state.mySubmissionsByModule,
          [moduleId]: data,
        },
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch your submissions.", {
        position: "bottom-right",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadSubmission: async (moduleId, file) => {
    set({ isUploading: true });
    try {
      const newSubmission = await submissionService.upload(moduleId, file);
      set((state) => {
        const existing = state.mySubmissionsByModule[moduleId];
        if (!existing) return state;
        return {
          mySubmissionsByModule: {
            ...state.mySubmissionsByModule,
            [moduleId]: {
              ...existing,
              submissions: [newSubmission, ...existing.submissions],
            },
          },
        };
      });
      toast.success("File submitted successfully.", {
        position: "bottom-right",
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit file.", {
        position: "bottom-right",
      });
      throw err;
    } finally {
      set({ isUploading: false });
    }
  },
}));
