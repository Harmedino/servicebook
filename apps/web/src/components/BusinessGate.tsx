import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useMyBusiness } from "../lib/business";
import { setDisplayCurrency } from "../lib/format";

interface BusinessGateProps {
  children: ReactNode;
  /** true = must already have a business (dashboard); false = must NOT have one yet (onboarding) */
  requireBusiness: boolean;
}

export function BusinessGate({ children, requireBusiness }: BusinessGateProps) {
  const { data, isPending } = useMyBusiness();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600" aria-label="Loading" />
      </div>
    );
  }

  const hasBusiness = Boolean(data?.business);
  setDisplayCurrency(data?.business?.currency);

  if (requireBusiness && !hasBusiness) {
    return <Navigate to="/onboarding/business" replace />;
  }

  if (!requireBusiness && hasBusiness) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
