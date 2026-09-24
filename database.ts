export type ContactStatus =
  | "new"
  | "due_today"
  | "overdue"
  | "called_today"
  | "has_vacancy"
  | "no_vacancy"
  | "call_later"
  | "follow_up_scheduled";

export type InteractionResult = "has_vacancy" | "call_later" | "no_vacancy";

export type FollowUpStatus = "pending" | "completed";

export interface Contact {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  normalized_phone: string;
  photo_url: string | null;
  whatsapp_available: boolean;
  current_status: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  times_contacted: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  user_id: string;
  interaction_date: string;
  result: InteractionResult;
  notes: string | null;
  created_at: string;
}

export interface Vacancy {
  id: string;
  contact_id: string;
  interaction_id: string | null;
  user_id: string;
  room_type: string | null;
  price: number | null;
  is_self_contained: boolean;
  location: string | null;
  number_available: number;
  details: string | null;
  active: boolean;
  created_at: string;
}

export interface FollowUp {
  id: string;
  contact_id: string;
  interaction_id: string | null;
  user_id: string;
  follow_up_type: string | null;
  scheduled_for: string;
  completed_at: string | null;
  status: FollowUpStatus;
  created_at: string;
}

export interface ContactWithVacancy extends Contact {
  vacancies?: Vacancy[];
  latest_vacancy?: Vacancy | null;
}
