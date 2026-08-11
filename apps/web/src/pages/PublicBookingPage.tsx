import { useParams } from "react-router-dom";

export function PublicBookingPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">Book with {businessSlug}</h1>
        <p className="mt-1 text-sm text-stone-500">
          The booking wizard (service, staff, date/time, details) is built in a later step.
        </p>
      </div>
    </div>
  );
}
