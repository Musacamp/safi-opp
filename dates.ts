/** Date/time helpers for follow-up scheduling and display. */

export type FollowUpOption =
  | "later_today"
  | "tomorrow"
  | "3_days"
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "3_months"
  | "custom";

/** Calculate the next follow-up date from a base date + option. */
export function calculateFollowUpDate(
  option: FollowUpOption,
  baseDate: Date = new Date(),
  customDate?: Date
): Date {
  const d = new Date(baseDate);
  switch (option) {
    case "later_today":
      // Same day, later time — return as-is (caller can set a specific time)
      return d;
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      return d;
    case "3_days":
      d.setDate(d.getDate() + 3);
      return d;
    case "1_week":
      d.setDate(d.getDate() + 7);
      return d;
    case "2_weeks":
      d.setDate(d.getDate() + 14);
      return d;
    case "1_month":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "3_months":
      d.setMonth(d.getMonth() + 3);
      return d;
    case "custom":
      return customDate ?? d;
    default:
      return d;
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  const diff = today.getTime() - due.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isToday(iso: string | null): boolean {
  if (!iso) return false;
  return isSameDay(new Date(iso), new Date());
}

export function isPastDue(iso: string | null): boolean {
  if (!iso) return false;
  return startOfDay(new Date(iso)).getTime() < startOfDay(new Date()).getTime();
}

export function relativeDay(iso: string | null): string {
  if (!iso) return "";
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(iso));
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `In ${diff} days`;
}
