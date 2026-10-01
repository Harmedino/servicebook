import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "../Logo";
import { useAuth } from "../../lib/auth-context";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  // { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/demo", label: "Live demo" },
];

function useScrolled(offset = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}

/** Jump to the top on page changes, or to #section when the link has one. */
function useScrollRestore() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

function Header() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 bg-ink transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_0_rgb(255_255_255/0.08),0_10px_30px_-12px_rgb(0_0_0/0.5)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo tone="light" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/65 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="marketing-nav" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 480, damping: 36 }} />
                  )}
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Link to="/dashboard" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-highlight px-5 text-sm font-semibold text-ink transition hover:bg-highlight-soft">
              Open dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white">
                Log in
              </Link>
              <Link to="/register" className="inline-flex h-10 items-center rounded-full bg-highlight px-5 text-sm font-semibold text-ink transition hover:bg-highlight-soft">
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-ink px-4 pb-8 md:hidden"
          >
            <nav className="mt-4 flex flex-col" aria-label="Mobile">
              {NAV.map((item, index) => (
                <motion.div key={item.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * index }}>
                  <Link
                    to={item.to}
                    className={`flex items-center justify-between border-b border-white/10 py-5 font-display text-3xl font-semibold ${
                      pathname === item.to ? "text-highlight" : "text-white"
                    }`}
                  >
                    {item.label}
                    <ArrowRight className="h-5 w-5 text-white/40" aria-hidden="true" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto grid gap-3 pt-10">
              {isAuthenticated ? (
                <Link to="/dashboard" className="flex h-12 items-center justify-center rounded-full bg-highlight text-base font-semibold text-ink">
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="flex h-12 items-center justify-center rounded-full bg-highlight text-base font-semibold text-ink">
                    Start free
                  </Link>
                  <Link to="/login" className="flex h-12 items-center justify-center rounded-full border border-white/20 text-base font-medium text-white">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      // { to: "/pricing", label: "Pricing" },
      { to: "/how-it-works", label: "How it works" },
      { to: "/about", label: "About ServiceBook" },
      { to: "/demo", label: "Live demo" },
      { to: "/roadmap", label: "Roadmap" },
      { to: "/design", label: "Design system" },
    ],
  },
  {
    title: "Built for",
    links: [
      { to: "/solutions#salons", label: "Salons & barbers" },
      { to: "/solutions#spas", label: "Spas & massage" },
      { to: "/solutions#clinics", label: "Clinics & therapists" },
      { to: "/solutions#fitness", label: "Fitness & coaching" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/register", label: "Create an account" },
      { to: "/login", label: "Log in" },
      { to: "/how-it-works#faq", label: "FAQ" },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Online booking, a shared calendar and a client list that fills itself, for businesses that run on appointments.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-white/70 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ServiceBook. All rights reserved.</p>
          <p>Built for businesses in Nigeria. Works in any currency and time zone.</p>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  useScrollRestore();
  return (
    <div className="flex min-h-screen flex-col bg-paper text-stone-900">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
