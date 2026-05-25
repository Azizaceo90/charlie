import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function relative(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy");
}

export function ago(iso: string): string {
  return `${formatDistanceToNow(new Date(iso))} ago`;
}

export function dateOnly(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

export function timeOnly(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

export function minutesToHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
