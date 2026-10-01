import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEscapeToClose } from "../../lib/useEscapeToClose";

function Panel({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  useEscapeToClose(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="pb-safe relative max-h-[90svh] w-full overflow-y-auto rounded-t-[1.75rem] bg-surface sm:max-w-xl sm:rounded-3xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 360 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <Panel onClose={onClose} label={label}>
          {children}
        </Panel>
      )}
    </AnimatePresence>,
    document.body,
  );
}
