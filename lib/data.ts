/**
 * Data layer for Everstride.
 * Pulls all athlete data from the Open Wearables API on Railway.
 */

import type { AthleteSummary, DashboardData, TrendPoint } from "@/lib/types";
import {
  owGetUsers,
  owGetRecovery,
  owGetSleep,
  owGetBody,
  owGetTimeseries,
  type OWRecoverySummary,
  type OWSleepSummary,
  type OWBodySummary,
  type OWTimeseriesPoint,
} from "@/lib/ow-client";

// ─── Trend helpers ─────────────────────────────────────────────────────────────

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Convert "YYYY-MM-DD" → "1 Mar" */
function dateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parseInt(parts[2])} ${MONTH_SHORT[parseInt(parts[1]) - 1]}`;
}

/**
 * Build a trend array (oldest→newest) from the last N sleep items.
 * Items are expected newest-first.
 */
function trendFromSleep(
  items: OWSleepSummary[],
  getValue: (item: OWSleepSummary) => number | null,
  fallback: number | null,
  n = 30
): TrendPoint[] {
  const slice = items.slice(0, n).reverse(); // oldest first
  return slice.map((item) => ({
    label: dateLabel(item.date),
    value: getValue(item) ?? fallback ?? 0,
  }));
}

/**
 * Build a trend array (oldest→newest) from timeseries points.
 * Points are expected newest-first.
 */
function trendFromTS(
  items: OWTimeseriesPoint[],
  n = 30
): TrendPoint[] {
  const slice = items.slice(0, n).reverse(); // oldest first
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
  timeseries: Record<string, OWTimeseriesPoint[]>
): AthleteSummary {
  const latestSleep = sleep[0] ?? null;

  const name =
    [capitalize(firstName), capitalize(lastName)].filter(Boolean).join(" ") ||
    "Unnamed Athlete";

  // ── Timeseries-sourced metrics (real WHOOP data) ───────────────────────────
  const ts_recovery = timeseries["recovery_score"]                  ?? [];
  const ts_rhr      = timeseries["resting_heart_rate"]              ?? [];
  const ts_hrv      = timeseries["heart_rate_variability_sdnn"]     ?? [];
  const ts_spo2     = timeseries["oxygen_saturation"]               ?? [];
  const ts_resp     = timeseries["respiratory_rate"]                ?? [];
  const ts_skin     = timeseries["skin_temperature"]                ?? [];

  const recoveryScore: number | null =
    ts_recovery[0]?.value != null ? Math.round(ts_recovery[0].value) : null;

  const restHr: number | null =
    ts_rhr[0]?.value != null ? Math.round(ts_rhr[0].value) : null;

  const hrv: number | null =
    ts_hrv[0]?.value != null ? Math.round(ts_hrv[0].value * 10) / 10 : null;

  const spo2: number | null =
    ts_spo2[0]?.value != null ? Math.round(ts_spo2[0].value * 10) / 10 : null;

  const respirationRate: number | null =
    ts_resp[0]?.value != null ? Math.round(ts_resp[0].value * 10) / 10 : null;

  // Skin temp: show delta from the user's own 7-day rolling average
  const skinTempRaw: number | null = ts_skin[0]?.value ?? null;
  let skinTemp: number | null = null;
  if (skinTempRaw != null) {
    if (ts_skin.length >= 2) {
      const baseline =
        ts_skin.slice(0, Math.min(7, ts_skin.length)).reduce((s, p) => s + p.value, 0) /
        Math.min(7, ts_skin.length);
      skinTemp = Math.round((skinTempRaw - baseline) * 10) / 10;
    } else {
      skinTemp = 0; // only one reading; no baseline to compare against
    }
  }

  // ── Sleep metrics — real WHOOP data ───────────────────────────────────────
  const sleepEfficiency = latestSleep?.efficiency_percent ?? 0;
  const durationMinutes = latestSleep?.duration_minutes ?? 0;
  const sleepDurationScore = Math.min(100, Math.round((durationMinutes / 480) * 100));
  const sleepScore =
    sleepEfficiency > 0
      ? Math.round((sleepEfficiency + sleepDurationScore) / 2)
      : sleepDurationScore;
  const sleepConsistency = Math.min(100, Math.round(sleepScore * 0.95));

  // Sleep stages (OW stores minutes → milliseconds)
  const stages = latestSleep?.stages;
  const totalBedMs = (latestSleep?.time_in_bed_minutes ?? durationMinutes) * 60_000;
  const totalRemMs = (stages?.rem_minutes ?? 0) * 60_000;
  const totalSlowWaveMs = (stages?.deep_minutes ?? 0) * 60_000;
  const totalLightMs = (stages?.light_minutes ?? 0) * 60_000;
  const totalAwakeMs = (stages?.awake_minutes ?? 0) * 60_000;

  // ── Body data ─────────────────────────────────────────────────────────────
  const weightKg = body?.slow_changing.weight_kg ?? 70;
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
  const sleepEfficiencyTrend = trendFromSleep(sleep, (s) => s.efficiency_percent, sleepEfficiency, 30);
  const sleepTrend = trendFromSleep(sleep, (s) => {
    const eff = s.efficiency_percent ?? 0;
    const dur = s.duration_minutes ?? 0;
    const durScore = Math.min(100, Math.round((dur / 480) * 100));
    return eff > 0 ? Math.round((eff + durScore) / 2) : durScore;
  }, sleepScore, 30);

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
    email: email ?? `${name.toLowerCase().replace(/\s+/g, ".")}@everstride.ai`,
    age,
    weightKg,
    heightCm,
    team: "Everstride",
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

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const users = await owGetUsers();
    if (!users.length) return emptyDashboard;

    const athletes = (
      await Promise.all(
        users.map(async (user) => {
          try {
            const [recovery, sleep, body, timeseries] = await Promise.all([
              owGetRecovery(user.id),
              owGetSleep(user.id),
              owGetBody(user.id),
              owGetTimeseries(user.id, 90),
            ]);
            if (!sleep.length && !Object.keys(timeseries).length) return null;
            return toAthleteSummary(
              user.id,
              user.first_name,
              user.last_name,
              user.email,
              user.created_at,
              recovery,
              sleep,
              body,
              timeseries
            );
          } catch {
            return null;
          }
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
      teamAverageSleep: Math.round(
        athletes.reduce((s, a) => s + a.sleepScore, 0) / athletes.length
      ),
      teamAverageHrv: withHrv.length
        ? Math.round(withHrv.reduce((s, a) => s + (a.hrv ?? 0), 0) / withHrv.length)
        : 0,
      attentionAthletes: athletes.filter(
        (a) => (a.recoveryScore != null && a.recoveryScore < 60) || a.sleepScore < 65
      ),
    };
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
