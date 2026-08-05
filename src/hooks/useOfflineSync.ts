// src/hooks/useOfflineSync.ts
import { useEffect } from "react";
import { isOnline, onNetworkChange } from "@/services/networkStatus";
import { hasPendingProgress } from "@/services/offlineProgressService";
import { useStudentStore } from "@/stores/useStudentStore";

export function useOfflineSync() {
  const isAuthenticated = useStudentStore((s) => s.isAuthenticated);
  const syncOfflineProgress = useStudentStore((s) => s.syncOfflineProgress);

  useEffect(() => {
    if (!isAuthenticated) return;

    const trySync = async () => {
      const pending = await hasPendingProgress();
      if (pending) await syncOfflineProgress();
    };

    if (isOnline()) {
      trySync();
    }

    const unsubscribe = onNetworkChange((online) => {
      if (online) trySync();
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, syncOfflineProgress]);
}
