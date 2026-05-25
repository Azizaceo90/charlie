import {
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
} from "date-fns";

export type RangeKey =
  | "today"
  | "yesterday"
  | "2days"
  | "7days"
  | "30days"
  | "all";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "2days", label: "Last 2 days" },
  { key: "7days", label: "Last 7 days" },
  { key: "30days", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export interface Interval {
  start: Date;
  end: Date;
}

/** Returns the [start, end] interval for a given range key, relative to `now`. */
export function rangeInterval(key: RangeKey, now: Date = new Date()): Interval {
  const today = startOfDay(now);
  switch (key) {
    case "today":
      return { start: today, end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { start: y, end: endOfDay(y) };
    }
    case "2days":
      return { start: subDays(today, 1), end: endOfDay(now) };
    case "7days":
      return { start: subDays(today, 6), end: endOfDay(now) };
    case "30days":
      return { start: subDays(today, 29), end: endOfDay(now) };
    case "all":
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

export function isInRange(
  isoDate: string,
  key: RangeKey,
  now: Date = new Date()
): boolean {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const { start, end } = rangeInterval(key, now);
  return isWithinInterval(d, { start, end });
}
