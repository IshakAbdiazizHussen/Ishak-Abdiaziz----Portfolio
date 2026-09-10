-- Feature: the public Log page is restructured from one reverse-chronological
-- feed into three grouped columns — Learned, Shipped, Working on. Each entry
-- now carries a `category` naming which column it belongs in.
--
-- `category` is a constrained text column (CHECK, exactly three values). It is
-- added WITH a default so every existing row is backfilled in the same
-- statement — no separate backfill script. All 14 current rows are Coursera
-- course completions, so 'learned' is the right default for them.
--
-- The default is then DROPPED: new rows must set `category` explicitly. The API
-- (`newLogEntrySchema`) requires it and rejects anything outside the three
-- values with a 400 — there is no silent default at the application layer, and
-- now none at the schema layer either.

alter table log_entries
  add column if not exists category text not null default 'learned'
    check (category in ('learned', 'shipped', 'working'));

alter table log_entries
  alter column category drop default;

-- Feed query is now per-category: WHERE category = $1 ORDER BY date DESC,
-- created_at DESC. The existing `log_entries_feed_idx` stays for the
-- unfiltered list; this one covers the grouped reads.
create index if not exists log_entries_category_feed_idx
  on log_entries (category, date desc, created_at desc);
