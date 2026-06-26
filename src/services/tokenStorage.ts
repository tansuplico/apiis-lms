// src/services/tokenStorage.ts
import { Store } from "@tauri-apps/plugin-store";

const STORE_PATH = "auth.dat";

let storeInstance: Store | null = null;

const getStore = async (): Promise<Store> => {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_PATH);
  }
  return storeInstance;
};

export const tokenStorage = {
  saveToken: async (
    token: string,
    role: "admin" | "facilitator" | "student",
  ): Promise<void> => {
    const store = await getStore();
    await store.set(`${role}_token`, token);
    await store.set("active_role", role);
    await store.save();
  },

  getToken: async (): Promise<string | null> => {
    try {
      const store = await getStore();
      const role = await store.get<string>("active_role");
      if (!role) return null;
      const token = await store.get<string>(`${role}_token`);
      return token ?? null;
    } catch {
      return null;
    }
  },

  getRole: async (): Promise<string | null> => {
    try {
      const store = await getStore();
      return (await store.get<string>("active_role")) ?? null;
    } catch {
      return null;
    }
  },

  clearToken: async (): Promise<void> => {
    const store = await getStore();
    const role = await store.get<string>("active_role");
    if (role) {
      await store.delete(`${role}_token`);
    }
    await store.delete("active_role");
    await store.save();
  },

  clearAllTokens: async (): Promise<void> => {
    const store = await getStore();
    await store.delete("admin_token");
    await store.delete("facilitator_token");
    await store.delete("student_token");
    await store.delete("active_role");
    await store.save();
  },

  hasToken: async (): Promise<boolean> => {
    const token = await tokenStorage.getToken();
    return token !== null;
  },
};
