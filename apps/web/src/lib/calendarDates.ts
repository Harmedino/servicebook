export function dayOfWeekFromKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return toKey(next);
}

export function addMonthsToKey(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(year, month - 1 + months, day);
  return toKey(next);
}

/** Monday-based start of the week containing dateKey. */
export function startOfWeekKey(dateKey: string): string {
  const dow = dayOfWeekFromKey(dateKey); // 0=Sunday..6=Saturday
  const diffFromMonday = dow === 0 ? 6 : dow - 1;
  return addDaysToKey(dateKey, -diffFromMonday);
}

export function startOfMonthKey(dateKey: string): string {
  const [year, month] = dateKey.split("-");
  return `${year}-${month}-01`;
}

export function daysInMonth(dateKey: string): number {
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
