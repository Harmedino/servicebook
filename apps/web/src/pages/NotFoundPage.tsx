import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-stone-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Page not found</h1>
      <Link to="/login" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        Back to login
      </Link>
    </div>
  );
}
