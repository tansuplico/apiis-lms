// src/services/networkRetry.ts
import { ApiError } from "./apiClient";

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ApiError(0, "Request timed out")), ms);
    }),
  ]);
}

export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 800,
  timeoutMs = 6000,
): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (err) {
    const isNetworkLevelFailure =
      !(err instanceof ApiError) || err.statusCode === 0;
    if (!isNetworkLevelFailure || retries <= 0) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withNetworkRetry(fn, retries - 1, delayMs, timeoutMs);
  }
}
