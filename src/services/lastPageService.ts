// src/services/lastPageService.ts
// Remembers the page the user had open, so reopening the app (after a
// normal close or a crash) lands there again. Logging out clears it.
import { load } from "@tauri-apps/plugin-store";
import type { Role } from "@/types/types";

const STORE_FILE = "last-page.json";
const KEY = "lastPage";
const ROLES: Role[] = ["admin", "facilitator", "student"];

export type LastPage = { role: Role; userId: number; path: string };

// Only pages inside the user's own area are remembered; login and
// change-password screens never are. `path` may include a query string.
export function isRememberablePath(path: string, role: Role): boolean {
  const prefix = `/${role}/`;
  const pathname = path.split("?")[0];
  return (
    pathname.startsWith(prefix) &&
    pathname.length > prefix.length &&
    !pathname.includes("change-password") &&
    !pathname.endsWith("/login")
  );
}

// The page to reopen at startup, or null. Only for the same role and user.
export function pickRestoreTarget(
  saved: LastPage | null,
  current: { role: Role; userId: number } | null,
): string | null {
  if (!saved || !current) return null;
  if (saved.role !== current.role || saved.userId !== current.userId) {
    return null;
  }
  return isRememberablePath(saved.path, saved.role) ? saved.path : null;
}

// Storage failures must never block startup, navigation or logout.
export async function saveLastPage(page: LastPage): Promise<void> {
  try {
    const store = await load(STORE_FILE);
    await store.set(KEY, page);
    await store.save();
  } catch {
    // Not remembering a page is harmless.
  }
}

export async function loadLastPage(): Promise<LastPage | null> {
  try {
    const store = await load(STORE_FILE);
    const value = await store.get<Partial<LastPage>>(KEY);
    if (
      value &&
      ROLES.includes(value.role as Role) &&
      typeof value.userId === "number" &&
      typeof value.path === "string"
    ) {
      return value as LastPage;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearLastPage(): Promise<void> {
  try {
    const store = await load(STORE_FILE);
    await store.delete(KEY);
    await store.save();
  } catch {
    // Nothing to clear, or storage unavailable.
  }
}
