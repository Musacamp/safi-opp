export interface StatusConfig {
  [key: string]: { label: string; bg: string; text: string };
}

export const statusConfig: StatusConfig = {
  new: { label: "New", bg: "bg-slate-100", text: "text-slate-600" },
  due_today: { label: "Due Today", bg: "bg-ocean-100", text: "text-ocean-700" },
  overdue: { label: "Overdue", bg: "bg-danger-50", text: "text-danger-700" },
  called_today: { label: "Called Today", bg: "bg-brand-100", text: "text-brand-700" },
  has_vacancy: { label: "Has Vacancy", bg: "bg-success-50", text: "text-success-700" },
  no_vacancy: { label: "No Vacancy", bg: "bg-danger-50", text: "text-danger-600" },
  call_later: { label: "Call Later", bg: "bg-warning-50", text: "text-warning-700" },
  follow_up_scheduled: {
    label: "Follow-up Scheduled",
    bg: "bg-ocean-50",
    text: "text-ocean-600",
  },
};

/** Computed status based on contact fields (for display, not necessarily stored). */
export function computeDisplayStatus(contact: {
  current_status: string;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
}): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (contact.next_follow_up_at) {
    const followUp = new Date(contact.next_follow_up_at);
    if (followUp < todayStart) return "overdue";
    const followUpDay = new Date(
      followUp.getFullYear(),
      followUp.getMonth(),
      followUp.getDate()
    );
    if (followUpDay.getTime() === todayStart.getTime()) return "due_today";
  }

  if (contact.last_contacted_at) {
    const lastContact = new Date(contact.last_contacted_at);
    const lastDay = new Date(
      lastContact.getFullYear(),
      lastContact.getMonth(),
      lastContact.getDate()
    );
    if (lastDay.getTime() === todayStart.getTime()) {
      return contact.current_status === "has_vacancy"
        ? "has_vacancy"
        : contact.current_status === "no_vacancy"
          ? "no_vacancy"
          : "called_today";
    }
  }

  return contact.current_status === "new" ? "new" : contact.current_status;
}
