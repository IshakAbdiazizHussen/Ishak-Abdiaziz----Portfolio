-- Feature: make the 003 / 004 seed INSERTs idempotent — a re-run against a
-- database that already has the data must be a harmless no-op, the way 001
-- (CREATE TABLE IF NOT EXISTS) and 002 (primary-key-guarded insert) already are.
--
-- Why this exists: production's `schema_migrations` table was found empty (the
-- DB had originally been seeded outside the migration runner). The next
-- `npm run migrate` therefore re-ran every file, and 003 / 004 — whose seed
-- INSERTs had no effective conflict guard — duplicated every project stat and
-- every toolbox group / item. That duplication was removed by hand; this
-- migration adds the natural-key UNIQUE constraints those INSERTs need so it
-- can never happen again.
--
-- 003 and 004 have also been updated to create these same constraints (guarded)
-- and to use `ON CONFLICT ... DO NOTHING`, so on a fresh database they protect
-- themselves. This file adds the constraints to databases that were already
-- past 003 / 004 when the change landed (production). Every block is
-- IF NOT EXISTS guarded, so this migration is itself safe to re-run.
--
-- If any ALTER below fails with a unique violation, STOP: the table still holds
-- duplicate rows that must be de-duplicated before the constraint can be added.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_stats_project_label_key') then
    alter table project_stats
      add constraint project_stats_project_label_key unique (project_id, label);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'toolbox_groups_name_key') then
    alter table toolbox_groups
      add constraint toolbox_groups_name_key unique (name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'toolbox_items_group_name_key') then
    alter table toolbox_items
      add constraint toolbox_items_group_name_key unique (group_id, name);
  end if;
end $$;
