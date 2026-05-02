-- Expand the language CHECK constraints from the 6-language Indian set to a
-- 14-language international set: en, hi, ta, te, bn, mr, es, fr, de, pt, ru,
-- zh, ar, ja.
--
-- Idempotent: `drop constraint if exists` lets this re-run without error.
-- Reversible by re-running the original constraint list from 0001_init.sql.

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles
  add constraint profiles_language_check
  check (language in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));

alter table public.reports drop constraint if exists reports_source_lang_check;
alter table public.reports
  add constraint reports_source_lang_check
  check (source_lang is null or source_lang in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));

alter table public.reports drop constraint if exists reports_target_lang_check;
alter table public.reports
  add constraint reports_target_lang_check
  check (target_lang in ('en','hi','ta','te','bn','mr','es','fr','de','pt','ru','zh','ar','ja'));
