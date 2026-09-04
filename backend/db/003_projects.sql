-- Feature 14: projects + project_stats — Built page content. See
-- docs/architecture.md §3 and §8, and constraint C18 (project_stats edits
-- require the backend confirm-before-save check — enforced in application
-- code, not here; this migration only creates the schema).
--
-- Seeded from the current Ai-image-classifier and Research-Agent data
-- hardcoded in frontend/content/projects.ts so the Built page's content does
-- not change at cutover (feature 18 does the actual cutover).

create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  lead            boolean not null default false,
  stack           text[] not null default '{}',
  hook            text not null,
  what_it_does    text not null,
  decision        text,
  stats_label     text not null,
  failures_label  text,
  failures        text[],
  api_title       text,
  api_lines       text[],
  demo_url        text not null,
  demo_label      text not null default 'Try it live',
  source_url      text not null,
  sort_order      int not null default 0,
  updated_at      timestamptz not null default now()
);

create table if not exists project_stats (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null,
  value       text not null,
  note        text,
  accent      boolean not null default false,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists project_stats_project_idx on project_stats (project_id, sort_order);

insert into projects (
  slug, name, lead, stack, hook, what_it_does, stats_label,
  demo_url, demo_label, source_url, sort_order
) values
  (
    'ai-image-classifier',
    'Ai-image-classifier',
    true,
    array['PyTorch', 'FastAPI', 'Next.js', 'Docker'],
    'Upload an image, get a predicted class, a confidence score, and the full probability distribution — never just a label.',
    'A convolutional classifier over ten categories, trained in PyTorch and served behind a FastAPI endpoint that the Next.js client calls directly. The response carries the argmax class, its softmax confidence and all ten probabilities, so the interface can show a close call as a close call rather than rounding it into certainty.',
    'Verified · held-out test set',
    'https://ai-image-classifer.vercel.app',
    'Try it live',
    'https://github.com/IshakAbdiazizHussen/Ai-image-classifer-',
    1
  ),
  (
    'research-agent',
    'Research-Agent',
    true,
    array['LangGraph', 'Python', 'Web search'],
    'Ask a question, get an answer with numbered, clickable citations — and a run that resumes instead of restarting when something upstream fails.',
    'A LangGraph agent modelled as a cyclic graph: it searches the live web, grades the relevance and quality of what it finds, and if the evidence is thin it rewrites the query and searches again before answering. Every claim in the answer is tied to a numbered source. Graph state is checkpointed after each node, so an interrupted run picks up from the last completed step.',
    'How it behaves',
    'https://research-agent-weld.vercel.app',
    'Try it live',
    'https://github.com/IshakAbdiazizHussen/Research-Agent-',
    2
  )
on conflict (slug) do nothing;

-- Migrations only ever run once (schema_migrations tracks applied files), so
-- there is no real re-run risk here — these inserts are not additionally
-- conflict-guarded because project_stats has no natural unique key to guard
-- on beyond its own generated id.
insert into project_stats (project_id, label, value, accent, sort_order)
select p.id, s.label, s.value, s.accent, s.sort_order
from projects p
cross join (
  values
    ('Accuracy', '78.2%', true, 1),
    ('Macro F1', '0.78', false, 2),
    ('Classes', '10', false, 3)
) as s(label, value, accent, sort_order)
where p.slug = 'ai-image-classifier';

insert into project_stats (project_id, label, value, accent, sort_order)
select p.id, s.label, s.value, s.accent, s.sort_order
from projects p
cross join (
  values
    ('Control flow', 'Cyclic', true, 1),
    ('Citations', 'Linked', false, 2),
    ('Resumable', 'Yes', false, 3)
) as s(label, value, accent, sort_order)
where p.slug = 'research-agent';
