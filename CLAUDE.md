# CLAUDE.md

Read **[CONTEXT.md](./CONTEXT.md)** first — it explains what Everstride is, how the
three repos (this frontend, the Open Wearables backend, the seasonal planner) fit
together, the data flow, the security model, and current open action items.

Key reminders:
- Server actions use the Supabase **service-role** client (bypasses row-level security),
  so always verify the coach owns the resource (`coachOwnsTeam` / `coachOwnsAthlete` in
  `app/(protected)/teams/actions.ts`).
- `main` = production; `demo` = mock-data marketing branch (never touch `main` while on `demo`).
- Run `npx tsc --noEmit` before committing.
