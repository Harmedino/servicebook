import type { ReactNode } from "react";
import { useEscapeToClose } from "../lib/useEscapeToClose";

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
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {children && <div className="mt-2 space-y-1 text-sm text-stone-600">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {isConfirming ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
