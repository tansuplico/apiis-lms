// src/services/shopService.ts
import { apiClient } from "./apiClient";

export interface ShopItemDTO {
  id: number;
  name: string;
  category: "Cover Photo Color" | "Profile Avatar";
  price: number;
  color: string | null;
  avatarUrl: string | null;
  targetRole?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShopItemPayload {
  name: string;
  category: "Cover Photo Color" | "Profile Avatar";
  price: number;
  color?: string;
  avatarUrl?: string;
  targetRole?: string | null;
}

export interface UpdateShopItemPayload {
  name?: string;
  price?: number;
  color?: string;
  avatarUrl?: string;
  targetRole?: string | null;
}

export const shopService = {
  getAll: async (): Promise<ShopItemDTO[]> => {
    const response = await apiClient.get<ShopItemDTO[]>("/shop");
    return response.data ?? [];
  },

  create: async (payload: CreateShopItemPayload): Promise<ShopItemDTO> => {
    const response = await apiClient.post<ShopItemDTO>("/shop", payload);
    return response.data!;
  },

  update: async (id: number, payload: UpdateShopItemPayload): Promise<void> => {
    await apiClient.put(`/shop/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/shop/${id}`);
  },
};
