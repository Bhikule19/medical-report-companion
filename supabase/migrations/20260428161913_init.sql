-- Medical Report Companion — initial schema
--
-- Tables:
--   profiles  — 1:1 with auth.users; user-controlled metadata (language, display name)
--   reports   — parsed medical reports owned by a user
--   messages  — chat messages tied to a report (and to a user, for RLS performance)
--   consents  — per-user privacy toggles (granular: store reports / chat / voice transcripts)
--
-- RLS policies are added in 0002_rls.sql.
--
-- gen_random_uuid() is provided by pgcrypto, enabled by default on Supabase.

-- Profiles -------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text,
  display_name  text,
  language      text not null default 'en'
                  check (language in ('en','hi','ta','te','bn','mr')),
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user. Holds preferred language and display metadata.';

-- Reports --------------------------------------------------------------------

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text,
  source_lang     text
                    check (source_lang is null or source_lang in ('en','hi','ta','te','bn','mr')),
  target_lang     text not null
                    check (target_lang in ('en','hi','ta','te','bn','mr')),
  extracted_text  text not null check (length(extracted_text) > 0),
  translated_text text,
  page_count      int check (page_count is null or page_count > 0),
  created_at      timestamptz not null default now()
);

comment on table public.reports is
  'Parsed medical reports. extracted_text is the OCR/PDF output; translated_text is the localised version.';

create index reports_user_created_idx
  on public.reports(user_id, created_at desc);

-- Messages -------------------------------------------------------------------

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('user','assistant')),
  content       text not null check (length(content) > 0),
  voice_input   boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.messages is
  'Chat history. user_id duplicates reports.user_id for RLS performance and defence in depth.';

comment on column public.messages.voice_input is
  'True if the user message originated from voice STT; only persisted when consents.store_voice_transcripts = true.';

create index messages_report_created_idx
  on public.messages(report_id, created_at);

-- Consents -------------------------------------------------------------------

create table public.consents (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  store_reports            boolean not null default true,
  store_chat               boolean not null default true,
  store_voice_transcripts  boolean not null default true,
  updated_at               timestamptz not null default now()
);

comment on table public.consents is
  'Granular privacy toggles per user. Defaults are all-on; user can revoke individually.';
