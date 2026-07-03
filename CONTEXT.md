# Everstride — Project Context

> **You are in the `Everstride-notion` repo — the Everstride coach frontend (Next.js).**
> This file is a self-contained overview of the whole Everstride system so anyone (or their AI assistant) who pulls this repo understands what it is and how it fits together. Full founder-level docs live in a private Obsidian vault (not in git).

## What Everstride is

A coach-first athlete intelligence platform for endurance coaches. It aggregates wearable data — **recovery** (WHOOP: HRV, sleep, resting HR, recovery score) and **activities** (Strava: rides/runs/workouts) — via the Open Wearables backend into a single coaching dashboard. Coaches see their whole team's readiness and training at a glance.

## The three repos and how they connect

| Repo | What it is | Stack | Live URL |
|------|-----------|-------|----------|
| **Everstride-notion** (this) | Coach frontend + dashboard | Next.js 14 (App Router), TypeScript, Tailwind, Recharts, Supabase (Auth + DB) | `app.everstride.fit` |
| **open-wearables** (fork) | Data backend: wearable OAuth, sync, storage, API | FastAPI/Python, Celery + Redis, Postgres | `backend-production-412a.up.railway.app` |
| **seasonal-planner** | Periodized season-plan tool | Flask/Python + HTML/JS, Supabase | `planner.everstride.fit` |

Plus the OW frontend (athlete wearable pairing) at `connect.everstride.fit`.

**Data flow:** Athlete connects a wearable via `connect.everstride.fit/users/<id>/pair` → Open Wearables stores + syncs the data → this frontend reads it from the OW API (`lib/ow-client.ts`) and renders the coach dashboard. Coach ↔ athlete/team relationships and athlete metadata (name, photo, pairing link) live in Supabase.

## This repo — key files

- `lib/ow-client.ts` — talks to the Open Wearables API (users, recovery, sleep, body, timeseries, workouts).
- `lib/data.ts` — transforms OW data into `AthleteSummary`; the core data layer. `isRecent()` = today only. Athletes are kept if they have recovery **or** sleep **or** activities.
- `lib/types.ts` — `AthleteSummary`, `Workout`, etc.
- `app/(protected)/` — dashboard, athletes, compare, teams, settings (all behind `middleware.ts` auth).
- `app/(protected)/teams/actions.ts` — server actions; **use ownership helpers** (`coachOwnsTeam`/`coachOwnsAthlete`) because the Supabase service-role client bypasses row-level security.
- `components/dashboard-workspace.tsx`, `athlete-detail-panel.tsx`, `athlete-table.tsx` — main UI.
- `lib/planner-token.ts` — mints the HMAC token that authenticates the coach to the seasonal planner.

## Branches

- `main` — production (auto-deploys on Railway).
- `demo` — same UI but `lib/data.ts` returns **mock data** (6 fake athletes) for marketing/screenshots. No API/Supabase. **Never touch `main` while working on `demo`.**

## Integrations

- **WHOOP** — recovery/sleep/HRV. Primary data today.
- **Strava** — activities (no recovery/sleep). Connection is fully configured; activities show in the athlete "Activities" tab and the dashboard "Activity" column group. Note: OW's normalized workout schema has no power/normalized-power/suffer-score yet.
- Garmin / Oura / Polar / Suunto — supported by OW, not yet wired into the Everstride UI beyond what recovery/activity data they provide.

## Security model (important)

The frontend and planner use the Supabase **service-role** client, which **bypasses row-level security**. So every server action must verify the caller owns the resource in code. This is done via `coachOwnsTeam`/`coachOwnsAthlete` in `teams/actions.ts` and by scoping `getSeasonPlan` to the authenticated coach. Do not add a service-role query on a user-supplied id without an ownership check.

## Infrastructure / operations

- Hosted on **Railway**. DNS via Namecheap (`app`, `connect`, `planner` subdomains → Railway).
- Automatic wearable sync runs every ~10h via Celery **beat** + **worker** + **Redis** in the OW backend. If any of those is down, no one syncs. Only connections with status `ACTIVE` are synced.
- Email via Resend, sender `Paul - Everstride <paul@everstride.fit>`.

## Current open action items (as of 2026-07-03)

1. **Set `PLANNER_SHARED_SECRET`** (same value) on both the Everstride and planner Railway services and redeploy → activates the seasonal-planner API auth (until then that API is still open).
2. Verify Strava end-to-end in production (a Strava-only athlete should load, be Active, and show the Activities tab).
3. Optional: reduce Railway cost (delete Flower, move Redis→Upstash / Postgres→Neon); planner rate limiting; Supabase RLS as a DB-level backstop.

## Working notes

- Push: this repo `git push`; OW backend `git push paul main` (remote is named `paul`); planner `git push`.
- After code changes, run `npx tsc --noEmit` before committing.
- Railway env vars / dashboards can't be edited from code — they must be changed in the Railway UI.
