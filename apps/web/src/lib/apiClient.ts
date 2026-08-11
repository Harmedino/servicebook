import type { ApiErrorBody } from "@servicebook/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_STORAGE_KEY = "servicebook_token";
const UNAUTHORIZED_EVENT = "servicebook:unauthorized";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/** Fires when an authenticated request comes back 401 (expired/invalid token). Never fires for public requests (auth: false), so a failed login attempt never triggers this. */
export function onUnauthorized(callback: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, data as ApiErrorBody);
  }

  return data as T;
}
