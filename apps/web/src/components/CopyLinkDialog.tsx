import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { Button } from "./ui/Button";

/** Copies with the Clipboard API, falling back to the selected input for browsers that block it. */
async function copyToClipboard(text: string, input?: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!input) return false;
    input.select();
    return document.execCommand("copy");
  }
}

/** Shows a link ready to copy by hand, for when the browser won't let us copy it automatically. */
export function CopyLinkDialog({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  useEscapeToClose(onClose);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  async function copy() {
    if (await copyToClipboard(url, inputRef.current)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="animate-fade-in-up w-full max-w-sm rounded-xl border border-stone-200 bg-surface p-6 shadow-[var(--shadow-elevated)]"
      >
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-600">Your browser didn&apos;t let us copy it automatically. Copy it from here instead.</p>
        <input
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-4 h-11 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 text-sm text-stone-800"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button type="button" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Copy-a-link behaviour shared by every "Copy link" button: `copied` flips for
 * a moment on success, and if the browser blocks the clipboard `dialog` shows
 * the link in a modal instead. Render `dialog` anywhere in the component.
 */
export function useCopyLink(): { copied: boolean; copy: (url: string, title: string) => Promise<void>; dialog: ReactNode } {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<{ url: string; title: string } | null>(null);

  const copy = useCallback(async (url: string, title: string) => {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      setFallback({ url, title });
    }
  }, []);

  const dialog = fallback ? <CopyLinkDialog title={fallback.title} url={fallback.url} onClose={() => setFallback(null)} /> : null;
  return { copied, copy, dialog };
}
