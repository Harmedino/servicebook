// Shared between apps/api and apps/web. Keep this to types that genuinely
// cross the frontend/backend boundary — request/response shapes, not
// internal implementation types for either side.

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

export type UserRole = "OWNER";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export interface MeResponse {
  user: SafeUser;
}
