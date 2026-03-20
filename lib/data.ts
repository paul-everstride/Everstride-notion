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
const WEEK_LABELS = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];

/** Build a 7-point trend from the last 7 items (items are newest-first) */
function trendFromItems<T>(
  items: T[],
  getValue: (item: T) => number | null,
  fallback: number
): TrendPoint[] {
  const last7 = items.slice(0, 7).reverse();
  if (last7.length === 0) {
    return DAY_LABELS.map((label) => ({ label, value: fallback }));
  }
  return DAY_LABELS.map((label, i) => {
    const item = last7[i] ?? last7[last7.length - 1];
    return { label, value: getValue(item) ?? fallback };
  });
}

/** Synthesise a 6-week performance trend from a single current value */
function syntheticWeekTrend(current: number): TrendPoint[] {
  return WEEK_LABELS.map((label, i) => ({
    label,
    value: Math.max(0, Math.round((current - 10 + i * 2) * 10) / 10),
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
  body: OWBodySummary | null
): AthleteSummary {
  const latestRecovery = recovery[0];
  const latestSleep = sleep[0];

  const name =
    [capitalize(firstName), capitalize(lastName)].filter(Boolean).join(" ") ||
    "Unnamed Athlete";

  // ── Core metrics ──────────────────────────────────────────────────────────
  const recoveryScore = latestRecovery?.recovery_score ?? 0;
  const hrv = latestRecovery?.avg_hrv_sdnn_ms ?? latestSleep?.avg_hrv_sdnn_ms ?? 0;
  const restHr = latestRecovery?.resting_heart_rate_bpm ?? latestSleep?.avg_heart_rate_bpm ?? 0;
  const spo2 = latestRecovery?.avg_spo2_percent ?? latestSleep?.avg_spo2_percent ?? 0;
  const respirationRate = latestSleep?.avg_respiratory_rate ?? 0;
  const sleepEfficiency = latestSleep?.efficiency_percent ?? latestRecovery?.sleep_efficiency_percent ?? 0;

  // Sleep score: blend of efficiency and normalised duration (8h = 100)
  const durationMinutes = latestSleep?.duration_minutes ?? 0;
  const sleepDurationScore = Math.min(100, Math.round((durationMinutes / 480) * 100));
  const sleepScore = sleepEfficiency > 0
    ? Math.round((sleepEfficiency + sleepDurationScore) / 2)
    : sleepDurationScore;
  const sleepConsistency = Math.min(100, Math.round(sleepScore * 0.95));

  // Sleep stages (OW stores minutes, Everstride uses milliseconds)
  const stages = latestSleep?.stages;
  const totalBedMs = (latestSleep?.time_in_bed_minutes ?? durationMinutes) * 60_000;
  const totalRemMs = (stages?.rem_minutes ?? 0) * 60_000;
  const totalSlowWaveMs = (stages?.deep_minutes ?? 0) * 60_000;
  const totalLightMs = (stages?.light_minutes ?? 0) * 60_000;
  const totalAwakeMs = (stages?.awake_minutes ?? 0) * 60_000;

  // Body data
  const weightKg = body?.slow_changing.weight_kg ?? 68;
  const age = body?.slow_changing.age ?? 28;
  const skinTempRaw = body?.latest.skin_temperature_celsius ?? null;
  const skinTemp = skinTempRaw != null ? Math.round((skinTempRaw - 36.5) * 10) / 10 : 0;

  // ── Derived training metrics ───────────────────────────────────────────────
  const tss = Math.max(35, Math.round((sleepScore + recoveryScore) / 2));
  const atl = Math.max(40, Math.round(tss * 0.9));
  const ctl = Math.max(45, Math.round((tss + recoveryScore) / 1.7));
  const tsb = Math.round(ctl - atl);
  const vo2Max = Math.max(42, Math.round(48 + hrv / 4));
  const ftp = Math.max(210, Math.round(220 + hrv));
  const powerMax = Math.max(800, Math.round(ftp * 3.8));

  // ── 7-day trends ──────────────────────────────────────────────────────────
  const readinessTrend = trendFromItems(recovery, (r) => r.recovery_score, recoveryScore);
  const hrvTrend = trendFromItems(recovery, (r) => r.avg_hrv_sdnn_ms, hrv);
  const rhrTrend = trendFromItems(recovery, (r) => r.resting_heart_rate_bpm, restHr);
  const sleepTrend = trendFromItems(sleep, (s) => s.efficiency_percent, sleepScore);
  const sleepEfficiencyTrend = trendFromItems(sleep, (s) => s.efficiency_percent, sleepEfficiency);

  const tssTrend = readinessTrend.map((p) => ({
    label: p.label,
    value: Math.max(35, Math.round((p.value + sleepScore) / 2)),
  }));
  const atlTrend = tssTrend.map((p) => ({ ...p, value: Math.round(p.value * 0.9) }));
  const ctlTrend = tssTrend.map((p) => ({
    ...p,
    value: Math.round((p.value + recoveryScore) / 1.7),
  }));
  const tsbTrend = ctlTrend.map((c, i) => ({
    label: c.label,
    value: c.value - atlTrend[i].value,
  }));

  // ── 6-week performance trends ──────────────────────────────────────────────
  const powerTrend = syntheticWeekTrend(powerMax);
  const ftpTrend = syntheticWeekTrend(ftp);
  const vo2MaxTrend = syntheticWeekTrend(vo2Max);

  const creationDate =
    latestRecovery?.date ?? latestSleep?.date ?? createdAt.split("T")[0];

  const statusNote =
    recoveryScore >= 67
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
    polarizedZones: { low: 70, moderate: 18, high: 12 },
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
    powerCurve: [
      { label: "5 sec",  value: Math.round(powerMax * 0.94) },
      { label: "30 sec", value: Math.round(powerMax * 0.65) },
      { label: "1 min",  value: Math.round(powerMax * 0.47) },
      { label: "5 min",  value: Math.round(powerMax * 0.34) },
      { label: "30 min", value: Math.round(powerMax * 0.22) },
      { label: "FTP",    value: ftp },
    ],
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

            // Skip users with no wearable data at all
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
      .sort((a, b) => b.recoveryScore - a.recoveryScore);

    if (!athletes.length) return emptyDashboard;

    const teamAverageRecovery = Math.round(
      athletes.reduce((s, a) => s + a.recoveryScore, 0) / athletes.length
    );
    const teamAverageSleep = Math.round(
      athletes.reduce((s, a) => s + a.sleepScore, 0) / athletes.length
    );
    const teamAverageHrv = Math.round(
      athletes.reduce((s, a) => s + a.hrv, 0) / athletes.length
    );

    return {
      athletes,
      teamAverageRecovery,
      teamAverageSleep,
      teamAverageHrv,
      attentionAthletes: athletes.filter(
        (a) => a.recoveryScore < 60 || a.sleepScore < 65
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
