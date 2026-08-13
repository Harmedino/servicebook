import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessOnboardingPage } from "./pages/BusinessOnboardingPage";
import { BusinessSettingsPage } from "./pages/BusinessSettingsPage";
import { ServicesPage } from "./pages/ServicesPage";
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

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
        path="/dashboard/settings"
        element={
          <OwnerRoute>
            <BusinessSettingsPage />
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
