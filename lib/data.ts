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
  type OWRecoverySummary,
  type OWSleepSummary,
  type OWBodySummary,
} from "@/lib/ow-client";

// ─── Trend helpers ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FLAT_TREND = DAY_LABELS.map((label) => ({ label, value: 0 }));

/** Build a 7-point trend from the last 7 items (items are newest-first).
 *  Returns null if every value in the items is null (meaning no data). */
function trendFromItems<T>(
  items: T[],
  getValue: (item: T) => number | null,
  fallback: number | null
): TrendPoint[] {
  const last7 = items.slice(0, 7).reverse();
  if (last7.length === 0) {
    return DAY_LABELS.map((label) => ({ label, value: fallback ?? 0 }));
  }
  return DAY_LABELS.map((label, i) => {
    const item = last7[i] ?? last7[last7.length - 1];
    return { label, value: getValue(item) ?? fallback ?? 0 };
  });
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
  body: OWBodySummary | null
): AthleteSummary {
  const latestRecovery = recovery[0] ?? null;
  const latestSleep = sleep[0] ?? null;

  const name =
    [capitalize(firstName), capitalize(lastName)].filter(Boolean).join(" ") ||
    "Unnamed Athlete";

  // ── Core metrics — null when wearable does not provide them ───────────────
  // Recovery score: only available when recovery endpoint works
  const recoveryScore: number | null = latestRecovery?.recovery_score ?? null;

  // HRV: WHOOP does not expose this in the sleep summary endpoint yet
  const hrv: number | null =
    latestRecovery?.avg_hrv_sdnn_ms ??
    latestSleep?.avg_hrv_sdnn_ms ??
    null;

  // Resting HR: WHOOP does not expose this in the sleep summary endpoint
  const restHr: number | null =
    latestRecovery?.resting_heart_rate_bpm ??
    latestSleep?.avg_heart_rate_bpm ??
    null;

  // SpO2 & respiration: not returned by WHOOP sleep summary
  const spo2: number | null =
    latestRecovery?.avg_spo2_percent ??
    latestSleep?.avg_spo2_percent ??
    null;

  const respirationRate: number | null = latestSleep?.avg_respiratory_rate ?? null;

  // ── Sleep metrics — real WHOOP data ───────────────────────────────────────
  const sleepEfficiency = latestSleep?.efficiency_percent ?? latestRecovery?.sleep_efficiency_percent ?? 0;
  const durationMinutes = latestSleep?.duration_minutes ?? 0;
  const sleepDurationScore = Math.min(100, Math.round((durationMinutes / 480) * 100));
  const sleepScore = sleepEfficiency > 0
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
  const skinTempRaw = body?.latest.skin_temperature_celsius ?? null;
  const skinTemp: number | null =
    skinTempRaw != null ? Math.round((skinTempRaw - 36.5) * 10) / 10 : null;

  // ── Performance metrics — null (require power meter / recovery data) ───────
  const tss: number | null = null;
  const atl: number | null = null;
  const ctl: number | null = null;
  const tsb: number | null = null;
  const vo2Max: number | null = null;
  const ftp: number | null = null;
  const powerMax: number | null = null;

  // ── 7-day trends from real data ───────────────────────────────────────────
  const readinessTrend = trendFromItems(recovery, (r) => r.recovery_score, recoveryScore);
  const hrvTrend = trendFromItems(recovery, (r) => r.avg_hrv_sdnn_ms, hrv);
  const rhrTrend = trendFromItems(recovery, (r) => r.resting_heart_rate_bpm, restHr);
  const sleepTrend = trendFromItems(sleep, (s) => s.efficiency_percent, sleepScore);
  const sleepEfficiencyTrend = trendFromItems(sleep, (s) => s.efficiency_percent, sleepEfficiency);

  const tssTrend = FLAT_TREND;
  const atlTrend = FLAT_TREND;
  const ctlTrend = FLAT_TREND;
  const tsbTrend = FLAT_TREND;
  const powerTrend = FLAT_TREND;
  const ftpTrend = FLAT_TREND;
  const vo2MaxTrend = FLAT_TREND;

  const creationDate =
    latestRecovery?.date ?? latestSleep?.date ?? createdAt.split("T")[0];

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
            const [recovery, sleep, body] = await Promise.all([
              owGetRecovery(user.id),
              owGetSleep(user.id),
              owGetBody(user.id),
            ]);
            if (!recovery.length && !sleep.length) return null;
            return toAthleteSummary(
              user.id,
              user.first_name,
              user.last_name,
              user.email,
              user.created_at,
              recovery,
              sleep,
              body
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
    const withHrv = athletes.filter((a) => a.hrv != null);

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
