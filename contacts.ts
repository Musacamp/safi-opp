import { supabase } from "./supabase";
import { normalizePhone } from "./phone";
import { startOfDay, endOfDay } from "./dates";
import type { Contact, Vacancy } from "@/types/database";

export interface DashboardCounts {
  total: number;
  dueToday: number;
  overdue: number;
  calledToday: number;
  vacanciesToday: number;
}

/** Fetch all dashboard counts in a single round of queries. */
export async function fetchDashboardCounts(
  userId: string
): Promise<DashboardCounts> {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  const [totalRes, dueRes, overdueRes, calledRes, vacRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("next_follow_up_at", todayStart)
      .lte("next_follow_up_at", todayEnd),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lt("next_follow_up_at", todayStart),
    supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("interaction_date", todayStart)
      .lte("interaction_date", todayEnd),
    supabase
      .from("vacancies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
  ]);

  return {
    total: totalRes.count ?? 0,
    dueToday: dueRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
    calledToday: calledRes.count ?? 0,
    vacanciesToday: vacRes.count ?? 0,
  };
}

/** Check if a normalized phone already exists for this user. */
export async function checkDuplicatePhone(
  userId: string,
  phone: string
): Promise<Contact | null> {
  const normalized = normalizePhone(phone);
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .eq("normalized_phone", normalized)
    .maybeSingle();
  return data as Contact | null;
}

/** Fetch the latest active vacancy for a contact. */
export async function fetchLatestVacancy(
  contactId: string
): Promise<Vacancy | null> {
  const { data } = await supabase
    .from("vacancies")
    .select("*")
    .eq("contact_id", contactId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Vacancy | null;
}
