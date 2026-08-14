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
  website?: string;
  timezone: string;
  logoUrl?: string;
  isPublicBookingEnabled: boolean;
  emailNotificationsEnabled: boolean;
  notifyCustomerOnBooking: boolean;
  notifyCustomerReminder: boolean;
  notifyOwnerOnBooking: boolean;
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

export interface CustomerProfile {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Only populated on list responses — total bookings ever made by this customer. */
  appointmentCount?: number;
  /** Only populated on list responses — ISO 8601 UTC instant of their most recent booking. */
  lastAppointmentAt?: string;
}

export interface CustomerResponse {
  customer: CustomerProfile;
}

export type CustomerSort = "newest" | "oldest" | "name";
export type CustomerAppointmentFilter = "all" | "upcoming" | "past";

export interface CustomerListResponse {
  customers: CustomerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface BookingProfile {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  /** ISO 8601 UTC instant */
  startTime: string;
  /** ISO 8601 UTC instant */
  endTime: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingResponse {
  booking: BookingProfile;
}

export interface BookingListResponse {
  bookings: BookingProfile[];
}

export interface AvailableSlotsResponse {
  /** ISO 8601 UTC instants, each a valid booking start time for the requested staff/service/date */
  slots: string[];
}

// ---- Public (unauthenticated) booking ----------------------------------

export interface PublicBusinessProfile {
  name: string;
  slug: string;
  description?: string;
  timezone: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

export interface PublicServiceProfile {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface PublicStaffProfile {
  id: string;
  name: string;
}

export interface PublicBusinessResponse {
  business: PublicBusinessProfile;
  services: PublicServiceProfile[];
  bookingEnabled: boolean;
}

export interface PublicStaffListResponse {
  staff: PublicStaffProfile[];
}

export interface PublicBookingCustomerInput {
  name: string;
  phone: string;
  email?: string;
}

export interface PublicCreateBookingInput {
  serviceId: string;
  staffId: string;
  /** ISO 8601 UTC instant */
  startTime: string;
  customer: PublicBookingCustomerInput;
  notes?: string;
}

export interface PublicBookingConfirmation {
  serviceName: string;
  staffName: string;
  /** ISO 8601 UTC instant */
  startTime: string;
  /** ISO 8601 UTC instant */
  endTime: string;
  customerName: string;
  customerEmail?: string;
  status: BookingStatus;
}

export interface PublicBookingConfirmationResponse {
  confirmation: PublicBookingConfirmation;
}
