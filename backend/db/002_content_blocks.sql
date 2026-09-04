-- Feature 13: content_blocks — generic key/value store for the simple content
-- areas (Intro, How I Got Here, Let's Talk). See docs/architecture.md §3.
--
-- Seeded from the values previously hardcoded in frontend/content/intro.ts,
-- about.ts, and site.ts so the live site's copy does not change at cutover
-- (feature 18 is what actually switches the frontend to read from here).
-- `ON CONFLICT DO NOTHING` makes the seed safe to leave in a forward-only
-- migration: re-running never overwrites a value the owner has since edited.

create table if not exists content_blocks (
  key         text primary key,
  value       text not null default '',
  image_url   text,
  updated_at  timestamptz not null default now()
);

insert into content_blocks (key, value, image_url) values
  (
    'intro.headline',
    'I build AI systems, then try to break them before anyone else does.',
    null
  ),
  (
    'intro.subheadline',
    'A software and AI engineer who ships the whole thing — model, API, and the interface people actually use — and publishes the numbers, including the ones that are not flattering.',
    null
  ),
  ('intro.hero_photo_url', '', null),
  (
    'how_i_got_here.body',
    'I started by building things people had to use — small web applications where a broken form meant someone could not finish their work. That taught me the part of engineering that has nothing to do with models: reading logs at an unreasonable hour, writing the boring migration properly, and accepting that a feature is not finished when it works on your machine.

Machine learning arrived as a tool for a problem I already had, not as a subject I studied in the abstract. The first model I trained was worse than the heuristic it was supposed to replace. Working out why — bad labels, a leak between train and test, a metric that flattered the majority class — was more instructive than any tutorial, and it set the habit I still work by: build the evaluation before the model, and be suspicious of a number that looks good on the first try.

Since then I have deliberately stayed on both sides. I write the training loop and I write the endpoint that serves it, because the interesting problems live in between — how a confidence score should be shown to someone who has never heard of softmax, what an agent should do when its sources disagree, how much latency a user will accept before the accuracy stops mattering. Those questions do not get answered in a notebook.

What I look for now is work where correctness is checkable and the stakes of being wrong are real enough that someone cares about the difference between 78% and 91%.',
    null
  ),
  ('how_i_got_here.photo_url', '', null),
  ('lets_talk.email', 'ishakabdiaziz.ai@gmail.com', null),
  ('lets_talk.github_url', 'https://github.com/IshakAbdiazizHussen', null),
  ('lets_talk.linkedin_url', 'https://www.linkedin.com/in/ishak-abdiaziz-528426304', null)
on conflict (key) do nothing;
