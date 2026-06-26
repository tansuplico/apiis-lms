// src/stores/shopStore.ts
import { create } from "zustand";
import { Accessory, Role } from "@/types/types";
import { shopService, ShopItemDTO } from "@/services/shopService";
import { isOnline } from "@/services/networkStatus";
import { toast } from "react-toastify";

// ── Helpers
// Map backend DTO to frontend Accessory discriminated union
function dtoToAccessory(dto: ShopItemDTO): Accessory {
  if (dto.category === "Cover Photo Color") {
    return {
      id: dto.id,
      name: dto.name,
      category: "Cover Photo Color",
      price: dto.price,
      color: dto.color ?? "#000000",
    };
  }
  return {
    id: dto.id,
    name: dto.name,
    category: "Profile Avatar",
    price: dto.price,
    avatar: dto.avatarUrl ?? "",
    targetRole: (dto.targetRole as Role | null) ?? null,
  };
}

interface ShopStore {
  items: Accessory[];
  isLoading: boolean;

  fetchItems: () => Promise<void>;

  addItem: (payload: {
    name: string;
    category: "Cover Photo Color" | "Profile Avatar";
    price: number;
    color?: string;
    avatarUrl?: string;
    targetRole?: Role | null;
  }) => Promise<void>;

  editItem: (
    id: number,
    payload: {
      name?: string;
      price?: number;
      color?: string;
      avatarUrl?: string;
      targetRole?: Role | null;
    },
  ) => Promise<void>;

  removeItem: (id: number) => Promise<void>;
}

export const useShopStore = create<ShopStore>((set) => ({
  // ── State
  items: [],
  isLoading: false,

  // ── Actions: fetch items
  fetchItems: async () => {
    set({ isLoading: true });
    try {
      if (!isOnline()) {
        set({ isLoading: false });
        return;
      }

      const dtos = await shopService.getAll();
      set({ items: dtos.map(dtoToAccessory), isLoading: false });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fetch shop items.");
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Actions: add item
  addItem: async (payload) => {
    try {
      const dto = await shopService.create(payload);
      set((s) => ({ items: [dtoToAccessory(dto), ...s.items] }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add item.");
      throw err;
    }
  },

  // ── Actions: update item
  editItem: async (id, payload) => {
    try {
      await shopService.update(id, payload);
      set((s) => ({
        items: s.items.map((item): Accessory => {
          if (item.id !== id) return item;
          if (item.category === "Cover Photo Color") {
            return {
              ...item,
              name: payload.name ?? item.name,
              price: payload.price ?? item.price,
              color: payload.color ?? item.color,
            };
          }
          return {
            ...item,
            name: payload.name ?? item.name,
            price: payload.price ?? item.price,
            avatar: payload.avatarUrl ?? item.avatar,
            targetRole:
              payload.targetRole !== undefined
                ? payload.targetRole
                : item.targetRole,
          };
        }),
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update item.");
      throw err;
    }
  },

  // ── Actions: delete item
  removeItem: async (id) => {
    try {
      await shopService.delete(id);
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove item.");
      throw err;
    }
  },
}));
