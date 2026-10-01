import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useMyBusiness } from "../lib/business";
import { imageSrc } from "../lib/images";
import { BRAND_PRESETS, inkOn } from "../lib/brand";
import { BackLink } from "../components/ui/BackLink";
import { LogoMark } from "../components/Logo";

type PosterKind = "book" | "join";
type PosterSize = "A5" | "A4";

const COPY: Record<PosterKind, { path: string; headline: string; steps: string[] }> = {
  book: {
    path: "book",
    headline: "Book your next appointment",
    steps: ["Point your phone camera at the code", "Pick a service and a time", "Pay when you visit"],
  },
  join: {
    path: "join",
    headline: "Join our client list",
    steps: ["Point your phone camera at the code", "Add your name and number", "Hear from us about appointments"],
  },
};

/** /poster — a printable sign with the business's QR code, for the counter, mirror or window. */
export function PosterPage() {
  const { data } = useMyBusiness();
  const business = data?.business;
  const [kind, setKind] = useState<PosterKind>("book");
  const [size, setSize] = useState<PosterSize>("A5");
  const [headline, setHeadline] = useState(COPY.book.headline);
  const [qr, setQr] = useState<string | null>(null);

  const color = business?.brandColor ?? BRAND_PRESETS[0];
  const ink = inkOn(color);
  const url = business ? `${window.location.origin}/${COPY[kind].path}/${business.slug}` : "";
  const shortUrl = url.replace(/^https?:\/\//, "");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void import("qrcode")
      .then((QRCode) => QRCode.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0c1a14", light: "#ffffff" } }))
      .then((data) => !cancelled && setQr(data));
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    document.title = business ? `Poster · ${business.name}` : "Poster";
  }, [business]);

  if (!business) return <div className="p-10 text-sm text-stone-500">Loading…</div>;

  const option = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "bg-ink text-white dark:bg-highlight dark:text-ink" : "text-stone-600 hover:bg-stone-200/70"}`;

  return (
    <div className="min-h-screen bg-stone-100 print:bg-white">
      {/* Page size for printing; the preview below is only scaled on screen. */}
      <style>{`@page { size: ${size}; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="mx-auto max-w-5xl px-4 py-6 print:hidden">
        <BackLink to="/settings?tab=booking-page" label="Settings" />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Printable poster</h1>
            <p className="mt-1 text-sm text-stone-500">For the counter, a mirror or the window. Customers scan it with their phone camera.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-700 dark:bg-highlight dark:text-ink"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Print or save as PDF
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-stone-200 bg-surface p-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Link</span>
            {(["book", "join"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setKind(value);
                  setHeadline(COPY[value].headline);
                }}
                className={option(kind === value)}
              >
                {value === "book" ? "Booking page" : "Join client list"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Size</span>
            {(["A5", "A4"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setSize(value)} className={option(size === value)}>
                {value}
              </button>
            ))}
          </div>
          <label className="flex min-w-[240px] flex-1 items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Headline</span>
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              maxLength={48}
              className="h-9 flex-1 rounded-lg border border-stone-300 bg-surface px-3 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">The colour comes from Settings → Booking page → Your colour.</p>
      </div>

      {/* The poster. Sized in mm so it prints exactly; scaled down to fit on screen. */}
      <div className="flex justify-center px-4 pb-12 print:block print:p-0">
        <div className="origin-top scale-[0.55] sm:scale-75 lg:scale-90 print:scale-100" style={{ marginBottom: "-25%" }}>
          <article
            className="flex flex-col overflow-hidden bg-white text-[#0c1a14] shadow-2xl print:shadow-none"
            style={{ width: size === "A5" ? "148mm" : "210mm", height: size === "A5" ? "210mm" : "297mm" }}
          >
            <header className="flex flex-col items-center px-[10%] pb-[7%] pt-[9%] text-center" style={{ backgroundColor: color, color: ink }}>
              {business.logoUrl ? (
                <img src={imageSrc(business.logoUrl)} alt="" className="h-[18mm] w-[18mm] rounded-2xl object-cover" />
              ) : (
                <span className="flex h-[18mm] w-[18mm] items-center justify-center rounded-2xl bg-white/15 text-[9mm] font-bold">{business.name.charAt(0)}</span>
              )}
              <p className="mt-[4mm] text-[6mm] font-semibold leading-tight">{business.name}</p>
              <h2 className="mt-[3mm] font-display text-[10mm] font-semibold leading-[1.05] tracking-tight">{headline || COPY[kind].headline}</h2>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center px-[10%]">
              <div className="rounded-[5mm] border-[0.6mm] border-stone-200 p-[4mm]">
                {qr ? <img src={qr} alt={`QR code for ${shortUrl}`} className="block h-[62mm] w-[62mm]" /> : <div className="h-[62mm] w-[62mm] animate-pulse bg-stone-100" />}
              </div>
              <p className="mt-[4mm] text-center text-[4.2mm] font-semibold">{shortUrl}</p>
            </div>

            <ol className="mx-[10%] mb-[7mm] grid grid-cols-3 gap-[4mm] text-[3.4mm] leading-snug">
              {COPY[kind].steps.map((step, index) => (
                <li key={step} className="flex flex-col items-center text-center">
                  <span className="mb-[1.5mm] flex h-[7mm] w-[7mm] items-center justify-center rounded-full text-[3.6mm] font-bold" style={{ backgroundColor: color, color: ink }}>
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <footer className="flex items-center justify-center gap-[1.5mm] pb-[6mm] text-[2.8mm] text-stone-400">
              <LogoMark className="h-[3.5mm] w-[3.5mm]" /> Booking by ServiceBook
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
