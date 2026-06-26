// src/services/tauriStorage.ts
import { load } from "@tauri-apps/plugin-store";
import type { StateStorage } from "zustand/middleware";

// ── Store instance (lazy-loaded singleton)
const getStore = (() => {
  let storePromise: ReturnType<typeof load> | null = null;
  return () => {
    if (!storePromise) {
      storePromise = load("app-state.dat", { defaults: {} });
    }
    return storePromise;
  };
})();

// ── Exported adapter
export const tauriStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const store = await getStore();
      const value = await store.get(name);
      if (value === null || value === undefined) return null;
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },

  setItem: async (name, value) => {
    const store = await getStore();
    const parsed = value ? JSON.parse(value) : null;
    await store.set(name, parsed);
    await store.save();
  },

  removeItem: async (name) => {
    const store = await getStore();
    await store.delete(name);
    await store.save();
  },
};
