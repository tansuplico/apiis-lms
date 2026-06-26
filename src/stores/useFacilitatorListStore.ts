// src/stores/useFacilitatorListStore.ts
import { create } from "zustand";
import { Facilitator } from "@/types/types";
import { facilitatorService } from "@/services/facilitatorService";
import { toast } from "react-toastify";

interface FacilitatorListStore {
  facilitators: Facilitator[];
  isLoading: boolean;
  fetchFacilitators: () => Promise<void>;
  addFacilitator: (data: {
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  }) => Promise<string>;
  updateFacilitator: (id: number, data: Partial<Facilitator>) => Promise<void>;
  removeFacilitator: (id: number) => Promise<void>;
}

export const useFacilitatorListStore = create<FacilitatorListStore>()(
  (set) => ({
    // ── State
    facilitators: [],
    isLoading: false,

    // ── Actions: fetch all
    fetchFacilitators: async () => {
      set({ isLoading: true });
      try {
        const facilitators = await facilitatorService.getAll();
        set({ facilitators });
      } catch (err: any) {
        toast.error(err.message ?? "Failed to fetch facilitators.");
      } finally {
        set({ isLoading: false });
      }
    },

    // ── Actions: create
    addFacilitator: async (data) => {
      try {
        const { facilitator, temporaryPassword } =
          await facilitatorService.create(data);
        set((state) => ({
          facilitators: [facilitator, ...state.facilitators],
        }));
        return temporaryPassword;
      } catch (err: any) {
        toast.error(err.message ?? "Failed to create facilitator.");
        throw err;
      }
    },

    // ── Actions: update
    updateFacilitator: async (id, data) => {
      try {
        await facilitatorService.update(id, data);
        set((state) => ({
          facilitators: state.facilitators.map((f) =>
            f.id === id ? { ...f, ...data } : f,
          ),
        }));
        toast.success("Facilitator updated.");
      } catch (err: any) {
        toast.error(err.message ?? "Failed to update facilitator.");
        throw err;
      }
    },

    // ── Actions: remove
    removeFacilitator: async (id) => {
      try {
        await facilitatorService.delete(id);
        set((state) => ({
          facilitators: state.facilitators.filter((f) => f.id !== id),
        }));
        toast.success("Facilitator removed.");
      } catch (err: any) {
        toast.error(err.message ?? "Failed to remove facilitator.");
        throw err;
      }
    },
  }),
);
