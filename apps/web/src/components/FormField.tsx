interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function FormField({ label, type, value, onChange, error, autoComplete, disabled }: FormFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100 ${
          error ? "border-red-400" : "border-stone-300 focus:border-brand-500"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
