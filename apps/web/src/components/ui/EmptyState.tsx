import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      {Icon && (
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <h2 className={`text-base font-semibold text-stone-900 ${Icon ? "mt-3" : ""}`}>{title}</h2>
      {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
