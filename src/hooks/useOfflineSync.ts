// src/hooks/useOfflineSync.ts
import { useEffect, useRef } from "react";
import { isOnline, onNetworkChange } from "@/services/networkStatus";
import { hasPendingProgress } from "@/services/offlineProgressService";
import { useStudentStore } from "@/stores/useStudentStore";

export function useOfflineSync() {
  const isAuthenticated = useStudentStore((s) => s.isAuthenticated);
  const syncOfflineProgress = useStudentStore((s) => s.syncOfflineProgress);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const trySync = async () => {
      if (inFlight.current || cancelled) return;
      inFlight.current = true;
      try {
        const pending = await hasPendingProgress();
        if (pending && !cancelled) await syncOfflineProgress();
      } catch (err) {
        console.error("useOfflineSync: sync attempt failed:", err);
      } finally {
        inFlight.current = false;
      }
    };

    if (isOnline()) {
      trySync();
    }

    const unsubscribe = onNetworkChange((online) => {
      if (online) trySync();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthenticated, syncOfflineProgress]);
}
