// src/services/ticketService.ts
import { apiClient } from "./apiClient";
import {
  TicketStatus,
  TicketsApiResponse,
  GetAllTicketsParams,
} from "@/types/types";

export const ticketService = {
  getAll: async (
    params: GetAllTicketsParams = {},
  ): Promise<TicketsApiResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.status) query.set("status", params.status);
    if (params.role) query.set("role", params.role);
    query.set("_", String(Date.now()));

    const response = await apiClient.get<TicketsApiResponse>(
      `/tickets?${query.toString()}`,
    );
    return response.data!;
  },

  updateStatus: async (id: number, status: TicketStatus): Promise<void> => {
    await apiClient.patch(`/tickets/${id}/status`, { status });
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tickets/${id}`);
  },
};
