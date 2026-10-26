-- Adds an optional expiry date to documents -- the single highest-value
-- gap found in a feature audit: this app's core content (ID proofs,
-- certificates, marksheets) is exactly the kind of document that has a
-- real-world expiry date, and there was previously no way to record
-- one or be warned before it lapses. Nullable, no default, so every
-- existing row is unaffected -- most documents (photos, marksheets)
-- genuinely have no expiry and should stay null forever.
--
-- No new RLS policy needed: "admins manage their own documents"
-- (0001_init.sql) already covers all columns on this table.
alter table public.documents
  add column expiry_date date;

-- Lets the dashboard's "expiring soon" query filter efficiently
-- without a full table scan, since every admin will eventually have
-- far more documents than people.
create index documents_expiry_date_idx on public.documents (admin_id, expiry_date)
  where expiry_date is not null and deleted_at is null;
