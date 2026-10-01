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
  title?: string;
  bio?: string;
  /** Where they work, when it isn't the business address. */
  location?: string;
  /** Average customer rating (1–5) and how many reviews it's based on. */
  rating?: number;
  reviewCount?: number;
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
  title?: string;
  rating?: number;
  reviewCount?: number;
}

export interface PublicBusinessResponse {
  business: PublicBusinessProfile;
  services: PublicServiceProfile[];
  bookingEnabled: boolean;
  /** Opening hours, Sunday (0) to Saturday (6). */
  hours: Array<{ dayOfWeek: number; isClosed: boolean; openTime?: string; closeTime?: string }>;
  /** Whole-business closures in the next 60 days. */
  closures: Array<{ allDay: boolean; startDate: string; endDate: string; startTime?: string; endTime?: string }>;
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
  /** Opens the customer's private booking page (/my-booking/:token) with the chat. */
  accessToken: string;
  /** Opens the customer's page with all their appointments here (/c/:token). */
  customerToken: string;
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

// ---- Booking chat ------------------------------------------------------------

export type MessageSender = "customer" | "business";

export interface ChatMessage {
  id: string;
  from: MessageSender;
  body: string;
  /** Sent automatically (welcome message, demo replies) rather than typed by a person. */
  automated: boolean;
  createdAt: string;
}

export interface ChatMessageResponse {
  message: ChatMessage;
}

/** GET /api/public/bookings/:token — what the customer sees on their private booking page. */
export interface PublicBookingThreadResponse {
  booking: {
    serviceName: string;
    staffName: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    price?: number;
    customerName: string;
    canCancel: boolean;
    /** Completed and not yet reviewed. */
    canReview: boolean;
    review?: { rating: number; comment?: string };
  };
  /** Opens the customer's page with all their appointments here (/c/:token). */
  customerToken: string;
  business: {
    name: string;
    slug: string;
    logoUrl?: string;
    phone?: string;
    address?: string;
    timezone: string;
    currency: string;
  };
  messages: ChatMessage[];
}

/** GET /api/bookings/:id/messages — the owner's view of one booking's chat. */
export interface BookingMessagesResponse {
  messages: ChatMessage[];
  /** For sharing the customer's private booking link. */
  accessToken: string;
}

export interface ConversationSummary {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  startTime: string;
  status: BookingStatus;
  lastMessage: ChatMessage;
  unread: number;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  unread: number;
}

// ---- Roadmap -----------------------------------------------------------------

export type IdeaStatus = "idea" | "planned" | "in_progress" | "shipped";
export type IdeaKind = "feature" | "design";

export interface IdeaProfile {
  id: string;
  title: string;
  description?: string;
  kind: IdeaKind;
  status: IdeaStatus;
  votes: number;
  /** Business name of the owner who suggested it, if it came from a user. */
  authorName?: string;
  shippedAt?: string;
  createdAt: string;
  hidden?: boolean;
}

export interface RoadmapResponse {
  items: IdeaProfile[];
  /** Ids the caller has voted for. */
  myVotes: string[];
  isAdmin: boolean;
  canSuggest: boolean;
}

export interface IdeaResponse {
  item: IdeaProfile;
  voted?: boolean;
}

// ---- Notifications -----------------------------------------------------------

export type NotificationType = "booking" | "cancellation" | "message" | "enquiry" | "signup" | "review";

export interface NotificationProfile {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Dashboard path to open when tapped. */
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationProfile[];
  unread: number;
}

// ---- Showcase and reviews ------------------------------------------------------

export interface WorkPostProfile {
  id: string;
  imageUrl: string;
  title: string;
  caption?: string;
  featured: boolean;
  staff: { id: string; name: string; avatarUrl?: string };
  service?: { id: string; name: string };
  createdAt: string;
}

export interface ReviewProfile {
  id: string;
  rating: number;
  comment?: string;
  reply?: string;
  customerName: string;
  staffId: string;
  staffName?: string;
  serviceName?: string;
  createdAt: string;
  hidden?: boolean;
}

export interface RatingSummary {
  rating: number;
  count: number;
}

export interface ShowcaseStaff extends PublicStaffProfile {
  bio?: string;
  /** Their own work location, or the business address. */
  location?: string;
  /** Names of the active services they do, for display. */
  services: string[];
  serviceIds: string[];
}

/** GET /api/public/businesses/:slug/showcase */
export interface PublicShowcaseResponse {
  posts: WorkPostProfile[];
  staff: ShowcaseStaff[];
  reviews: ReviewProfile[];
  summary: RatingSummary;
}

/** GET /api/public/businesses/:slug/staff/:staffId */
export interface PublicStaffDetailResponse {
  staff: ShowcaseStaff;
  /** Their usual week, Sunday (0) to Saturday (6), in the business's time zone. */
  hours: Array<{ dayOfWeek: number; isOff: boolean; startTime?: string; endTime?: string }>;
  timezone: string;
  /** Coming time off in the next 60 days (theirs or the whole business's). Never the private note. */
  away: Array<{ allDay: boolean; startDate: string; endDate: string; startTime?: string; endTime?: string }>;
  serviceRatings: Array<{ serviceId: string; serviceName: string } & RatingSummary>;
  posts: WorkPostProfile[];
  reviews: ReviewProfile[];
}

export interface WorkPostListResponse {
  posts: WorkPostProfile[];
}

export interface ReviewListResponse {
  reviews: ReviewProfile[];
  summary: RatingSummary;
}

// ---- Customer's own page (/c/:token) ------------------------------------------

export interface CustomerPortalAppointment {
  /** Opens this appointment's page with its chat (/my-booking/:token). */
  accessToken: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  price?: number;
  /** Completed and not yet rated. */
  canReview: boolean;
  rating?: number;
}

/** GET /api/public/customers/:token */
export interface CustomerPortalResponse {
  customer: { name: string; phone: string; email?: string };
  business: {
    name: string;
    slug: string;
    logoUrl?: string;
    coverImageUrl?: string;
    phone?: string;
    address?: string;
    timezone: string;
    currency: string;
    bookingEnabled: boolean;
  };
  upcoming: CustomerPortalAppointment[];
  /** Most recent first. */
  past: CustomerPortalAppointment[];
  /** Completed visits, all time. */
  visits: number;
}

/** GET /api/customers/:id/portal-link */
export interface CustomerPortalLinkResponse {
  token: string;
}

// ---- Time off ------------------------------------------------------------------

export interface TimeOffProfile {
  id: string;
  /** Missing = the whole business is closed. */
  staffId?: string;
  staffName?: string;
  allDay: boolean;
  /** yyyy-MM-dd, business-local. */
  startDate: string;
  endDate: string;
  /** HH:mm, only when not all day. */
  startTime?: string;
  endTime?: string;
  startAt: string;
  endAt: string;
  note?: string;
}

export interface TimeOffInput {
  /** Omit for the whole business. */
  staffId?: string;
  startDate: string;
  endDate: string;
  /** Both or neither; neither = all day. */
  startTime?: string;
  endTime?: string;
  note?: string;
}

export interface TimeOffListResponse {
  timeOff: TimeOffProfile[];
}

/** Bookings already in the new time off. They're kept; the owner decides what to do. */
export interface TimeOffCreatedResponse {
  timeOff: TimeOffProfile;
  clashes: Array<{ id: string; customerName: string; serviceName: string; staffName: string; startTime: string }>;
}
