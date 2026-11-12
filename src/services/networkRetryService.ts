// src/services/networkRetryService.ts
import { ApiError } from "./apiClient";

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ApiError(0, "Request timed out")), ms);
    }),
  ]);
}

// Retries network-level failures. With retryServerErrors, 5xx responses
// are retried too (a brief server hiccup), while 4xx such as 401 never are.
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 800,
  timeoutMs = 6000,
  retryServerErrors = false,
): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (err) {
    const isNetworkLevelFailure =
      !(err instanceof ApiError) || err.statusCode === 0;
    const isServerError =
      retryServerErrors && err instanceof ApiError && err.statusCode >= 500;
    if (!(isNetworkLevelFailure || isServerError) || retries <= 0) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withNetworkRetry(
      fn,
      retries - 1,
      delayMs,
      timeoutMs,
      retryServerErrors,
    );
  }
}
