export const CENTRE_TZ = process.env.NEXT_PUBLIC_CENTRE_TIMEZONE || "UTC";
const LOCALE = "en-US";

const pad = (n: number) => String(n).padStart(2, "0");

/** "Sat, Oct 10, 10:00 AM" */
export function formatWorkshopTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CENTRE_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Oct 9, 10:42 AM" */
export function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: CENTRE_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function zonedParts(date: Date, tz: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

/** How far ahead of UTC the time zone is at this instant, in milliseconds. */
function offsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-12T10:00" typed in the centre's time zone -> the real UTC instant. */
export function zonedInputToUtc(input: string, tz: string = CENTRE_TZ): Date {
  const [datePart, timePart] = input.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  const first = offsetMs(new Date(wallClockAsUtc), tz);
  let utc = wallClockAsUtc - first;
  const second = offsetMs(new Date(utc), tz);
  if (second !== first) utc = wallClockAsUtc - second; // crossed a daylight-saving change
  return new Date(utc);
}

/** A UTC ISO string -> "2026-10-12T10:00" in the centre's time zone (for <input type="datetime-local">). */
export function utcToZonedInput(iso: string, tz: string = CENTRE_TZ): string {
  const p = zonedParts(new Date(iso), tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Start of a calendar day ("2026-10-12") in the centre's time zone, as UTC. */
export function dayStartUtc(day: string, tz: string = CENTRE_TZ): Date {
  return zonedInputToUtc(`${day}T00:00`, tz);
}

/** Start of the following day, used as an exclusive upper bound for "to" filters. */
export function nextDayStartUtc(day: string, tz: string = CENTRE_TZ): Date {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return zonedInputToUtc(`${d.toISOString().slice(0, 10)}T00:00`, tz);
}

/** Monday to Sunday of the current week in the centre's time zone, as "YYYY-MM-DD". */
export function thisWeekRange(tz: string = CENTRE_TZ): { from: string; to: string } {
  const p = zonedParts(new Date(), tz);
  const today = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - sinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}