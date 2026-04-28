-- Medical Report Companion — Row-Level Security
--
-- Every table has 4 policies (select/insert/update/delete) scoped to auth.uid().
-- Profiles uses auth.uid() = id (since profile.id IS the user id).
-- Reports/messages/consents use auth.uid() = user_id.
--
-- Without an authenticated user, auth.uid() returns NULL and all policies fail.
-- Anonymous (anon-key) requests therefore see nothing and cannot insert anything.

-- Enable RLS on all 4 tables ------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reports  enable row level security;
alter table public.messages enable row level security;
alter table public.consents enable row level security;

-- Profiles: user can manage only their own profile --------------------------

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- Reports: user can manage only rows where user_id matches them -------------

create policy reports_select_own on public.reports
  for select using (auth.uid() = user_id);

create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = user_id);

create policy reports_update_own on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reports_delete_own on public.reports
  for delete using (auth.uid() = user_id);

-- Messages: same scope by user_id; report_id cascade is enforced by FK -------

create policy messages_select_own on public.messages
  for select using (auth.uid() = user_id);

create policy messages_insert_own on public.messages
  for insert with check (auth.uid() = user_id);

create policy messages_update_own on public.messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messages_delete_own on public.messages
  for delete using (auth.uid() = user_id);

-- Consents: user_id is the primary key; same auth scope ----------------------

create policy consents_select_own on public.consents
  for select using (auth.uid() = user_id);

create policy consents_insert_own on public.consents
  for insert with check (auth.uid() = user_id);

create policy consents_update_own on public.consents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy consents_delete_own on public.consents
  for delete using (auth.uid() = user_id);
