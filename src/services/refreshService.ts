// src/services/refreshService.ts
import { syncCoursesInBackground } from "./syncService";
import { loadRoleData } from "./roleDataService";
import { useAdminStore } from "@/stores/useAdminStore";
import { useFacilitatorStore } from "@/stores/useFacilitatorStore";
import { useStudentStore } from "@/stores/useStudentStore";
import type { Role } from "@/types/types";

let inFlight = false;

function signedInRole(): Role | null {
  if (useAdminStore.getState().currentAdmin) return "admin";
  if (useFacilitatorStore.getState().currentFacilitator) return "facilitator";
  if (useStudentStore.getState().currentStudent) return "student";
  return null;
}

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// The Refresh button: reloads everything the signed-in role's screens use
// (the same set as startup), all at once, while the page stays usable.
// Throws if anything failed, so the button can say what.
export async function refreshAppData(): Promise<void> {
  if (inFlight) return;
  const role = signedInRole();
  if (!role) return;
  inFlight = true;
  try {
    const { coursesFresh, errors } = await loadRoleData(role, "on refresh");

    // Students: wait for the offline copy so a failed save is reported.
    if (role === "student" && coursesFresh) {
      const syncError = await syncCoursesInBackground();
      if (syncError) errors.push(syncError);
    }

    if (errors.length === 1) throw new Error(messageOf(errors[0]));
    if (errors.length > 1) {
      throw new Error(
        `${errors.length} items failed: ${messageOf(errors[0])}`,
      );
    }
  } finally {
    inFlight = false;
  }
}
