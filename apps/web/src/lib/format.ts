// Prices display in the current business's currency. BusinessGate and the public
// booking page call setDisplayCurrency once they know which business is active.
let displayCurrency = "USD";

export function setDisplayCurrency(currency: string | undefined): void {
  if (currency) displayCurrency = currency;
}

export const CURRENCIES: Array<{ code: string; label: string }> = [
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GHS", label: "Ghanaian Cedi (GH₵)" },
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "CAD", label: "Canadian Dollar (CA$)" },
];

/** Best-guess currency for a timezone, used to pre-fill onboarding. */
export function currencyForTimezone(timezone: string): string {
  if (timezone === "Africa/Lagos") return "NGN";
  if (timezone === "Africa/Accra") return "GHS";
  if (timezone === "Africa/Nairobi") return "KES";
  if (timezone === "Africa/Johannesburg") return "ZAR";
  if (timezone === "Europe/London") return "GBP";
  if (timezone.startsWith("Europe/")) return "EUR";
  if (["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax"].includes(timezone)) return "CAD";
  return "USD";
}

export function formatPrice(price: number, currency: string = displayCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // "₦5,000" rather than "NGN 5,000".
    currencyDisplay: "narrowSymbol",
    // Whole amounts read better without kobo/cents.
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

/** Short form for tight spaces: ₦4.3M, $12K. */
export function formatPriceCompact(price: number, currency: string = displayCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(price);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
