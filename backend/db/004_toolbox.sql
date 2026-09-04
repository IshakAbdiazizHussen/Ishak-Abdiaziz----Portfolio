-- Feature 15: toolbox_groups + toolbox_items — Toolbox page content. See
-- docs/architecture.md §3 and §7. Unlike projects/project_stats (feature 14,
-- constraint C18), these are NOT factual/verifiable claims — a curated list,
-- not a stat — so there is no confirm-before-save concept here at all, at
-- either the schema or the application level.
--
-- Seeded from the four groups currently hardcoded in
-- frontend/content/toolbox.ts so the Toolbox page's content does not change
-- at cutover (feature 18 does the actual cutover).

create table if not exists toolbox_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists toolbox_items (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references toolbox_groups(id) on delete cascade,
  name        text not null,
  note        text,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists toolbox_items_group_idx on toolbox_items (group_id, sort_order);

insert into toolbox_groups (name, sort_order) values
  ('Frontend', 1),
  ('Backend', 2),
  ('AI / ML', 3),
  ('Infra', 4)
on conflict do nothing;

insert into toolbox_items (group_id, name, note, sort_order)
select g.id, i.name, i.note, i.sort_order
from toolbox_groups g
cross join (
  values
    ('Next.js', 'App router, server components, both live projects', 1),
    ('TypeScript', 'Default for anything with more than one screen', 2),
    ('Tailwind CSS', 'Styling without a separate design system to maintain', 3),
    ('HTMX', 'When a server-rendered app does not need a SPA', 4)
) as i(name, note, sort_order)
where g.name = 'Frontend';

insert into toolbox_items (group_id, name, note, sort_order)
select g.id, i.name, i.note, i.sort_order
from toolbox_groups g
cross join (
  values
    ('FastAPI', 'Inference endpoints, typed schemas, OpenAPI for free', 1),
    ('Django', 'Modular monolith work where the admin and ORM earn their keep', 2),
    ('PostgreSQL', 'Primary store; run traces, records, migrations', 3),
    ('Redis', 'Caching fetched sources, queues, rate limits', 4)
) as i(name, note, sort_order)
where g.name = 'Backend';

insert into toolbox_items (group_id, name, note, sort_order)
select g.id, i.name, i.note, i.sort_order
from toolbox_groups g
cross join (
  values
    ('PyTorch', 'Model definition, training loops, checkpointing', 1),
    ('ONNX Runtime', 'Exported inference where CPU latency matters', 2),
    ('scikit-learn', 'Baselines, metrics, confusion matrices', 3),
    ('LLM tool-calling', 'Structured outputs, retrieval, verification passes', 4)
) as i(name, note, sort_order)
where g.name = 'AI / ML';

insert into toolbox_items (group_id, name, note, sort_order)
select g.id, i.name, i.note, i.sort_order
from toolbox_groups g
cross join (
  values
    ('Docker', 'One image per service, same build locally and deployed', 1),
    ('GitHub Actions', 'Tests and image builds on push', 2),
    ('pytest', 'API contract tests and evaluation harnesses', 3),
    ('Linux / nginx', 'Deploys, reverse proxy, log reading', 4)
) as i(name, note, sort_order)
where g.name = 'Infra';
