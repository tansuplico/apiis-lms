// src/services/roleDataService.ts
// The data each role's screens need, loaded all at once. Startup, login
// and the Refresh button all use this, so Refresh reloads exactly what
// startup loads.
import type { Role } from "@/types/types";
import { useShopStore } from "@/stores/useShopStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useCourseStore } from "@/stores/useCourseStore";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { useFacilitatorListStore } from "@/stores/useFacilitatorListStore";
import { useTicketStore } from "@/stores/useTicketStore";
import { useQuizBankCollectionStore } from "@/stores/useQuizBankCollectionStore";
import { syncCoursesInBackground } from "@/services/syncService";

type Load = { name: string; run: () => Promise<unknown> };

function loadsFor(role: Role): Load[] {
  const shop = { name: "shop", run: () => useShopStore.getState().fetchItems() };
  const centers = {
    name: "centers",
    run: () => useCenterStore.getState().fetchCenters(),
  };
  const courses = {
    name: "courses",
    run: () => useCourseStore.getState().fetchCourses(),
  };
  const students = {
    name: "students",
    run: () => useStudentListStore.getState().fetchStudents(),
  };
  const collections = {
    name: "question bank collections",
    run: () => useQuizBankCollectionStore.getState().fetchCollections(),
  };

  if (role === "student") return [shop, courses, centers];
  if (role === "facilitator") {
    return [shop, centers, courses, students, collections];
  }
  return [
    shop,
    centers,
    courses,
    students,
    {
      name: "facilitators",
      run: () => useFacilitatorListStore.getState().fetchFacilitators(),
    },
    { name: "tickets", run: () => useTicketStore.getState().fetchTickets() },
    collections,
  ];
}

// Loads everything the role needs in parallel. A failure doesn't stop the
// others; it is logged and returned in `errors` for the caller to decide
// (login fails on any error, Refresh reports them, startup ignores them).
// For a student whose courses came fresh from the server, the offline
// copy is saved in the background.
export async function loadRoleData(
  role: Role,
  context: string,
): Promise<{ coursesFresh: boolean; errors: unknown[] }> {
  const loads = loadsFor(role);
  const results = await Promise.allSettled(loads.map((l) => l.run()));

  const errors: unknown[] = [];
  let coursesFresh = false;
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Loading ${loads[i].name} failed ${context}:`, result.reason);
      errors.push(result.reason);
    } else if (loads[i].name === "courses" && result.value === true) {
      coursesFresh = true;
    }
  });

  if (role === "student" && coursesFresh) void syncCoursesInBackground();
  return { coursesFresh, errors };
}
