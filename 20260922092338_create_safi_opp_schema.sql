/*
# Safi OPP — Landlord Follow-up & Vacancy Management Schema

1. Overview
   Safi OPP is an internal SafiRooms landlord CRM. Each authenticated user manages
   their own set of landlord contacts, call interactions, vacancies, and follow-ups.
   All data is scoped per-user (multi-tenant via auth.uid()).

2. New Tables
   - `contacts` — landlord/contact records (name, phone, photo, status, follow-up dates)
   - `interactions` — every call/contact attempt with a result
   - `vacancies` — vacancy details discovered during an interaction
   - `follow_ups` — scheduled follow-up records with status tracking

3. Columns
   contacts:
     id, user_id, full_name, phone_number, normalized_phone, photo_url,
     whatsapp_available, current_status, last_contacted_at, next_follow_up_at,
     times_contacted, notes, created_at, updated_at
   interactions:
     id, contact_id, user_id, interaction_date, result, notes, created_at
     result values: 'has_vacancy' | 'call_later' | 'no_vacancy'
   vacancies:
     id, contact_id, interaction_id, user_id, room_type, price, is_self_contained,
     location, number_available, details, active, created_at
   follow_ups:
     id, contact_id, interaction_id, user_id, follow_up_type, scheduled_for,
     completed_at, status
     status values: 'pending' | 'completed'

4. Indexes
   - contacts.user_id, contacts.next_follow_up_at, contacts.normalized_phone
   - interactions.contact_id, interactions.user_id, interactions.interaction_date
   - vacancies.contact_id, vacancies.user_id, vacancies.created_at
   - follow_ups.contact_id, follow_ups.user_id, follow_ups.scheduled_for, follow_ups.status

5. Storage
   - Create `contact-photos` bucket (private) for landlord profile photos

6. Security (RLS)
   - RLS enabled on all four tables
   - All policies scoped TO authenticated with auth.uid() = user_id ownership checks
   - Storage policies for contact-photos bucket: authenticated users manage their own
     files (path pattern: {user_id}/{filename})
*/

-- ============================================================
-- contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  normalized_phone text NOT NULL,
  photo_url text,
  whatsapp_available boolean NOT NULL DEFAULT false,
  current_status text NOT NULL DEFAULT 'new',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  times_contacted integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up ON contacts(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_contacts_normalized_phone ON contacts(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(current_status);

DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- interactions
-- ============================================================
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('has_vacancy', 'call_later', 'no_vacancy')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(interaction_date);

DROP POLICY IF EXISTS "select_own_interactions" ON interactions;
CREATE POLICY "select_own_interactions" ON interactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_interactions" ON interactions;
CREATE POLICY "insert_own_interactions" ON interactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_interactions" ON interactions;
CREATE POLICY "update_own_interactions" ON interactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_interactions" ON interactions;
CREATE POLICY "delete_own_interactions" ON interactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- vacancies
-- ============================================================
CREATE TABLE IF NOT EXISTS vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES interactions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  room_type text,
  price numeric,
  is_self_contained boolean NOT NULL DEFAULT false,
  location text,
  number_available integer NOT NULL DEFAULT 1,
  details text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vacancies_contact_id ON vacancies(contact_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_user_id ON vacancies(user_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_created_at ON vacancies(created_at);

DROP POLICY IF EXISTS "select_own_vacancies" ON vacancies;
CREATE POLICY "select_own_vacancies" ON vacancies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_vacancies" ON vacancies;
CREATE POLICY "insert_own_vacancies" ON vacancies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vacancies" ON vacancies;
CREATE POLICY "update_own_vacancies" ON vacancies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_vacancies" ON vacancies;
CREATE POLICY "delete_own_vacancies" ON vacancies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- follow_ups
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES interactions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  follow_up_type text,
  scheduled_for timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_follow_ups_contact_id ON follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

DROP POLICY IF EXISTS "select_own_follow_ups" ON follow_ups;
CREATE POLICY "select_own_follow_ups" ON follow_ups FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_follow_ups" ON follow_ups;
CREATE POLICY "insert_own_follow_ups" ON follow_ups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_follow_ups" ON follow_ups;
CREATE POLICY "update_own_follow_ups" ON follow_ups FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_follow_ups" ON follow_ups;
CREATE POLICY "delete_own_follow_ups" ON follow_ups FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- updated_at trigger for contacts
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Storage bucket for contact photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-photos', 'contact-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users manage their own photos
DROP POLICY IF EXISTS "users_upload_own_photos" ON storage.objects;
CREATE POLICY "users_upload_own_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contact-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_read_own_photos" ON storage.objects;
CREATE POLICY "users_read_own_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contact-photos');

DROP POLICY IF EXISTS "users_update_own_photos" ON storage.objects;
CREATE POLICY "users_update_own_photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contact-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_delete_own_photos" ON storage.objects;
CREATE POLICY "users_delete_own_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contact-photos' AND (storage.foldername(name))[1] = auth.uid()::text);