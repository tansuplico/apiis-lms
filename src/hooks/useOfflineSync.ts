// src/hooks/useOfflineSync.ts
import { useEffect, useRef } from "react";
import {
  checkOnline,
  isOnline,
  onNetworkChange,
} from "@/services/networkStatus";
import { hasPendingProgress } from "@/services/offlineProgressService";
import { useStudentStore } from "@/stores/useStudentStore";

const POLL_INTERVAL_MS = 15_000; // check every 15s when offline

export function useOfflineSync() {
  // ── Store
  const isAuthenticated = useStudentStore((s) => s.isAuthenticated);
  const syncOfflineProgress = useStudentStore((s) => s.syncOfflineProgress);

  // ── Refs
  const wasOnlineRef = useRef<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Effects: offline sync polling
  useEffect(() => {
    if (!isAuthenticated) return;

    function stopPoller() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function startPoller() {
      if (intervalRef.current) return; // already running
      intervalRef.current = setInterval(async () => {
        const online = await checkOnline();
        if (online && wasOnlineRef.current === false) {
          const pending = await hasPendingProgress();
          if (pending) await syncOfflineProgress();
        }
        wasOnlineRef.current = online;
      }, POLL_INTERVAL_MS);
    }

    const unsubscribe = onNetworkChange((online) => {
      if (online) {
        wasOnlineRef.current = false; // ensure sync triggers on reconnect
        startPoller();
      } else {
        wasOnlineRef.current = false;
        stopPoller();
      }
    });

    if (isOnline()) {
      startPoller();
    } else {
      wasOnlineRef.current = false;
    }

    return () => {
      stopPoller();
      unsubscribe();
    };
  }, [isAuthenticated, syncOfflineProgress]);
}
