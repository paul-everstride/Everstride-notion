/**
 * Open Wearables API Client
 * Talks to the Railway-hosted OW backend using the developer API key.
 */

const OW_API_URL = process.env.OW_API_URL ?? "https://backend-production-412a.up.railway.app";
const OW_API_KEY = process.env.OW_API_KEY ?? "";

// ─── Types matching the OW backend response shapes ────────────────────────────

export interface OWUser {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  external_user_id: string | null;
}

export interface OWTeam {
  id: string;
  name: string;
  coach_email: string | null;
  created_at: string;
}

export interface OWRecoverySummary {
  date: string;
  recovery_score: number | null;
  resting_heart_rate_bpm: number | null;
  avg_hrv_sdnn_ms: number | null;
  avg_spo2_percent: number | null;
  sleep_duration_seconds: number | null;
  sleep_efficiency_percent: number | null;
}

export interface OWSleepSummary {
  date: string;
  duration_minutes: number | null;
  time_in_bed_minutes: number | null;
  efficiency_percent: number | null;
  avg_respiratory_rate: number | null;
  avg_spo2_percent: number | null;
  avg_heart_rate_bpm: number | null;
  avg_hrv_sdnn_ms: number | null;
  stages: {
    awake_minutes: number | null;
    light_minutes: number | null;
    deep_minutes: number | null;
    rem_minutes: number | null;
  } | null;
}

export interface OWBodySummary {
  slow_changing: {
    weight_kg: number | null;
    height_cm: number | null;
    body_fat_percent: number | null;
    age: number | null;
  };
  averaged: {
    resting_heart_rate_bpm: number | null;
    avg_hrv_sdnn_ms: number | null;
  };
  latest: {
    skin_temperature_celsius: number | null;
  };
}

interface PaginatedOWResponse<T> {
  data: T[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  };
}

interface PaginatedUsers {
  items: OWUser[];
  total: number;
  pages: number;
}

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function owFetch<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
  const url = new URL(`${OW_API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, v);
    } else {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-Open-Wearables-API-Key": OW_API_KEY,
      "Content-Type": "application/json",
    },
    // Don't cache — always get fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OW API error ${res.status} for ${path}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ─── API functions ─────────────────────────────────────────────────────────────

/** Fetch all users (up to 100 per page, fetches all pages) */
export async function owGetUsers(): Promise<OWUser[]> {
  const first = await owFetch<PaginatedUsers>("/api/v1/users", { limit: "100", page: "1" });
  const items = first.items ?? [];

  // If there are more pages, fetch them
  if (first.pages && first.pages > 1) {
    for (let page = 2; page <= first.pages; page++) {
      const more = await owFetch<PaginatedUsers>("/api/v1/users", {
        limit: "100",
        page: String(page),
      });
      items.push(...(more.items ?? []));
    }
  }

  return items;
}

/**
 * Fetch recovery summaries for a user over the last N days.
 * Returns items sorted newest first. Returns [] on error (e.g. endpoint not yet deployed).
 */
export async function owGetRecovery(userId: string, days = 730): Promise<OWRecoverySummary[]> {
  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // +1 so end_date is exclusive of tomorrow → includes today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await owFetch<PaginatedOWResponse<OWRecoverySummary>>(
      `/api/v1/users/${userId}/summaries/recovery`,
      {
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        limit: "100",
      }
    );

    return (data.data ?? []).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

/**
 * Fetch ALL sleep summaries for a user over the last N days.
 * Paginates through all pages so we always get the most recent records.
 * Returns items sorted newest first.
 */
export async function owGetSleep(userId: string, days = 730): Promise<OWSleepSummary[]> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1); // +1 so end_date is exclusive of tomorrow → includes today
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const allRecords: OWSleepSummary[] = [];
  let cursor: string | null = null;

  do {
    const params: Record<string, string | string[]> = {
      start_date: startDate.toISOString().split("T")[0],
      end_date:   endDate.toISOString().split("T")[0],
      limit:      "100",
    };
    if (cursor) params.cursor = cursor;

    const data = await owFetch<PaginatedOWResponse<OWSleepSummary>>(
      `/api/v1/users/${userId}/summaries/sleep`,
      params
    );
    allRecords.push(...(data.data ?? []));
    cursor = data.pagination.has_more ? data.pagination.next_cursor : null;
  } while (cursor);

  return allRecords.sort((a, b) => b.date.localeCompare(a.date));
}

/** Fetch body summary for a user (most recent values). */
export async function owGetBody(userId: string): Promise<OWBodySummary | null> {
  try {
    return await owFetch<OWBodySummary>(`/api/v1/users/${userId}/summaries/body`);
  } catch {
    return null;
  }
}

export async function owRegisterCoach(email: string, name?: string): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/coaches`, {
    method: "POST",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: name ?? null }),
  });
  // Don't throw on error — coach registration is best-effort
}

export async function owCreateTeam(name: string, coachEmail?: string): Promise<OWTeam> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams`, {
    method: "POST",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ name, coach_email: coachEmail ?? null }),
  });
  if (!res.ok) throw new Error(`OW createTeam failed: ${res.status}`);
  return res.json();
}

export async function owGetTeams(): Promise<OWTeam[]> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams`, {
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OW getTeams failed: ${res.status}`);
  return res.json();
}

export async function owGetTeamMembers(teamId: string): Promise<OWUser[]> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams/${teamId}/users`, {
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function owAddTeamMember(teamId: string, userId: string): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams/${teamId}/users/${userId}`, {
    method: "POST",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY },
  });
  if (!res.ok) throw new Error(`OW addTeamMember failed: ${res.status}`);
}

export async function owCreateUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  external_user_id: string;
}): Promise<OWUser> {
  const res = await fetch(`${OW_API_URL}/api/v1/users`, {
    method: "POST",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`OW createUser failed: ${res.status}`);
  return res.json();
}

/** Update a team's coach_email (used to backfill existing teams). */
export async function owUpdateTeam(teamId: string, update: { name?: string; coach_email?: string }): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams/${teamId}`, {
    method: "PATCH",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  // Best-effort — don't throw
}

export async function owDeleteTeam(teamId: string): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/teams/${teamId}`, {
    method: "DELETE",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY },
  });
  if (!res.ok && res.status !== 404) throw new Error(`OW deleteTeam failed: ${res.status}`);
}

/** Update a user's name and/or email in OW. */
export async function owUpdateUser(
  userId: string,
  update: { first_name?: string; last_name?: string; email?: string }
): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  // Best-effort — don't throw so Supabase update still succeeds
}

export async function owDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${OW_API_URL}/api/v1/users/${userId}`, {
    method: "DELETE",
    headers: { "X-Open-Wearables-API-Key": OW_API_KEY },
  });
  if (!res.ok && res.status !== 404) throw new Error(`OW deleteUser failed: ${res.status}`);
}

// ─── Timeseries ────────────────────────────────────────────────────────────────

export interface OWTimeseriesPoint {
  date: string;   // YYYY-MM-DD (derived from timestamp)
  value: number;
  type: string;
}

/** The recovery-related timeseries types we fetch from WHOOP. */
const RECOVERY_TIMESERIES_TYPES = [
  "recovery_score",
  "resting_heart_rate",
  "heart_rate_variability_rmssd",  // WHOOP uses RMSSD (not SDNN)
  "oxygen_saturation",
  "respiratory_rate",
  "skin_temperature",
] as const;

interface RawTSPoint {
  timestamp: string;
  type: string;
  value: number;
  unit: string;
}

/**
 * Fetch timeseries data (recovery/HRV/RHR/SpO2/etc.) for the last N days.
 * Uses 500 days by default so data is captured even if syncing stopped months ago.
 * Paginates through all pages. Returns a map of type → points sorted newest-first.
 * Returns {} on error so callers always get a safe value.
 */
export async function owGetTimeseries(
  userId: string,
  days = 500
): Promise<Record<string, OWTimeseriesPoint[]>> {
  try {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);

    const allSamples: RawTSPoint[] = [];
    let cursor: string | null = null;

    do {
      const params: Record<string, string | string[]> = {
        start_time: startTime.toISOString(),
        end_time:   endTime.toISOString(),
        types:      [...RECOVERY_TIMESERIES_TYPES],
        limit:      "100",
      };
      if (cursor) params.cursor = cursor;

      const page = await owFetch<PaginatedOWResponse<RawTSPoint>>(
        `/api/v1/users/${userId}/timeseries`,
        params
      );
      allSamples.push(...(page.data ?? []));
      cursor = page.pagination.has_more ? page.pagination.next_cursor : null;
    } while (cursor);

    // Group by type → by date. Multiple readings per day → take the last one seen.
    const byTypeDate: Record<string, Record<string, number>> = {};
    for (const s of allSamples) {
      const date = s.timestamp.split("T")[0];
      if (!byTypeDate[s.type]) byTypeDate[s.type] = {};
      byTypeDate[s.type][date] = s.value;
    }

    // Convert to sorted arrays (newest first)
    const result: Record<string, OWTimeseriesPoint[]> = {};
    for (const [type, byDate] of Object.entries(byTypeDate)) {
      result[type] = Object.entries(byDate)
        .map(([date, value]) => ({ date, value, type }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return result;
  } catch {
    return {};
  }
}
