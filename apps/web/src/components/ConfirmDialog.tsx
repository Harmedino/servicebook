import type { ReactNode } from "react";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { Button } from "./ui/Button";

interface ConfirmDialogProps {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A focused yes/no dialog, stacked above whatever modal opened it. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  isConfirming,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEscapeToClose(onCancel);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/40 px-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-[var(--shadow-elevated)]">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {children && <div className="mt-2 space-y-1 text-sm text-stone-600">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={destructive ? "danger" : "primary"} onClick={onConfirm} isLoading={isConfirming}>
            {isConfirming ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
