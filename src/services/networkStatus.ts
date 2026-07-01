// src/services/networkStatus.ts

const HEALTH_URL = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/api$/, "")}/health`
  : "http://localhost:3000/health";

const TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 15000;
const FAIL_THRESHOLD = 2;
const RETRY_AFTER_FAIL_MS = 3000;

let _cachedOnline: boolean = true;
let _pollingStarted = false;
let _failCount = 0;
const _listeners: Set<(online: boolean) => void> = new Set();

function _applyStatus(online: boolean): void {
  if (online === _cachedOnline) return;
  _cachedOnline = online;
  _listeners.forEach((cb) => cb(online));
}

export async function checkOnline(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) {
      _failCount = 0;
      _applyStatus(true);
      return true;
    }
    throw new Error("Non-OK response");
  } catch {
    _failCount++;
    if (_failCount >= FAIL_THRESHOLD) {
      _applyStatus(false);
    } else {
      // First failure: fast retry to confirm before waiting the full poll interval
      setTimeout(() => checkOnline(), RETRY_AFTER_FAIL_MS);
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
    _applyStatus(true);
  };
  const handleOffline = () => {
    // OS/browser event: trust it immediately but also confirm via checkOnline
    _failCount = FAIL_THRESHOLD;
    _applyStatus(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  _listeners.add(callback);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    _listeners.delete(callback);
  };
}

export function startNetworkPolling(
  _onStatusChange?: (online: boolean) => void,
) {
  if (_pollingStarted) return;
  _pollingStarted = true;

  // Poll unconditionally — detects both going offline AND coming back online
  setInterval(async () => {
    await checkOnline();
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
    _applyStatus(false);
  }
}
