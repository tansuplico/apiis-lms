// src/services/refreshService.ts
import { isOnline } from "./networkStatus";
import { syncCoursesToLocal } from "./syncService";
import { useStudentStore } from "@/stores/useStudentStore";
import { useCourseStore } from "@/stores/useCourseStore";
import { useCenterStore } from "@/stores/useCenterStore";
import { useShopStore } from "@/stores/useShopStore";

let inFlight = false;

export async function refreshAppData(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const isStudent = !!useStudentStore.getState().currentStudent;

    let fetchedFresh = false;
    try {
      fetchedFresh = await useCourseStore.getState().fetchCourses();
    } catch (err) {
      console.error("refreshAppData: fetchCourses failed:", err);
    }

    try {
      await useCenterStore.getState().fetchCenters();
    } catch (err) {
      console.error("refreshAppData: fetchCenters failed:", err);
    }

    if (isOnline()) {
      try {
        await useShopStore.getState().fetchItems();
      } catch (err) {
        console.error("refreshAppData: fetchItems failed:", err);
      }
    }

    if (isStudent && fetchedFresh) {
      const embedded = await syncCoursesToLocal(
        useCourseStore.getState().courses,
      );
      useCourseStore.getState().applyEmbeddedContent(embedded);
    }
  } finally {
    inFlight = false;
  }
}
