// src/services/networkStatus.ts

const HEALTH_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace("/api", "")}/health`
  : "http://localhost:3000/health";

const TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 30000;
const FAIL_THRESHOLD = 2;

let _cachedOnline: boolean = true;
let _pollingStarted = false;
let _failCount = 0;

export async function checkOnline(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) {
      _failCount = 0;
      _cachedOnline = true;
      return true;
    }
    throw new Error("Non-OK response");
  } catch {
    _failCount++;
    if (_failCount >= FAIL_THRESHOLD) {
      _cachedOnline = false;
    }
    return _cachedOnline;
  }
}

export function isOnline(): boolean {
  return _cachedOnline;
}

export function onNetworkChange(
  callback: (online: boolean) => void,
): () => void {
  const handleOnline = () => {
    _failCount = 0;
    _cachedOnline = true;
    callback(true);
  };
  const handleOffline = () => {
    _cachedOnline = false;
    callback(false);
  };
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

export function startNetworkPolling(onStatusChange: (online: boolean) => void) {
  if (_pollingStarted) return;
  _pollingStarted = true;

  setInterval(async () => {
    if (_cachedOnline) return;
    const nowOnline = await checkOnline();
    if (nowOnline) {
      onStatusChange(true);
    }
  }, POLL_INTERVAL_MS);
}

export function resetNetworkState() {
  _cachedOnline = true;
  _pollingStarted = false;
  _failCount = 0;
}

export function markOffline(): void {
  _failCount++;
  if (_failCount >= FAIL_THRESHOLD) {
    _cachedOnline = false;
  }
}
