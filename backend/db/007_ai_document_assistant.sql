-- Feature: add a third Built project — Ai-Document-Assistant — alongside the
-- existing Ai-image-classifier (flagship/first) and Research-Agent (second).
-- Ai-image-classifier and Research-Agent are NOT touched by this file. See
-- docs/project-definition.md "The three featured projects" for the write-up
-- this data backs.
--
-- No fabricated stats (constraint C11): this project has no measured
-- accuracy/performance number, so — matching Research-Agent's existing
-- precedent of qualitative "how it behaves" stats rather than a percentage —
-- its three mini-stats are honest, verified behavioral facts, not invented
-- metrics.
--
-- ON CONFLICT DO NOTHING on both inserts, per migration 006: re-running this
-- file against a database that already has this project is a no-op.

insert into projects (
  slug, name, lead, stack, hook, what_it_does, stats_label,
  demo_url, demo_label, source_url, sort_order
) values (
  'ai-document-assistant',
  'Ai-Document-Assistant',
  false,
  array['FastAPI', 'ChromaDB', 'OpenAI', 'Next.js'],
  'Upload a document, ask it a question in plain English — it answers only from what''s actually in the file, and says so honestly when it isn''t.',
  'A RAG (retrieval-augmented generation) system that lets a user upload documents (PDF, Word, or plain text), then ask questions about their content in natural language. Every answer includes a citation back to the exact page and passage it came from.',
  'Verified behavior',
  'https://ai-document-assistant-2y3c.vercel.app',
  'Try it live',
  'https://github.com/IshakAbdiazizHussen/Ai-Document-Assistant',
  3
)
on conflict (slug) do nothing;

insert into project_stats (project_id, label, value, accent, sort_order)
select p.id, s.label, s.value, s.accent, s.sort_order
from projects p
cross join (
  values
    ('Grounding', 'Strict', true, 1),
    ('Refuses', 'Yes', false, 2),
    ('Citations', 'Linked', false, 3)
) as s(label, value, accent, sort_order)
where p.slug = 'ai-document-assistant'
on conflict (project_id, label) do nothing;
