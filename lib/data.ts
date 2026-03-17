import { mockAthletes, mockDashboardData } from "@/lib/mock-data";
import type { AthleteMetricRow, AthleteSummary, DashboardData } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const performanceLabels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];

function buildTrend(labels: string[], values: number[]) {
  return labels.map((label, index) => ({
    label,
    value: values[index] ?? values[values.length - 1]
  }));
}

function buildSyntheticSeries(base: number, drift = 0, clampZero = true) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = Math.round((base - 3 + index) * 10 + drift) / 10;
    return clampZero ? Math.max(0, value) : value;
  });
}

function buildPerformanceSeries(base: number) {
  return Array.from({ length: 6 }, (_, index) => Math.max(0, Math.round((base - 6 + index * 2) * 10) / 10));
}

function toAthleteSummary(row: AthleteMetricRow): AthleteSummary {
  const firstName = row.First_name?.trim() || "Unknown";
  const lastName = row.Last_name?.trim() || "Athlete";
  const name = `${firstName} ${lastName}`.trim();
  const recoveryScore = row.recoveryscore ?? 0;
  const sleepScore = row.Sleep_score ?? 0;
  const hrv = row.HRV ?? 0;
  const restHr = row.rest_hr ?? 0;
  const sleepEfficiency = row.sleep_efficiency ?? 0;
  const tss = Math.max(35, Math.round((sleepScore + recoveryScore) / 2));
  const atl = Math.max(40, Math.round(tss * 0.9));
  const ctl = Math.max(45, Math.round((tss + recoveryScore) / 1.7));
  const tsb = Math.round(ctl - atl);
  const vo2Max = Math.max(42, Math.round(48 + hrv / 4));
  const ftp = Math.max(210, Math.round(220 + hrv));
  const powerMax = Math.max(800, Math.round(ftp * 3.8));
  const readinessTrend = buildTrend(dayLabels, buildSyntheticSeries(recoveryScore));
  const sleepTrend = buildTrend(dayLabels, buildSyntheticSeries(sleepScore));
  const hrvTrend = buildTrend(dayLabels, buildSyntheticSeries(hrv));
  const rhrTrend = buildTrend(dayLabels, buildSyntheticSeries(restHr, -10));
  const tssTrend = buildTrend(dayLabels, buildSyntheticSeries(tss));
  const sleepEfficiencyTrend = buildTrend(dayLabels, buildSyntheticSeries(sleepEfficiency));
  const atlTrend = buildTrend(dayLabels, buildSyntheticSeries(atl));
  const ctlTrend = buildTrend(dayLabels, buildSyntheticSeries(ctl));
  const tsbTrend = buildTrend(dayLabels, buildSyntheticSeries(tsb, 0, false));
  const powerTrend = buildTrend(performanceLabels, buildPerformanceSeries(powerMax));
  const ftpTrend = buildTrend(performanceLabels, buildPerformanceSeries(ftp));
  const vo2MaxTrend = buildTrend(performanceLabels, buildPerformanceSeries(vo2Max));

  return {
    id: row.id,
    userId: row.user_id,
    name,
    email: row.Email ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@everstride.ai`,
    age: 28,
    weightKg: 68,
    team: "Everstride Development",
    recoveryScore,
    hrv,
    sleepScore,
    restHr,
    tss,
    atl,
    ctl,
    tsb,
    vo2Max,
    ftp,
    powerMax,
    polarizedZones: { low: 70, moderate: 18, high: 12 },
    spo2: row.SP02 ?? 0,
    sleepConsistency: row.sleep_consistency ?? 0,
    sleepEfficiency,
    respirationRate: row.Resp_rate ?? 0,
    skinTemp: row.skin_temp ?? 0,
    totalBedMs: row.total_bed_mil ?? 0,
    totalRemMs: row.total_rem_mil ?? 0,
    totalSlowWaveMs: row.total_slow_wave_mil ?? 0,
    totalLightMs: row.total_light_mil ?? 0,
    totalAwakeMs: row.total_awake_mil ?? 0,
    creationDate: row.creation_date ?? row.created_at,
    createdAt: row.created_at,
    statusNote: "Pulled from latest wearable sync.",
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
      { label: "5 sec", value: Math.round(powerMax * 0.94) },
      { label: "30 sec", value: Math.round(powerMax * 0.65) },
      { label: "1 min", value: Math.round(powerMax * 0.47) },
      { label: "5 min", value: Math.round(powerMax * 0.34) },
      { label: "30 min", value: Math.round(powerMax * 0.22) },
      { label: "FTP", value: ftp }
    ]
  };
}

function pickLatestRows(rows: AthleteMetricRow[]) {
  const latestByUser = new Map<string, AthleteMetricRow>();

  for (const row of rows) {
    const key = row.user_id;
    const current = latestByUser.get(key);

    if (!current) {
      latestByUser.set(key, row);
      continue;
    }

    const currentDate = current.creation_date ?? "";
    const nextDate = row.creation_date ?? "";

    if (nextDate > currentDate) {
      latestByUser.set(key, row);
      continue;
    }

    if (nextDate === currentDate && row.created_at > current.created_at) {
      latestByUser.set(key, row);
    }
  }

  return Array.from(latestByUser.values());
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return mockDashboardData;
  }

  const { data, error } = await supabase.from("athlete_data").select("*");

  if (error || !data?.length) {
    return mockDashboardData;
  }

  const athletes = pickLatestRows(data as AthleteMetricRow[])
    .map(toAthleteSummary)
    .sort((left, right) => right.recoveryScore - left.recoveryScore);

  if (!athletes.length) {
    return mockDashboardData;
  }

  const teamAverageRecovery = Math.round(athletes.reduce((sum, athlete) => sum + athlete.recoveryScore, 0) / athletes.length);
  const teamAverageSleep = Math.round(athletes.reduce((sum, athlete) => sum + athlete.sleepScore, 0) / athletes.length);
  const teamAverageHrv = Math.round(athletes.reduce((sum, athlete) => sum + athlete.hrv, 0) / athletes.length);

  return {
    athletes,
    teamAverageRecovery,
    teamAverageSleep,
    teamAverageHrv,
    attentionAthletes: athletes.filter((athlete) => athlete.recoveryScore < 60 || athlete.sleepScore < 65)
  };
}

export async function getAthleteById(id: string) {
  const dashboard = await getDashboardData();
  return dashboard.athletes.find((athlete) => athlete.id === id || athlete.userId === id) ?? null;
}

export async function getAthleteByUserId(userId: string) {
  const dashboard = await getDashboardData();
  return dashboard.athletes.find((athlete) => athlete.userId === userId) ?? mockAthletes[0];
}
