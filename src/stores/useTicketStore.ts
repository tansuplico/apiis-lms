// src/stores/useTicketStore.ts
import { create } from "zustand";
import { Ticket, TicketStatus } from "@/types/types";
import { apiClient } from "@/services/apiClient";
import { toast } from "react-toastify";
import { isOnline } from "@/services/networkStatus";

const LAST_VIEWED_STORAGE_KEY = "apiis-admin-tickets-last-viewed";

const readLastViewedAt = (): number => {
  const stored = localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
  const parsed = stored ? Number(stored) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

interface TicketStore {
  tickets: Ticket[];
  isLoading: boolean;
  lastViewedAt: number;
  fetchTickets: () => Promise<void>;
  deleteTicket: (id: number) => Promise<void>;
  updateTicketStatus: (id: number, status: TicketStatus) => Promise<void>;
  markTicketsViewed: () => void;
}

export const useTicketStore = create<TicketStore>()((set, get) => ({
  // ── State
  tickets: [],
  isLoading: false,
  lastViewedAt: readLastViewedAt(),

  // ── Actions: fetch all tickets
  fetchTickets: async () => {
    if (!isOnline()) return;
    set({ isLoading: true });
    try {
      let page = 1;
      let allTickets: Ticket[] = [];

      while (true) {
        const response = await apiClient.get(`/tickets?page=${page}&limit=100`);
        const data = (response as any).data ?? [];
        const pagination = (response as any).pagination;

        allTickets = [...allTickets, ...data];

        if (!pagination || page >= pagination.totalPages) break;
        page++;
      }

      set({ tickets: allTickets });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch tickets.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: delete ticket
  deleteTicket: async (id) => {
    try {
      await apiClient.delete(`/tickets/${id}`);
      set({ tickets: get().tickets.filter((t) => t.id !== id) });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete ticket.");
      throw err;
    }
  },

  // ── Actions: update ticket status
  updateTicketStatus: async (id, status) => {
    try {
      await apiClient.patch(`/tickets/${id}/status`, { status });
      set({
        tickets: get().tickets.map((t) => (t.id === id ? { ...t, status } : t)),
      });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update ticket status.");
      throw err;
    }
  },

  // ── Actions: mark all currently-known tickets as seen (call when the
  // admin opens the Tickets page) so the sidebar badge clears.
  markTicketsViewed: () => {
    const now = Date.now();
    localStorage.setItem(LAST_VIEWED_STORAGE_KEY, String(now));
    set({ lastViewedAt: now });
  },
}));
