# Project Definition

## What this is

A personal portfolio website for a **Software and AI Engineer** who is actively job
hunting.

As of this revision it is built as a **two-service architecture**:

```
your-portfolio/
  frontend/     independent Next.js (App Router) project — deployed on Vercel
  backend/      independent Node.js + Express + TypeScript server — deployed on Railway
  docs/         these four planning documents (the source of truth)
```

The two services are deployed separately, hold separate environment variables, and are
connected only by the frontend calling the backend's public REST API over HTTPS.

This is still **a targeted sales document, not a comprehensive personal showcase.**
Every page, sentence, and interaction exists to do one of two jobs:

1. Make a recruiter who is scrolling fast **stop scrolling within a few seconds** and
   understand what this person does and why they should talk to them.
2. Give a **technical interviewer real, verifiable material** to dig into — actual
   architecture decisions, real measured numbers, and live running systems they can
   click into.

If a piece of content does not serve one of those two jobs, it does not belong on the
site.

## Who it is for

Two audiences, in priority order:

| Audience | What they want | How the site serves them |
| --- | --- | --- |
| **Recruiters / hiring managers** (scanning many candidates) | A fast, confident read on role fit and seniority | Sharp headline, one-line positioning, clean scannable structure, obvious "what he built" and "how to contact him" |
| **Technical interviewers / engineers** (evaluating depth) | Evidence that the depth is real, not claimed | Project write-ups that each tell one hard technical decision as a story, honest measured stats (including weak spots), live demos, links to source |

The site is explicitly **not** for general networking, high-volume blogging, or being an
exhaustive record of everything the author has ever touched.

## Positioning statement

> **Software and AI Engineer — I ship full, working products and have real ML depth.
> Not an API wrapper around someone else's model: trained models, serving
> infrastructure, failure-mode design, and measured results.**

Site headline (used verbatim on the Intro hero):

> **"I build AI systems, then try to break them before anyone else does."**

## Why it is built this way

### The product philosophy (unchanged)

- **Sales document, not a showcase.** A showcase optimizes for completeness. A sales
  document optimizes for the decision you want the reader to make. This site optimizes
  for "book the interview."
- **Quality over quantity.** Two deployed projects described deeply beats ten
  half-explained repos. Two is enough to prove the pattern (ships products + real ML).
- **Verified claims over hype.** Every performance claim on the site is a real measured
  number from a real run, and weak numbers are shown next to strong ones. A skeptical
  engineer should trust the author *more* for the honesty, not less.
- **Engineering aesthetic, not marketing aesthetic.** The visual design reads like good
  internal documentation: dark, clean, monospace for data, minimal motion.
- **Small and focused on purpose.** The scope is locked to six pages. Simplicity of
  scope is itself a signal of judgment.

### Why two services now

The previous revision was a single Next.js app with serverless API routes. This
revision splits the system into an independent **frontend** and an independent
**backend** because:

- **It matches the mental model the author wants to work in day to day.** A clear
  presentation layer and a clear service layer, each with its own repo-folder,
  `package.json`, deploy pipeline, and environment. No blurred line between "page" and
  "endpoint."
- **It matches the folder structure the author is standardizing on** across projects: a
  `frontend/` and a `backend/` sibling pair.
- **It lets each side use the right tool.** The frontend is static-first and belongs on
  a CDN/edge platform (Vercel). The backend is a persistent Express process that
  benefits from real long-lived resources — a connection pool, a Redis client, an
  in-process session store — which serverless functions could not hold.
- **It makes the backend a portfolio artifact in its own right.** A clean, CORS-locked,
  session-authenticated REST API with a justified Redis layer is itself something a
  technical interviewer can look at.

The trade-off — two deployments, two env sets, a network hop between them, and CORS to
configure — is accepted deliberately and is documented in `docs/architecture.md` and
`docs/constraints.md`.

## How it works end-to-end (high level)

- **Static content** (Intro, Built, How I Got Here, Toolbox) is hardcoded in the
  **frontend** and rendered at build time by Next.js. It is served from Vercel's CDN
  with **no runtime fetch to the backend**. This is the large majority of the site.
- **The contact form** (on Let's Talk) submits directly to the backend's
  `POST /api/contact` over HTTPS. The backend validates the input and sends an email via
  a transactional provider (Resend or similar). Nothing is stored in a database.
- **The Log** is the only data-backed feature — a reverse-chronological feed of
  milestones (things learned, shipped, achieved), each with an image, title, short
  description, and date.
  - The **frontend Log page** fetches entries from the backend's `GET /api/log`.
  - The **owner** (single author, password-gated) adds entries through a frontend admin
    form that calls the backend: `POST /api/admin/login` to authenticate, then
    `POST /api/log/upload` to store the image, then `POST /api/log` to write the row.
  - The backend is the only thing that talks to Postgres, Redis, blob storage, and the
    email provider.
- **Auth** is a single shared password held only by the backend (`ADMIN_PASSWORD`). On
  success the backend creates a session (session ID in Redis) and returns it to the
  frontend as an HttpOnly, Secure cookie. There is no user table, no signup, no roles —
  exactly one author.

## The two featured projects

Both are real, deployed, and linked to live demos and source.

### 1. Ai-image-classifier — flagship / lead project

An image classifier trained in **PyTorch**, exported to **ONNX** for serving, behind a
**FastAPI** backend.

Notable engineering:

- **Redis-backed rate limiting that fails CLOSED** — if Redis is unavailable, requests
  are rejected with `503` rather than allowed through unbounded.
- **Prediction caching that fails OPEN** — if the cache is unavailable, predictions
  still run; caching is an optimization, not a dependency.
- **A promotion gate** — a newly trained model cannot go live unless it clears a defined
  accuracy threshold on evaluation.
- **Honest measured results** — 78.2% overall accuracy, macro F1 0.78, with a
  per-category breakdown that openly shows weak categories (deer ~60%, the weakest
  class).

The story it tells: this person thinks about what happens when a dependency fails, and
ships models with guardrails rather than vibes.

> Note on scope: the classifier's fail-closed rate limiter and fail-open cache are
> properties of **that** system. This portfolio's backend has its own, separately
> reasoned Redis usage (sessions + short-TTL Log caching) — see
> `docs/architecture.md`. Do not copy the classifier's rate-limiting design into this
> portfolio's backend.

### 2. Research-Agent

A web research agent built on **LangGraph** with a cyclic, stateful flow:

- It searches the **live web**.
- It **grades the quality** of what it finds.
- If results are weak, it **loops back and retries with a refined query** instead of
  answering from thin evidence.
- It returns an answer with **real numbered, clickable citations**.
- It uses **checkpointing**, so an interrupted run can resume mid-loop instead of
  starting over.

The story it tells: this person can design non-trivial control flow (cycles, state,
self-correction, resumability), not just linear prompt chains.

## Site structure — the locked 6-page layout

Six top-level nav items, in this order, each its own page. This structure is fixed. New
features must fit one of these pages or they do not get built.

| Nav label | Purpose (one line) |
| --- | --- |
| **Intro** | Landing page: hero with photo, the verbatim headline, and an animated looping tech-stack marquee — make the visitor stop scrolling. |
| **Built** | The two featured projects, each as hook → what it does → one hard technical decision as a story → real stats → live demo link. |
| **How I Got Here** | A short, human background story — how the author got into this work. Not a full resume. |
| **Toolbox** | A short, honest, grouped list of technologies actually used (Frontend / Backend / AI-ML / Infra). No inflated logo wall. |
| **Log** | A reverse-chronological milestone feed (image, title, short description, date), added by the single owner via a password-gated admin form. |
| **Let's Talk** | Contact: email, GitHub, LinkedIn, and a minimal contact form (name, email, message). |

## Design direction

- Dark mode by default.
- Clean engineering / documentation aesthetic — not a flashy marketing landing page.
- One signal accent color, used sparingly.
- Sans-serif body font; monospace for code, stats, and labels.
- Minimal, purposeful motion only — subtle fade / slide-in. No gimmicks, no parallax.
- Generous whitespace.
- Sharp edges over soft rounded shapes.

## Definition of done for the whole project

- `frontend/` and `backend/` are independent projects, each building and deploying on
  its own.
- All 6 pages exist, are styled per the design direction, and are responsive.
- The four static pages build with **zero runtime calls to the backend**.
- The contact form delivers email through the backend and handles validation and
  errors gracefully.
- The owner can log in with the shared password (backend-issued session), add a Log
  entry with an image, and see it appear on the public Log page.
- The backend's CORS is locked to the known frontend origins — no wildcard.
- Redis on the backend is used only for sessions and optional short-TTL Log-list
  caching — nothing else.
- Both services are deployed (frontend on Vercel, backend on Railway) with all secrets
  in each service's own environment variables.
- All stats on the Built page are real, unrounded, and include the weak numbers.
