// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from "react";
import { isOnline, onNetworkChange } from "@/services/networkStatus";

export function useOnlineStatus() {
  // ── State
  const [online, setOnline] = useState(isOnline());

  // ── Effects: subscribe to network changes
  useEffect(() => {
    const unsub = onNetworkChange(setOnline);
    return () => unsub();
  }, []);

  return online;
}
