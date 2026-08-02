// src/services/apiClient.ts
import { tokenStorage } from "./tokenStorage";
import { handleUnauthorizedResponse } from "./sessionGuardService";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  requiresAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: T;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toFriendlyError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err;
  }
  throw new ApiError(
    0,
    "Connection seems slow or unavailable. Please check your internet and try again.",
  );
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, requiresAuth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = await tokenStorage.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
    ...(body !== undefined && body !== null
      ? { body: JSON.stringify(body) }
      : {}),
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (requiresAuth) {
        await handleUnauthorizedResponse(response.status);
      }

      throw new ApiError(
        response.status,
        data.message ?? "Something went wrong.",
      );
    }

    return data;
  } catch (err) {
    toFriendlyError(err);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, requiresAuth = true) =>
    request<T>(endpoint, { method: "GET", requiresAuth }),

  post: <T>(endpoint: string, body: unknown, requiresAuth = true) =>
    request<T>(endpoint, { method: "POST", body, requiresAuth }),

  put: <T>(endpoint: string, body: unknown, requiresAuth = true) =>
    request<T>(endpoint, { method: "PUT", body, requiresAuth }),

  patch: <T>(endpoint: string, body: unknown, requiresAuth = true) =>
    request<T>(endpoint, { method: "PATCH", body, requiresAuth }),

  delete: <T>(endpoint: string, requiresAuth = true) =>
    request<T>(endpoint, { method: "DELETE", requiresAuth }),
};

export { ApiError, toFriendlyError };
