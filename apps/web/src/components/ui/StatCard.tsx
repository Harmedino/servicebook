import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, caption, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{value}</p>
      {caption && <p className="mt-0.5 text-xs text-stone-500">{caption}</p>}
    </Card>
  );
}
