-- Feature 1: initial schema.
-- The Log is the only data-backed feature. This is the only table.

create extension if not exists pgcrypto;

create table if not exists log_entries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  date        date not null,
  image_url   text not null,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Feed query: ORDER BY date DESC, created_at DESC
create index if not exists log_entries_feed_idx
  on log_entries (date desc, created_at desc);
