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

export interface BusinessProfile {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  timezone: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessResponse {
  business: BusinessProfile;
}

export interface MyBusinessResponse {
  business: BusinessProfile | null;
}

export interface ServiceProfile {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceResponse {
  service: ServiceProfile;
}

export interface ServiceListResponse {
  services: ServiceProfile[];
}

export interface StaffProfile {
  id: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffResponse {
  staff: StaffProfile;
}

export interface StaffListResponse {
  staff: StaffProfile[];
}

export interface BusinessHoursEntry {
  /** 0 = Sunday ... 6 = Saturday */
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

export interface BusinessHoursResponse {
  hours: BusinessHoursEntry[];
}

export interface StaffAvailabilityEntry {
  /** 0 = Sunday ... 6 = Saturday */
  dayOfWeek: number;
  isOff: boolean;
  startTime: string;
  endTime: string;
}

export interface StaffAvailabilityResponse {
  availability: StaffAvailabilityEntry[];
}
