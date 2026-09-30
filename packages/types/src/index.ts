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

/** Chat apps a business can be reached on from its booking page. */
export type SocialChannel = "whatsapp" | "instagram" | "facebook" | "tiktok" | "x" | "telegram" | "snapchat";

/** Handles per channel (WhatsApp: digits with country code). Only filled-in channels are present. */
export type SocialLinks = Partial<Record<SocialChannel, string>>;

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
  socials: SocialLinks;
  timezone: string;
  logoUrl?: string;
  coverImageUrl?: string;
  currency: string;
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
  imageUrl?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  /** Staff ids assigned to perform this service — derived from Staff.serviceIds, the single source of truth for this relationship. */
  staffIds: string[];
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
  /** True for the business owner's own staff profile. */
  isOwner?: boolean;
  serviceIds: string[];
  /** Only populated on list responses — today's non-cancelled appointment count, in the business's timezone. */
  todayAppointmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** GET/POST /api/staff/me: the owner's own staff profile, if any, and whether they've answered the prompt. */
export interface OwnerStaffResponse {
  staff: StaffProfile | null;
  answered: boolean;
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

/** How a customer got onto the list: added by staff, booked online, or joined via the invite link. */
export type CustomerSource = "manual" | "booking" | "link" | "chat";

export interface CustomerProfile {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  source?: CustomerSource;
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

export type CustomerSort = "recent" | "newest" | "oldest" | "name";
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
  customerPhone?: string;
  customerEmail?: string;
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
  /** The service's price at the moment this booking was created (or last rescheduled onto a different service) — never re-read live from the service, so later price changes don't rewrite history. Undefined on bookings created before this field existed. */
  price?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingResponse {
  booking: BookingProfile;
}

export interface BookingListResponse {
  bookings: BookingProfile[];
}

// ---- Dashboard summary -------------------------------------------------

export interface DashboardSetupStatus {
  businessInfoComplete: boolean;
  hasActiveService: boolean;
  hasActiveStaff: boolean;
  hasStaffAvailability: boolean;
  publicBookingEnabled: boolean;
}

export interface DashboardStaffToday {
  staffId: string;
  staffName: string;
  todayAppointmentCount: number;
}

export interface DashboardInsights {
  /** Value of non-cancelled, non-no-show bookings starting this calendar month (business timezone). */
  revenueThisMonth: number;
  revenueLastMonth: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  newCustomersThisMonth: number;
  newCustomersLastMonth: number;
  /** Share of past appointments this month marked NO_SHOW, 0-100. */
  noShowRateThisMonth: number;
  noShowRateLastMonth: number;
  /** One point per day for the last 30 days, oldest first. */
  revenueSeries: Array<{ date: string; revenue: number; bookings: number }>;
}

export interface DashboardSummary {
  businessName: string;
  currency: string;
  businessSlug: string;
  isPublicBookingEnabled: boolean;
  todayAppointmentCount: number;
  upcomingAppointmentCount: number;
  customerCount: number;
  activeServiceCount: number;
  inactiveServiceCount: number;
  activeStaffCount: number;
  pendingBookingCount: number;
  staffMissingAvailabilityCount: number;
  todayAppointments: BookingProfile[];
  /** A short preview of the next appointments after today — not the full count, see upcomingAppointmentCount. */
  upcomingAppointments: BookingProfile[];
  recentCustomers: CustomerProfile[];
  staffToday: DashboardStaffToday[];
  setupStatus: DashboardSetupStatus;
  insights: DashboardInsights;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
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
  coverImageUrl?: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  socials: SocialLinks;
}

export interface PublicServiceProfile {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  durationMinutes: number;
  price: number;
}

export interface PublicStaffProfile {
  id: string;
  name: string;
  avatarUrl?: string;
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

export interface PublicCustomerSignupInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface PublicCustomerSignupResponse {
  businessName: string;
  bookingEnabled: boolean;
}

export interface PublicCreateBookingInput {
  serviceId: string;
  /** Omit for "any available": the owner is preferred, then whoever is free. */
  staffId?: string;
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

export interface UploadResponse {
  /** Path to the stored image, e.g. /api/uploads/<id>. Prefix with the API base URL to display it. */
  url: string;
}

// ---- Chat enquiries ----------------------------------------------------------

export type EnquiryStatus = "new" | "contacted" | "booked" | "closed";

export interface PublicEnquiryInput {
  channel: SocialChannel;
  name: string;
  phone: string;
  email?: string;
  serviceId?: string;
  message?: string;
}

export interface PublicEnquiryResponse {
  /** Quoted in the chat message so the owner can match the DM to the enquiry. */
  reference: string;
}

export interface EnquiryProfile {
  id: string;
  customerId: string;
  channel: SocialChannel;
  reference: string;
  name: string;
  phone: string;
  email?: string;
  serviceName?: string;
  message?: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface EnquiryListResponse {
  enquiries: EnquiryProfile[];
  counts: Record<EnquiryStatus, number>;
}

export interface EnquiryResponse {
  enquiry: EnquiryProfile;
}
