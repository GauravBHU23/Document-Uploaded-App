-- Adds an optional free-text notes field to documents, beyond the
-- existing label -- found in a feature audit: there was no way to
-- record extra context about a document (e.g. "this is the 2023
-- renewal, not the original") without cramming it into the label
-- itself. Nullable, no default, so every existing row is unaffected.
--
-- No new RLS policy needed: "admins manage their own documents"
-- (0001_init.sql) already covers all columns on this table, including
-- this one.
alter table public.documents
  add column notes text;
