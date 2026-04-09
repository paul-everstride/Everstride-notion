/**
 * Data layer for Everstride.
 * Pulls athlete data from the Open Wearables API, filtered by the
 * logged-in coach's team assignments stored in Supabase.
 */

import { unstable_cache } from "next/cache";
import type { AthleteSummary, DashboardData, RecoveryHistoryDay, TrendPoint } from "@/lib/types";
import {
  owGetUsers,
  owGetRecovery,
  owGetSleep,
  owGetBody,
  owGetTimeseries,
  owGetTeamMembers,
  type OWRecoverySummary,
  type OWSleepSummary,
  type OWBodySummary,
  type OWTimeseriesPoint,
} from "@/lib/ow-client";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// ─── Trend helpers ─────────────────────────────────────────────────────────────

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_ABBR    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** Convert "YYYY-MM-DD" → "1 Mar" (for trend chart X-axis) */
function dateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parseInt(parts[2])} ${MONTH_SHORT[parseInt(parts[1]) - 1]}`;
}

/** Convert "YYYY-MM-DD" → "Nov 6" (short, for recovery chart) */
function shortLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${MONTH_SHORT[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
}

/** Convert "YYYY-MM-DD" → "Thu, Nov 6" (full, for table display) */
function fullDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return `${DAY_ABBR[d.getUTCDay()]}, ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Build a trend array (oldest→newest) from the last N sleep items.
 * Items are expected newest-first.
 * Only includes items within the last N calendar days — so stale data
 * from months ago is never shown when "7d" or "30d" is selected.
 */
function trendFromSleep(
  items: OWSleepSummary[],
  getValue: (item: OWSleepSummary) => number | null,
  fallback: number | null,
  n = 30
): TrendPoint[] {
  const cutoff = new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const slice = items.filter(item => item.date >= cutoff).slice(0, n).reverse(); // oldest first
  return slice.map((item) => ({
    label: dateLabel(item.date),
    value: getValue(item) ?? fallback ?? 0,
  }));
}

/**
 * Build a trend array (oldest→newest) from timeseries points.
 * Points are expected newest-first.
 * Only includes items within the last N calendar days — so stale data
 * from months ago is never shown when "7d" or "30d" is selected.
 */
function trendFromTS(
  items: OWTimeseriesPoint[],
  n = 30
): TrendPoint[] {
  const cutoff = new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const slice = items.filter(item => item.date >= cutoff).slice(0, n).reverse(); // oldest first
  return slice.map((item) => ({
    label: dateLabel(item.date),
    value: item.value,
  }));
}

/** Capitalise the first letter of a name part */
function capitalize(s: string | null): string | null {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Mapping ───────────────────────────────────────────────────────────────────

function toAthleteSummary(
  userId: string,
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  createdAt: string,
  recovery: OWRecoverySummary[],
  sleep: OWSleepSummary[],
  body: OWBodySummary | null,
  timeseries: Record<string, OWTimeseriesPoint[]>,
  avatarUrl: string | null = null,
  teamName: string | null = null
): AthleteSummary {
  const latestSleep = sleep[0] ?? null;

  const name =
    [capitalize(firstName), capitalize(lastName)].filter(Boolean).join(" ") ||
    "Unnamed Athlete";

  // ── Timeseries-sourced metrics (real WHOOP data) ───────────────────────────
  const ts_recovery = timeseries["recovery_score"]                ?? [];
  const ts_rhr      = timeseries["resting_heart_rate"]            ?? [];
  const ts_hrv      = timeseries["heart_rate_variability_rmssd"]  ?? []; // WHOOP uses RMSSD
  const ts_spo2     = timeseries["oxygen_saturation"]             ?? [];
  const ts_resp     = timeseries["respiratory_rate"]              ?? [];
  const ts_skin     = timeseries["skin_temperature"]              ?? [];

  // ── Today-only headline metrics (dashboard cards) ─────────────────────────
  // Only use the most recent data point if it is from today.
  // WHOOP logs overnight sleep under the date it *completed* (the morning),
  // so today's date always contains the current night's data.
  // Show headline metrics if the latest data is from today or yesterday.
  // WHOOP syncs after waking up, so yesterday's data is often the most recent.
  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const isRecent = (date: string | undefined): boolean =>
    date != null && (date === todayStr || date === yesterdayStr);

  const recoveryScore: number | null =
    isRecent(ts_recovery[0]?.date) && ts_recovery[0]?.value != null
      ? Math.round(ts_recovery[0].value) : null;

  const restHr: number | null =
    isRecent(ts_rhr[0]?.date) && ts_rhr[0]?.value != null
      ? Math.round(ts_rhr[0].value) : null;

  const hrv: number | null =
    isRecent(ts_hrv[0]?.date) && ts_hrv[0]?.value != null
      ? Math.round(ts_hrv[0].value) : null;

  const spo2: number | null =
    isRecent(ts_spo2[0]?.date) && ts_spo2[0]?.value != null
      ? Math.round(ts_spo2[0].value * 10) / 10 : null;

  const respirationRate: number | null =
    isRecent(ts_resp[0]?.date) && ts_resp[0]?.value != null
      ? Math.round(ts_resp[0].value * 10) / 10 : null;

  // Skin temp: delta from the user's own 7-day rolling average (recent only)
  const skinTempRaw: number | null =
    isRecent(ts_skin[0]?.date) ? (ts_skin[0]?.value ?? null) : null;
  let skinTemp: number | null = null;
  if (skinTempRaw != null) {
    if (ts_skin.length >= 2) {
      const baseline =
        ts_skin.slice(0, Math.min(7, ts_skin.length)).reduce((s, p) => s + p.value, 0) /
        Math.min(7, ts_skin.length);
      skinTemp = Math.round((skinTempRaw - baseline) * 10) / 10;
    } else {
      skinTemp = 0;
    }
  }

  // suppress unused-variable warning — todayStr used below in recoveryHistory
  void todayStr;

  // ── Full recovery + sleep history (all days, oldest → newest) ────────────
  const recMap  = Object.fromEntries(ts_recovery.map(p => [p.date, p.value]));
  const rhrMap  = Object.fromEntries(ts_rhr.map(p => [p.date, p.value]));
  const hrvMap  = Object.fromEntries(ts_hrv.map(p => [p.date, p.value]));
  const spo2Map = Object.fromEntries(ts_spo2.map(p => [p.date, p.value]));
  const skinMap = Object.fromEntries(ts_skin.map(p => [p.date, p.value]));
  const respMap = Object.fromEntries(ts_resp.map(p => [p.date, p.value]));

  // Sleep records keyed by date so we can join per-day sleep data
  const sleepByDate = Object.fromEntries(sleep.map(s => [s.date, s]));

  // Build a continuous date range from earliest to latest data point (no gaps)
  const rawDates = [
    ...ts_recovery.map(p => p.date),
    ...ts_rhr.map(p => p.date),
    ...ts_hrv.map(p => p.date),
    ...ts_spo2.map(p => p.date),
    ...ts_skin.map(p => p.date),
    ...ts_resp.map(p => p.date),
    ...sleep.map(s => s.date),
  ];
  const allHistoryDates: string[] = [];
  if (rawDates.length > 0) {
    const sorted = rawDates.sort();
    const start = new Date(sorted[0] + "T00:00:00");
    const end = new Date(sorted[sorted.length - 1] + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allHistoryDates.push(d.toISOString().slice(0, 10));
    }
  }

  const recoveryHistory: RecoveryHistoryDay[] = allHistoryDates.map(date => {
    const s = sleepByDate[date];
    const sleepDur = s?.duration_minutes ?? 0;
    const sleepEff = s?.efficiency_percent ?? 0;
    const durScore  = sleepDur > 0 ? Math.min(100, Math.round((sleepDur / 480) * 100)) : null;
    const slpScore  =
      durScore != null && sleepEff > 0 ? Math.round((sleepEff + durScore) / 2)
      : durScore;
    return {
      date,
      label:      fullDayLabel(date),
      shortLabel: shortLabel(date),
      recoveryScore: recMap[date]  != null ? Math.round(recMap[date])            : null,
      hrv:           hrvMap[date]  != null ? Math.round(hrvMap[date])            : null,
      restHr:        rhrMap[date]  != null ? Math.round(rhrMap[date])            : null,
      spo2:          spo2Map[date] != null ? Math.round(spo2Map[date] * 10) / 10 : null,
      skinTempC:     skinMap[date] != null ? Math.round(skinMap[date] * 10) / 10 : null,
      resp:          respMap[date] != null ? Math.round(respMap[date] * 10) / 10 : null,
      sleepScore:       slpScore ?? null,
      sleepEfficiency:  sleepEff > 0 ? Math.round(sleepEff) : null,
      sleepDurationMins: sleepDur > 0 ? sleepDur : null,
      sleepDeepMins:    s?.stages?.deep_minutes   ?? null,
      sleepRemMins:     s?.stages?.rem_minutes    ?? null,
      sleepLightMins:   s?.stages?.light_minutes  ?? null,
      sleepAwakeMins:   s?.stages?.awake_minutes  ?? null,
    };
  });

  // ── Sleep metrics — recency-gated, same rule as recovery ─────────────────
  // Only show headline sleep values if the latest sleep record is from
  // today or yesterday. Stale data (days/weeks old) renders as null → "—".
  const isSleepRecent = isRecent(latestSleep?.date);
  const sleepEfficiency: number | null =
    isSleepRecent && (latestSleep?.efficiency_percent ?? 0) > 0
      ? Math.round(latestSleep!.efficiency_percent!)
      : null;
  const durationMinutes = isSleepRecent ? (latestSleep?.duration_minutes ?? 0) : 0;
  const sleepDurationScore = durationMinutes > 0
    ? Math.min(100, Math.round((durationMinutes / 480) * 100))
    : null;
  const sleepScore: number | null = (() => {
    if (!isSleepRecent) return null;
    const eff = latestSleep?.efficiency_percent ?? 0;
    const dur = durationMinutes;
    const durScore = Math.min(100, Math.round((dur / 480) * 100));
    if (eff > 0) return Math.round((eff + durScore) / 2);
    return durScore > 0 ? durScore : null;
  })();
  const sleepConsistency: number | null =
    sleepScore != null ? Math.min(100, Math.round(sleepScore * 0.95)) : null;

  // Sleep stages — only meaningful when sleep data is recent
  const stages = isSleepRecent ? (latestSleep?.stages ?? null) : null;
  const totalBedMs = isSleepRecent ? (latestSleep?.time_in_bed_minutes ?? durationMinutes) * 60_000 : 0;
  const totalRemMs = (stages?.rem_minutes ?? 0) * 60_000;
  const totalSlowWaveMs = (stages?.deep_minutes ?? 0) * 60_000;
  const totalLightMs = (stages?.light_minutes ?? 0) * 60_000;
  const totalAwakeMs = (stages?.awake_minutes ?? 0) * 60_000;

  // ── Body data ─────────────────────────────────────────────────────────────
  const weightKg = body?.slow_changing.weight_kg ?? null;
  const heightCm = body?.slow_changing.height_cm ?? null;
  const age: number | null = body?.slow_changing.age ?? null;

  // ── Performance metrics — null (require power meter) ──────────────────────
  const tss: number | null = null;
  const atl: number | null = null;
  const ctl: number | null = null;
  const tsb: number | null = null;
  const vo2Max: number | null = null;
  const ftp: number | null = null;
  const powerMax: number | null = null;

  // ── 30-day trend data from real data (oldest→newest) ─────────────────────
  const readinessTrend     = trendFromTS(ts_recovery, 30);
  const rhrTrend           = trendFromTS(ts_rhr, 30);
  const hrvTrend           = trendFromTS(ts_hrv, 30);
  const sleepEfficiencyTrend = trendFromSleep(sleep, (s) => s.efficiency_percent, sleepEfficiency ?? 0, 30);
  const sleepTrend = trendFromSleep(sleep, (s) => {
    const eff = s.efficiency_percent ?? 0;
    const dur = s.duration_minutes ?? 0;
    const durScore = Math.min(100, Math.round((dur / 480) * 100));
    return eff > 0 ? Math.round((eff + durScore) / 2) : durScore;
  }, sleepScore ?? 0, 30);

  // Performance trends — flat/empty until power meter data arrives
  const tssTrend: TrendPoint[]    = [];
  const atlTrend: TrendPoint[]    = [];
  const ctlTrend: TrendPoint[]    = [];
  const tsbTrend: TrendPoint[]    = [];
  const powerTrend: TrendPoint[]  = [];
  const ftpTrend: TrendPoint[]    = [];
  const vo2MaxTrend: TrendPoint[] = [];

  const creationDate =
    ts_recovery[0]?.date ?? latestSleep?.date ?? createdAt.split("T")[0];

  const statusNote =
    recoveryScore == null
      ? "No recovery data yet."
      : recoveryScore >= 67
      ? "Good recovery. Ready for training."
      : recoveryScore >= 34
      ? "Moderate recovery. Manageable load today."
      : "Low recovery. Reduce training load.";

  return {
    id: userId,
    userId,
    name,
    email: email ?? null,
    avatarUrl,
    age,
    weightKg,
    heightCm,
    team: teamName ?? "—",
    recoveryScore,
    sleepScore,
    restHr,
    hrv,
    tss,
    atl,
    ctl,
    tsb,
    vo2Max,
    ftp,
    powerMax,
    polarizedZones: { low: 0, moderate: 0, high: 0 },
    spo2,
    sleepConsistency,
    sleepEfficiency,
    respirationRate,
    skinTemp,
    totalBedMs,
    totalRemMs,
    totalSlowWaveMs,
    totalLightMs,
    totalAwakeMs,
    creationDate,
    createdAt,
    statusNote,
    readinessTrend,
    sleepTrend,
    hrvTrend,
    rhrTrend,
    tssTrend,
    sleepEfficiencyTrend,
    atlTrend,
    ctlTrend,
    tsbTrend,
    powerTrend,
    ftpTrend,
    vo2MaxTrend,
    powerCurve: [],
    recoveryHistory,
  };
}

// ─── Empty state ────────────────────────────────────────────────────────────────

const emptyDashboard: DashboardData = {
  athletes: [],
  teamAverageRecovery: 0,
  teamAverageSleep: 0,
  teamAverageHrv: 0,
  attentionAthletes: [],
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the OW user IDs that belong to the current coach's teams.
 * Returns null if Supabase is not configured (fall back to all users).
 */
async function getCoachAthleteIds(): Promise<string[] | null> {
  const user = await getCurrentUser();
  if (!user || user.id === "local-demo-user") return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  // Get all teams for this coach (including their OW team IDs)
  const { data: teams } = await supabase
    .from("teams")
    .select("id, ow_team_id")
    .eq("coach_id", user.id);

  if (!teams || teams.length === 0) return [];

  // 1. Athletes registered via Everstride (Supabase source of truth)
  const teamIds = teams.map((t: { id: string }) => t.id);
  const { data: supabaseAthletes } = await supabase
    .from("team_athletes")
    .select("ow_user_id")
    .in("team_id", teamIds);
  const supabaseIds = (supabaseAthletes ?? []).map((a: { ow_user_id: string }) => a.ow_user_id);

  // 2. Athletes added directly in OW dashboard (fetch live from OW API)
  const owTeamIds = teams
    .map((t: { ow_team_id?: string | null }) => t.ow_team_id)
    .filter(Boolean) as string[];

  const owMemberArrays = await Promise.all(
    owTeamIds.map(async (teamId) => {
      try {
        const members = await owGetTeamMembers(teamId);
        return members.map(m => m.id);
      } catch {
        return [];
      }
    })
  );
  const owIds = owMemberArrays.flat();

  // Merge both sources, deduplicate
  const allIds = [...new Set([...supabaseIds, ...owIds])];
  return allIds.length > 0 ? allIds : [];
}

// ─── Core fetch logic (shared by cached + uncached paths) ─────────────────────

async function fetchAthletesFromOW(userIds: string[]): Promise<DashboardData> {
  const users = await owGetUsers();
  if (!users.length) return emptyDashboard;

  const filtered = userIds.length > 0
    ? users.filter((u) => userIds.includes(u.id))
    : users;

  if (!filtered.length) return emptyDashboard;

  // Fetch avatar URLs and team names from Supabase for all athletes
  const avatarMap = new Map<string, string | null>();
  const teamNameMap = new Map<string, string>();
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data: avatarRows, error: avatarErr } = await supabase
      .from("team_athletes")
      .select("ow_user_id, avatar_url, team_id")
      .in("ow_user_id", filtered.map(u => u.id));
    if (avatarErr) {
      console.error("[data.ts] avatar_url fetch failed:", avatarErr.message);
    }
    // Build team ID → name lookup
    const teamIds = [...new Set((avatarRows ?? []).map(r => r.team_id).filter(Boolean))];
    if (teamIds.length > 0) {
      const { data: teamRows } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds);
      const teamIdToName = new Map((teamRows ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));
      for (const row of avatarRows ?? []) {
        if (row.ow_user_id) {
          avatarMap.set(row.ow_user_id, row.avatar_url ?? null);
          if (row.team_id && teamIdToName.has(row.team_id)) {
            teamNameMap.set(row.ow_user_id, teamIdToName.get(row.team_id)!);
          }
        }
      }
    } else {
      for (const row of avatarRows ?? []) {
        if (row.ow_user_id) avatarMap.set(row.ow_user_id, row.avatar_url ?? null);
      }
    }
  }

  const athletes = (
    await Promise.all(
      filtered.map(async (user) => {
        try {
          const [recovery, sleep, body, timeseries] = await Promise.all([
            owGetRecovery(user.id),
            owGetSleep(user.id),
            owGetBody(user.id),
            owGetTimeseries(user.id),
          ]);
          if (!sleep.length && !Object.keys(timeseries).length) return null;
          return toAthleteSummary(
            user.id, user.first_name, user.last_name,
            user.email, user.created_at,
            recovery, sleep, body, timeseries,
            avatarMap.get(user.id) ?? null,
            teamNameMap.get(user.id) ?? null
          );
        } catch { return null; }
      })
    )
  )
    .filter((a): a is AthleteSummary => a !== null)
    .sort((a, b) => (b.recoveryScore ?? 0) - (a.recoveryScore ?? 0));

  if (!athletes.length) return emptyDashboard;

  const withRecovery = athletes.filter((a) => a.recoveryScore != null);
  const withHrv      = athletes.filter((a) => a.hrv != null);

  return {
    athletes,
    teamAverageRecovery: withRecovery.length
      ? Math.round(withRecovery.reduce((s, a) => s + (a.recoveryScore ?? 0), 0) / withRecovery.length)
      : 0,
    teamAverageSleep: (() => {
      const withSleep = athletes.filter(a => a.sleepScore != null);
      return withSleep.length
        ? Math.round(withSleep.reduce((s, a) => s + (a.sleepScore ?? 0), 0) / withSleep.length)
        : 0;
    })(),
    teamAverageHrv: withHrv.length
      ? Math.round(withHrv.reduce((s, a) => s + (a.hrv ?? 0), 0) / withHrv.length)
      : 0,
    attentionAthletes: athletes.filter(
      (a) => (a.recoveryScore != null && a.recoveryScore < 60) || (a.sleepScore != null && a.sleepScore < 65)
    ),
  };
}

// Cache wrapper — keyed by sorted athlete IDs, revalidates every 5 minutes
// Tag "dashboard-athletes" lets actions bust this cache immediately via revalidateTag
const fetchAthletesCached = unstable_cache(
  fetchAthletesFromOW,
  ["dashboard-athletes"],
  { revalidate: 300, tags: ["dashboard-athletes"] }
);

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const allowedIds = await getCoachAthleteIds();

    if (allowedIds === null) {
      // Dev mode / Supabase not configured — skip cache, show all
      return fetchAthletesFromOW([]);
    }

    if (allowedIds.length === 0) return emptyDashboard;

    // Sort IDs so same set of athletes always hits the same cache entry
    return fetchAthletesCached([...allowedIds].sort());
  } catch {
    return emptyDashboard;
  }
}

export async function getAthleteById(id: string): Promise<AthleteSummary | null> {
  const dashboard = await getDashboardData();
  return dashboard.athletes.find((a) => a.id === id || a.userId === id) ?? null;
}

export async function getAthleteByUserId(userId: string): Promise<AthleteSummary | null> {
  const dashboard = await getDashboardData();
  return dashboard.athletes.find((a) => a.userId === userId) ?? null;
}
