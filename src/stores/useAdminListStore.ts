// src/stores/useAdminListStore.ts
import { create } from "zustand";
import { Admin } from "@/types/types";
import { adminService } from "@/services/adminService";
import { toast } from "react-toastify";

interface AdminListStore {
  admins: Admin[];
  isLoading: boolean;
  fetchAdmins: () => Promise<void>;
  addAdmin: (data: Omit<Admin, "id">) => Promise<void>;
  updateAdmin: (id: number, data: Partial<Admin>) => Promise<void>;
  removeAdmin: (id: number) => Promise<void>;
}

export const useAdminListStore = create<AdminListStore>()((set) => ({
  // ── State
  admins: [],
  isLoading: false,

  // ── Actions: fetch
  fetchAdmins: async () => {
    set({ isLoading: true });
    try {
      const admins = await adminService.getAll();
      set({ admins });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch admins.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: add
  addAdmin: async (data) => {
    try {
      const newAdmin = await adminService.create(data);
      set((state) => ({ admins: [newAdmin, ...state.admins] }));
      toast.success(
        `Admin "${newAdmin.firstName} ${newAdmin.lastName}" created.`,
        {
          position: "bottom-right",
        },
      );
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create admin.");
      throw err;
    }
  },

  // ── Actions: update
  updateAdmin: async (id, data) => {
    try {
      await adminService.update(id, data);
      set((state) => ({
        admins: state.admins.map((a) => (a.id === id ? { ...a, ...data } : a)),
      }));
      toast.success("Admin updated.", { position: "bottom-right" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update admin.");
      throw err;
    }
  },

  // ── Actions: remove
  removeAdmin: async (id) => {
    try {
      await adminService.delete(id);
      set((state) => ({
        admins: state.admins.filter((a) => a.id !== id),
      }));
      toast.success("Admin removed.", { position: "bottom-right" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove admin.");
      throw err;
    }
  },
}));
