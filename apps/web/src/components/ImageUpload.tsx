import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { imageSrc, uploadImage } from "../lib/images";

const SHAPES = {
  square: "h-24 w-24 rounded-2xl",
  circle: "h-24 w-24 rounded-full",
  wide: "aspect-[3/1] w-full rounded-2xl",
  card: "aspect-[4/3] w-full rounded-2xl",
} as const;

interface ImageUploadProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (value: string) => void;
  shape?: keyof typeof SHAPES;
  /** Longest edge after in-browser resizing. */
  maxSize?: number;
  disabled?: boolean;
}

export function ImageUpload({ label, hint, value, onChange, shape = "square", maxSize, disabled }: ImageUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = imageSrc(value);
  const inline = shape === "square" || shape === "circle";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG or WebP image");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      onChange(await uploadImage(file, maxSize));
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) void handleFile(event.dataTransfer.files[0]);
  }

  const busy = disabled || isUploading;

  return (
    <div>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className={`mt-1.5 ${inline ? "flex items-center gap-4" : "space-y-2"}`}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          disabled={busy}
          aria-label={src ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          className={`group relative flex shrink-0 items-center justify-center overflow-hidden border-2 transition-colors disabled:cursor-not-allowed ${SHAPES[shape]} ${
            src ? "border-transparent" : "border-dashed"
          } ${isDragging ? "border-brand-500 bg-brand-50" : src ? "" : "border-stone-300 bg-stone-50 hover:border-brand-400 hover:bg-brand-50/50"}`}
        >
          {src ? (
            <>
              <img src={src} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-stone-400">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
              {!inline && <span className="text-xs font-medium">Click or drop an image</span>}
            </span>
          )}
          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Uploading" />
            </span>
          )}
        </button>
        <div className={inline ? "min-w-0 space-y-1.5" : "flex items-center justify-between gap-3"}>
          {hint && <p className="text-xs text-stone-500">{hint}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
            >
              {src ? "Replace" : "Upload"}
            </button>
            {src && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
