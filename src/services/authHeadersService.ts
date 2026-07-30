// src/services/authHeaders.ts
import { tokenStorage } from "@/services/tokenStorage";

export async function authHeaders() {
  const token = await tokenStorage.getToken();
  return { Authorization: `Bearer ${token}` };
}
