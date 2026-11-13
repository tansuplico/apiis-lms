// src/hooks/useRefresh.ts
// The header's Refresh button, shared by the admin, facilitator and student
// layouts: reloads the role's data and reports the result.
import { useState } from "react";
import { toast } from "react-toastify";
import { refreshAppData } from "@/services/refreshService";

export function useRefresh(): {
  refreshing: boolean;
  refresh: () => Promise<void>;
} {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAppData();
      toast.success("Refreshed");
    } catch (err: any) {
      console.error("refresh failed:", err);
      toast.error(`Refresh failed: ${err?.message ?? String(err)}`);
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, refresh };
}
