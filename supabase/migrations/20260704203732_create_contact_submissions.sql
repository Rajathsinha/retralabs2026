/*
# Create contact_submissions table

A public contact form table — no auth required, so policies are scoped to anon + authenticated.

1. New Tables
  - `contact_submissions`
    - `id` (uuid, primary key)
    - `name` (text, not null) — submitter's full name
    - `email` (text, not null) — submitter's email address
    - `subject` (text, not null) — inquiry subject
    - `message` (text, not null) — message body
    - `created_at` (timestamptz) — submission timestamp

2. Security
  - RLS enabled.
  - `anon` and `authenticated` users can INSERT (submit a form).
  - Only `authenticated` users can SELECT (admin reads submissions).
  - No UPDATE or DELETE policies — submissions are immutable from the client.
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text NOT NULL,
  message    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact" ON contact_submissions;
CREATE POLICY "anon_insert_contact" ON contact_submissions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_contact" ON contact_submissions;
CREATE POLICY "auth_select_contact" ON contact_submissions FOR SELECT
TO authenticated USING (true);
