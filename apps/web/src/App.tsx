import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth-context";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessOnboardingPage } from "./pages/BusinessOnboardingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { StaffPage } from "./pages/StaffPage";
import { StaffDetailPage } from "./pages/StaffDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { BookingsPage } from "./pages/BookingsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { PublicBookingPage } from "./pages/PublicBookingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BusinessGate } from "./components/BusinessGate";

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
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <span className="text-sm text-stone-500">Loading…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
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
  );
}
