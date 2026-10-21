// src/services/sessionStorage.ts
import { Student } from "@/types/types";
import { load } from "@tauri-apps/plugin-store";

const STORE_FILE = "session.json";

export async function saveLocalSession(student: Student): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("currentStudent", JSON.stringify(student));
  await store.save();
}

export async function loadLocalSession(): Promise<Student | null> {
  try {
    const store = await load(STORE_FILE);
    const raw = await store.get<string>("currentStudent");
    if (!raw) return null;
    return JSON.parse(raw) as Student;
  } catch {
    return null;
  }
}

export async function clearLocalSession(): Promise<void> {
  const store = await load(STORE_FILE);
  await store.delete("currentStudent");
  await store.save();
}
