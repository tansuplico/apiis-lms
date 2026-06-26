// src/hooks/useVideoStream.ts
import { useEffect, useRef, useState } from "react";
import { apiClient } from "../services/apiClient";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const TOKEN_REFRESH_MS = 7 * 60 * 60 * 1000; // refresh at 7h, token expires at 8h

export function useVideoStream(videoId: number | null) {
  // ── State
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers
  const fetchToken = async (id: number): Promise<string> => {
    const res = await apiClient.get<{ token: string }>(
      `/videos/${id}/stream-token`,
    );
    return res.token!;
  };

  const buildUrl = (id: number, token: string) =>
    `${BASE_URL}/videos/${id}/stream?token=${encodeURIComponent(token)}`;

  // ── Effects: initialise stream
  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await fetchToken(videoId);
        if (cancelled) return;
        setStreamUrl(buildUrl(videoId, token));

        timerRef.current = setInterval(async () => {
          try {
            const newToken = await fetchToken(videoId);
            if (!cancelled) setStreamUrl(buildUrl(videoId, newToken));
          } catch {
            // silent — video will 401 on next seek after expiry
          }
        }, TOKEN_REFRESH_MS);
      } catch (err) {
        console.error("useVideoStream error:", err);
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load video. Please try again.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      setStreamUrl(null);
      setError(null);
    };
  }, [videoId]);

  // ── Return
  return { streamUrl, error, loading };
}
