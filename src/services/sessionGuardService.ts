// src/services/sessionGuard.ts
import { tokenStorage } from "@/services/tokenStorage";
import { navigateTo } from "@/services/navigationService";

const LOGIN_PATH_BY_ROLE: Record<string, string> = {
  student: "/student/login",
  facilitator: "/facilitator-admin/login",
  admin: "/facilitator-admin/login",
};

// Call this whenever an authenticated request comes back 401: clears the
// stored session and redirects to the right role's login screen. This is
// the same handling apiClient.ts already does internally — pulled out so
// any fetch call outside apiClient (e.g. FormData uploads) can share it.
export async function handleUnauthorizedResponse(
  status: number,
): Promise<void> {
  if (status !== 401) return;
  const role = await tokenStorage.getRole();
  await tokenStorage.clearToken();
  navigateTo(
    role ? (LOGIN_PATH_BY_ROLE[role] ?? "/student/login") : "/student/login",
  );
}
