import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { useAuth } from "./lib/auth-context";
import { LandingPage } from "./pages/LandingPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BusinessGate } from "./components/BusinessGate";

// Each page loads on demand, so the public booking page and landing page stay light.
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const BusinessOnboardingPage = lazy(() => import("./pages/BusinessOnboardingPage").then((m) => ({ default: m.BusinessOnboardingPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const StaffPage = lazy(() => import("./pages/StaffPage").then((m) => ({ default: m.StaffPage })));
const StaffDetailPage = lazy(() => import("./pages/StaffDetailPage").then((m) => ({ default: m.StaffDetailPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })));
const BookingsPage = lazy(() => import("./pages/BookingsPage").then((m) => ({ default: m.BookingsPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const PublicBookingPage = lazy(() => import("./pages/PublicBookingPage").then((m) => ({ default: m.PublicBookingPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

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
  return (
    <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
