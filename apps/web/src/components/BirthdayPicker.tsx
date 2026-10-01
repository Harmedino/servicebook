const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Day and month only ("MM-DD"); "" when not set. */
export function BirthdayPicker({ value, onChange, disabled, className }: { value: string; onChange: (value: string) => void; disabled?: boolean; className: string }) {
  const [month, day] = value ? value.split("-") : ["", ""];
  const days = month ? DAYS_IN_MONTH[Number(month) - 1] : 31;
  const set = (nextMonth: string, nextDay: string) => {
    // Clearing either part clears the birthday.
    if (!nextMonth || !nextDay) return onChange("");
    const capped = String(Math.min(Number(nextDay), DAYS_IN_MONTH[Number(nextMonth) - 1])).padStart(2, "0");
    onChange(`${nextMonth}-${capped}`);
  };
  return (
    <div className="mt-1 grid grid-cols-[1fr_6rem] gap-2">
      <select value={month} onChange={(event) => set(event.target.value, day || "01")} disabled={disabled} aria-label="Birthday month" className={className}>
        <option value="">Month</option>
        {MONTHS.map((name, index) => (
          <option key={name} value={String(index + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </select>
      <select value={day} onChange={(event) => set(month, event.target.value)} disabled={disabled || !month} aria-label="Birthday day" className={className}>
        <option value="">Day</option>
        {Array.from({ length: days }, (_, index) => String(index + 1).padStart(2, "0")).map((d) => (
          <option key={d} value={d}>
            {Number(d)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "14 March" from "03-14". */
export function birthdayLabel(value: string): string {
  const [month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
