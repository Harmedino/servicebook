import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
import { useAuth } from "./lib/auth-context";
import { HomePage } from "./pages/marketing/HomePage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BusinessGate } from "./components/BusinessGate";

// Each page is its own chunk so the first load stays light. Every chunk is then
// fetched quietly in the background, so moving between pages never waits.
const pageLoaders: Array<() => Promise<unknown>> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  pageLoaders.push(load);
  return lazy(load);
}

function usePreloadPages() {
  useEffect(() => {
    const preload = () => pageLoaders.forEach((load) => void load().catch(() => undefined));
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, []);
}
const LoginPage = lazyPage(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazyPage(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazyPage(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const BusinessOnboardingPage = lazyPage(() => import("./pages/BusinessOnboardingPage").then((m) => ({ default: m.BusinessOnboardingPage })));
const SettingsPage = lazyPage(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ServicesPage = lazyPage(() => import("./pages/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazyPage(() => import("./pages/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const StaffPage = lazyPage(() => import("./pages/StaffPage").then((m) => ({ default: m.StaffPage })));
const StaffDetailPage = lazyPage(() => import("./pages/StaffDetailPage").then((m) => ({ default: m.StaffDetailPage })));
const CustomersPage = lazyPage(() => import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazyPage(() => import("./pages/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })));
const BookingsPage = lazyPage(() => import("./pages/BookingsPage").then((m) => ({ default: m.BookingsPage })));
const CalendarPage = lazyPage(() => import("./pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const PublicBookingPage = lazyPage(() => import("./pages/PublicBookingPage").then((m) => ({ default: m.PublicBookingPage })));
const FeaturesPage = lazyPage(() => import("./pages/marketing/FeaturesPage").then((m) => ({ default: m.FeaturesPage })));
const SolutionsPage = lazyPage(() => import("./pages/marketing/SolutionsPage").then((m) => ({ default: m.SolutionsPage })));
// Pricing is on hold while everything is free in early access; /pricing redirects to How it works.
// const PricingPage = lazy(() => import("./pages/marketing/PricingPage").then((m) => ({ default: m.PricingPage })));
const HowItWorksPage = lazyPage(() => import("./pages/marketing/HowItWorksPage").then((m) => ({ default: m.HowItWorksPage })));
const JoinPage = lazyPage(() => import("./pages/JoinPage").then((m) => ({ default: m.JoinPage })));
const MyBookingPage = lazyPage(() => import("./pages/MyBookingPage").then((m) => ({ default: m.MyBookingPage })));
const RoadmapPage = lazyPage(() => import("./pages/marketing/RoadmapPage").then((m) => ({ default: m.RoadmapPage })));
const DesignPage = lazyPage(() => import("./pages/marketing/DesignPage").then((m) => ({ default: m.DesignPage })));
const DemoPage = lazyPage(() => import("./pages/marketing/DemoPage").then((m) => ({ default: m.DemoPage })));
const DemoOwnerPage = lazyPage(() => import("./pages/DemoOwnerPage").then((m) => ({ default: m.DemoOwnerPage })));
const ShowcasePage = lazyPage(() => import("./pages/ShowcasePage").then((m) => ({ default: m.ShowcasePage })));
const InboxPage = lazyPage(() => import("./pages/InboxPage").then((m) => ({ default: m.InboxPage })));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600" aria-label="Loading" />
    </div>
  );
}

function OwnerRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <BusinessGate requireBusiness>{children}</BusinessGate>
    </ProtectedRoute>
  );
}

/** Keeps already-logged-in users off /login and /register — they land on the app instead. */
function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <PageSpinner />
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function App() {
  usePreloadPages();
  return (
    <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/solutions" element={<SolutionsPage />} />
      {/* <Route path="/pricing" element={<PricingPage />} /> */}
      <Route path="/pricing" element={<Navigate to="/how-it-works" replace />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/demo/owner" element={<DemoOwnerPage />} />
      <Route path="/my-booking/:token" element={<MyBookingPage />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
      <Route path="/book/:businessSlug" element={<PublicBookingPage />} />
      <Route path="/join/:businessSlug" element={<JoinPage />} />
      <Route
        path="/onboarding/business"
        element={
          <ProtectedRoute>
            <BusinessGate requireBusiness={false}>
              <BusinessOnboardingPage />
            </BusinessGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <OwnerRoute>
            <DashboardPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <OwnerRoute>
            <SettingsPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/services"
        element={
          <OwnerRoute>
            <ServicesPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/services/:serviceId"
        element={
          <OwnerRoute>
            <ServiceDetailPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <OwnerRoute>
            <StaffPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/staff/:staffId"
        element={
          <OwnerRoute>
            <StaffDetailPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <OwnerRoute>
            <CustomersPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/customers/:customerId"
        element={
          <OwnerRoute>
            <CustomerDetailPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <OwnerRoute>
            <BookingsPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/showcase"
        element={
          <OwnerRoute>
            <ShowcasePage />
          </OwnerRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <OwnerRoute>
            <InboxPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <OwnerRoute>
            <CalendarPage />
          </OwnerRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
