import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useDemoLogin } from "../../lib/demo";
import type { StockPhoto } from "./photos";

/** Fades content up once as it scrolls into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-sm font-medium ${onDark ? "text-highlight" : "text-brand-700"}`}>{children}</p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  onDark = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  onDark?: boolean;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
      <h2 className={`mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem] ${onDark ? "text-white" : "text-stone-900"}`}>{title}</h2>
      {description && <p className={`mt-4 text-base leading-relaxed sm:text-lg ${onDark ? "text-white/60" : "text-stone-600"}`}>{description}</p>}
    </div>
  );
}

/** A real screenshot in a minimal browser window. */
export function BrowserFrame({ src, alt, path = "dashboard", className = "" }: { src: string; alt: string; path?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-stone-900/10 bg-white shadow-[var(--shadow-screen)] sm:rounded-2xl ${className}`}>
      <div className="flex items-center gap-3 border-b border-stone-200/80 bg-[#f4f4f2] px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="mx-auto hidden max-w-xs flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[11px] text-[#6b6b6b] sm:block">
          servicebook · {path}
        </span>
        <span className="hidden w-10 sm:block" />
      </div>
      <img src={src} alt={alt} loading="lazy" decoding="async" width={1440} height={900} className="block w-full" />
    </div>
  );
}

/** A real mobile screenshot in a phone body, with a status bar so the notch never covers the screenshot. */
export function PhoneFrame({ src, alt, className = "", bar = "light" }: { src: string; alt: string; className?: string; bar?: "light" | "dark" }) {
  return (
    <div className={`relative rounded-[2.4rem] bg-[#0b0f0d] p-[7px] shadow-[var(--shadow-screen)] ring-1 ring-white/10 ${className}`}>
      <div className="overflow-hidden rounded-[1.95rem]">
        <div className={`flex h-7 items-center justify-center ${bar === "dark" ? "bg-ink" : "bg-[#fafaf9]"}`}>
          <span className="h-[14px] w-[30%] rounded-full bg-[#0b0f0d]" />
        </div>
        <img src={src} alt={alt} loading="lazy" decoding="async" width={390} height={844} className="block w-full" />
      </div>
    </div>
  );
}

/** A real photo, cropped by `imgClassName`'s aspect ratio, with its photographer credited underneath. */
export function PhotoFigure({
  photo,
  sizes,
  className = "",
  imgClassName = "aspect-[4/3]",
  eager = false,
  onDark = false,
}: {
  photo: StockPhoto;
  sizes: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  onDark?: boolean;
}) {
  return (
    <figure className={className}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`block w-full rounded-2xl object-cover sm:rounded-3xl ${imgClassName}`}
      />
      <figcaption className={`mt-2.5 text-xs ${onDark ? "text-white/45" : "text-stone-500"}`}>
        Photo:{" "}
        <a
          href={photo.credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 ${onDark ? "decoration-white/25 hover:text-white/80" : "decoration-stone-300 hover:text-stone-800"}`}
        >
          {photo.credit.name}
        </a>{" "}
        on Pexels
      </figcaption>
    </figure>
  );
}

export function PrimaryCta({ children = "Start free", to = "/register", className = "w-full sm:w-auto" }: { children?: ReactNode; to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-highlight px-6 text-[15px] font-semibold text-ink transition hover:bg-highlight-soft ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** Opens the shared demo account's dashboard. */
export function DemoButton({ className = "", onDark = true, children = "Try the demo dashboard" }: { className?: string; onDark?: boolean; children?: ReactNode }) {
  const demo = useDemoLogin();
  return (
    <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto sm:items-start">
      <button
        type="button"
        onClick={() => void demo.start()}
        disabled={demo.isLoading}
        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-6 text-[15px] font-medium transition disabled:opacity-70 sm:w-auto ${
          onDark ? "border-white/20 text-white hover:bg-white/10" : "border-stone-300 text-stone-800 hover:bg-stone-100"
        } ${className}`}
      >
        {demo.isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {demo.isLoading ? "Opening demo…" : children}
      </button>
      {demo.error && <p className={`text-xs ${onDark ? "text-amber-300" : "text-red-600"}`}>{demo.error}</p>}
    </div>
  );
}

export function CtaBand({
  title = "Put your booking link in your bio today.",
  description = "Setting up takes a few minutes, and it's free while we're in early access.",
}: {
  title?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <Reveal className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[2rem] bg-ink px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-[2.6rem]">{title}</h2>
          <p className="mt-4 text-base text-white/60 sm:text-lg">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center">
          <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-full bg-highlight px-6 text-[15px] font-semibold text-ink transition hover:bg-highlight-soft">
            Create your booking page
          </Link>
          <Link to="/demo" className="group inline-flex items-center justify-center gap-1.5 text-[15px] font-medium text-white">
            Try the demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
