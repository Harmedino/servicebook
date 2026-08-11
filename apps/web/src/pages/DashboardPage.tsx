export function DashboardPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold text-stone-900">ServiceBook</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">
          Owner features (bookings, services, staff, customers) land in upcoming steps.
        </p>
      </main>
    </div>
  );
}
