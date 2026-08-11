import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useMyBusiness } from "../lib/business";

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
        <span className="text-sm text-stone-500">Loading…</span>
      </div>
    );
  }

  const hasBusiness = Boolean(data?.business);

  if (requireBusiness && !hasBusiness) {
    return <Navigate to="/onboarding/business" replace />;
  }

  if (!requireBusiness && hasBusiness) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
