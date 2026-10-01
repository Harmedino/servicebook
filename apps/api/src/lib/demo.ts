/** The shared demo business behind the website's "Live demo" and "Try the demo dashboard" buttons. */
export const DEMO_SLUG = "glow-studio-lekki";
export const DEMO_EMAIL = "demo@servicebook.app";
export const DEMO_PASSWORD = "password123";
/** Tunde's staff login, for trying the staff view of the demo. */
export const DEMO_STAFF_EMAIL = "tunde@demo.servicebook.app";

/**
 * Whether a business may send email. The demo never does: visitors book
 * with their real addresses, and a sample salon shouldn't email them.
 */
export function emailsAllowed(business: { emailNotificationsEnabled?: boolean | null; slug?: string | null }): boolean {
  return Boolean(business.emailNotificationsEnabled) && business.slug !== DEMO_SLUG;
}
