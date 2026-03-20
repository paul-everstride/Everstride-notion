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

async function owFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${OW_API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
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
 * Fetch sleep summaries for a user over the last N days.
 * Returns items sorted newest first.
 */
export async function owGetSleep(userId: string, days = 730): Promise<OWSleepSummary[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await owFetch<PaginatedOWResponse<OWSleepSummary>>(
    `/api/v1/users/${userId}/summaries/sleep`,
    {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      limit: "100",
    }
  );

  return (data.data ?? []).sort((a, b) => b.date.localeCompare(a.date));
}

/** Fetch body summary for a user (most recent values). */
export async function owGetBody(userId: string): Promise<OWBodySummary | null> {
  try {
    return await owFetch<OWBodySummary>(`/api/v1/users/${userId}/summaries/body`);
  } catch {
    return null;
  }
}
