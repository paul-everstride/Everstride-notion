/**
 * DEMO DATA LAYER — Mock data for marketing / screenshots.
 * No API calls, no Supabase, no OW backend needed.
 * Generates 365 days of history + full-year trends for all metrics.
 */

import type { AthleteSummary, DashboardData, RecoveryHistoryDay, TrendPoint } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DA = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dateStr(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function shortLabel(ds: string): string {
  const p = ds.split("-");
  return `${MN[parseInt(p[1]) - 1]} ${parseInt(p[2])}`;
}

function fullDayLabel(ds: string): string {
  const d = new Date(ds + "T12:00:00Z");
  return `${DA[d.getUTCDay()]}, ${MN[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Seeded pseudo-random for deterministic values */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const HISTORY_DAYS = 365;
const TREND_DAYS = 365;

/** Generate realistic trend with gradual drift and noise */
function genTrend(base: number, variance: number, days: number, seed: number): TrendPoint[] {
  const rng = seeded(seed);
  const pts: TrendPoint[] = [];
  let v = base;
  for (let i = days - 1; i >= 0; i--) {
    v += (rng() - 0.5) * variance;
    v = Math.max(base - variance * 3, Math.min(base + variance * 3, v));
    const ds = dateStr(i);
    pts.push({ label: shortLabel(ds), value: Math.round(v * 10) / 10, date: ds });
  }
  return pts;
}

/** Generate correlated recovery + HRV trends (HRV drives recovery) */
function genCorrelatedTrends(
  baseRec: number, baseHrv: number, recVariance: number, hrvVariance: number,
  days: number, seed: number
): { recTrend: TrendPoint[]; hrvTrend: TrendPoint[] } {
  const rng = seeded(seed);
  const recPts: TrendPoint[] = [];
  const hrvPts: TrendPoint[] = [];
  let hrv = baseHrv;

  for (let i = days - 1; i >= 0; i--) {
    // HRV drifts with random walk
    const hrvNoise = (rng() - 0.5) * hrvVariance;
    hrv += hrvNoise;
    hrv = Math.max(baseHrv - hrvVariance * 3, Math.min(baseHrv + hrvVariance * 3, hrv));

    // Recovery follows HRV: map HRV to recovery range, add small independent noise
    const hrvFraction = (hrv - (baseHrv - hrvVariance * 3)) / (hrvVariance * 6);
    const recFromHrv = 35 + hrvFraction * 55; // maps to ~35–90
    const recNoise = (rng() - 0.5) * recVariance * 0.4; // small independent noise
    const rec = Math.max(15, Math.min(96, recFromHrv + recNoise));

    const ds = dateStr(i);
    hrvPts.push({ label: shortLabel(ds), value: Math.round(hrv * 10) / 10, date: ds });
    recPts.push({ label: shortLabel(ds), value: Math.round(rec * 10) / 10, date: ds });
  }
  return { recTrend: recPts, hrvTrend: hrvPts };
}

/** Generate recovery history for N days */
function genHistory(
  baseRec: number, baseHrv: number, baseRhr: number, baseSpo2: number,
  baseResp: number, baseSkin: number, baseSleepEff: number,
  days: number, seed: number
): RecoveryHistoryDay[] {
  const rng = seeded(seed);
  const history: RecoveryHistoryDay[] = [];
  let rec = baseRec, hrv = baseHrv, rhr = baseRhr;

  for (let i = days - 1; i >= 0; i--) {
    // Add slight seasonal drift — better recovery in summer, worse in winter
    const dayOfYear = new Date(Date.now() - i * 86_400_000).getMonth();
    const seasonalBoost = Math.sin((dayOfYear / 12) * Math.PI * 2) * 3;

    // HRV drifts with random walk + seasonal influence
    hrv = Math.max(15, Math.min(130, hrv + (rng() - 0.5) * 7 + seasonalBoost * 0.1));
    // RHR inversely correlated: lower RHR = better condition
    rhr = Math.max(38, Math.min(72, rhr + (rng() - 0.5) * 2.5 - seasonalBoost * 0.05));

    // Recovery is DERIVED from HRV — correlated, not independent
    // Map current HRV to recovery: higher HRV → higher recovery
    const hrvFraction = (hrv - 15) / (130 - 15); // 0..1 across HRV range
    const recBase = 30 + hrvFraction * 55; // maps to ~30–85 range
    const recNoise = (rng() - 0.5) * 12; // day-to-day variation
    // Occasional bad days (roughly 1 in 15 days)
    const badDay = rng() < 0.07 ? -(15 + rng() * 15) : 0;
    rec = Math.max(12, Math.min(96, recBase + recNoise + badDay));
    const spo2 = Math.max(93, Math.min(100, baseSpo2 + (rng() - 0.5) * 2));
    const resp = Math.max(11, Math.min(20, baseResp + (rng() - 0.5) * 1.5));
    const skin = Math.round((baseSkin + (rng() - 0.5) * 0.6) * 10) / 10;
    const eff = Math.max(60, Math.min(98, baseSleepEff + (rng() - 0.5) * 10));
    const dur = Math.round(360 + rng() * 180);
    const durScore = Math.min(100, Math.round((dur / 480) * 100));
    const deepPct = 0.12 + rng() * 0.1;
    const remPct = 0.18 + rng() * 0.08;
    const awakePct = 0.03 + rng() * 0.05;
    const lightPct = 1 - deepPct - remPct - awakePct;
    const ds = dateStr(i);

    history.push({
      date: ds,
      label: fullDayLabel(ds),
      shortLabel: shortLabel(ds),
      recoveryScore: Math.round(rec),
      hrv: Math.round(hrv),
      restHr: Math.round(rhr),
      spo2: Math.round(spo2 * 10) / 10,
      skinTempC: skin,
      resp: Math.round(resp * 10) / 10,
      sleepScore: Math.round((eff + durScore) / 2),
      sleepEfficiency: Math.round(eff),
      sleepDurationMins: dur,
      sleepDeepMins: Math.round(dur * deepPct),
      sleepRemMins: Math.round(dur * remPct),
      sleepLightMins: Math.round(dur * lightPct),
      sleepAwakeMins: Math.round(dur * awakePct),
    });
  }
  return history;
}

function statusNote(rec: number | null): string {
  if (rec == null) return "No recovery data yet.";
  if (rec >= 67) return "Good recovery. Ready for training.";
  if (rec >= 34) return "Moderate recovery. Manageable load today.";
  return "Low recovery. Reduce training load.";
}

// ─── Mock athlete builder ─────────────────────────────────────────────────────

function mockAthlete(cfg: {
  id: string; name: string; email: string; team: string;
  age: number; weightKg: number; heightCm: number;
  recovery: number; sleep: number; sleepEff: number; hrv: number; rhr: number;
  spo2: number; resp: number; skinTemp: number;
  ftp: number; vo2Max: number; powerMax: number;
  tss: number; atl: number; ctl: number; tsb: number;
  powerCurve5s: number; powerCurve30s: number; powerCurve1m: number;
  powerCurve5m: number; powerCurve30m: number;
  polarizedLow: number; polarizedMod: number; polarizedHigh: number;
  seed: number;
}): AthleteSummary {
  const today = dateStr(0);
  const history = genHistory(cfg.recovery, cfg.hrv, cfg.rhr, cfg.spo2, cfg.resp, cfg.skinTemp, cfg.sleepEff, HISTORY_DAYS, cfg.seed);
  const todayEntry = history[history.length - 1];

  const totalMins = todayEntry.sleepDurationMins ?? 450;
  const deepMins = todayEntry.sleepDeepMins ?? 54;
  const remMins = todayEntry.sleepRemMins ?? 90;
  const lightMins = todayEntry.sleepLightMins ?? 280;
  const awakeMins = todayEntry.sleepAwakeMins ?? 18;

  return {
    id: cfg.id,
    userId: cfg.id,
    name: cfg.name,
    email: cfg.email,
    avatarUrl: null,
    age: cfg.age,
    weightKg: cfg.weightKg,
    heightCm: cfg.heightCm,
    team: cfg.team,
    recoveryScore: todayEntry.recoveryScore,
    sleepScore: todayEntry.sleepScore,
    restHr: todayEntry.restHr,
    hrv: todayEntry.hrv,
    tss: cfg.tss,
    atl: cfg.atl,
    ctl: cfg.ctl,
    tsb: cfg.tsb,
    vo2Max: cfg.vo2Max,
    ftp: cfg.ftp,
    powerMax: cfg.powerMax,
    polarizedZones: { low: cfg.polarizedLow, moderate: cfg.polarizedMod, high: cfg.polarizedHigh },
    spo2: cfg.spo2,
    sleepConsistency: Math.round(cfg.sleep * 0.95),
    sleepEfficiency: cfg.sleepEff,
    respirationRate: cfg.resp,
    skinTemp: cfg.skinTemp,
    totalBedMs: (totalMins + 15) * 60_000,
    totalRemMs: remMins * 60_000,
    totalSlowWaveMs: deepMins * 60_000,
    totalLightMs: lightMins * 60_000,
    totalAwakeMs: awakeMins * 60_000,
    creationDate: today,
    createdAt: dateStr(HISTORY_DAYS) + "T00:00:00.000Z",
    statusNote: statusNote(todayEntry.recoveryScore),
    ...(() => {
      const { recTrend, hrvTrend } = genCorrelatedTrends(cfg.recovery, cfg.hrv, 8, 10, TREND_DAYS, cfg.seed + 1);
      return { readinessTrend: recTrend, hrvTrend };
    })(),
    sleepTrend:           genTrend(cfg.sleep, 6, TREND_DAYS, cfg.seed + 2),
    rhrTrend:             genTrend(cfg.rhr, 3, TREND_DAYS, cfg.seed + 4),
    tssTrend:             genTrend(cfg.tss, 40, TREND_DAYS, cfg.seed + 6),
    sleepEfficiencyTrend: genTrend(cfg.sleepEff, 5, TREND_DAYS, cfg.seed + 5),
    atlTrend:             genTrend(cfg.atl, 12, TREND_DAYS, cfg.seed + 7),
    ctlTrend:             genTrend(cfg.ctl, 6, TREND_DAYS, cfg.seed + 8),
    tsbTrend:             genTrend(cfg.tsb, 8, TREND_DAYS, cfg.seed + 9),
    powerTrend:           genTrend(cfg.powerMax, 30, TREND_DAYS, cfg.seed + 10),
    ftpTrend:             genTrend(cfg.ftp, 8, TREND_DAYS, cfg.seed + 11),
    vo2MaxTrend:          genTrend(cfg.vo2Max, 2, TREND_DAYS, cfg.seed + 12),
    powerCurve: [
      { label: "5 sec", value: cfg.powerCurve5s },
      { label: "30 sec", value: cfg.powerCurve30s },
      { label: "1 min", value: cfg.powerCurve1m },
      { label: "5 min", value: cfg.powerCurve5m },
      { label: "30 min", value: cfg.powerCurve30m },
    ],
    recoveryHistory: history,
  };
}

// ─── The 6 demo athletes ──────────────────────────────────────────────────────

const ATHLETE_CONFIGS = [
  {
    id: "demo-1", name: "Lena Berger", email: "lena.berger@mail.com", team: "Endurance Squad",
    age: 27, weightKg: 58, heightCm: 170,
    recovery: 82, sleep: 88, sleepEff: 91, hrv: 78, rhr: 48, spo2: 97.8, resp: 14.2, skinTemp: 0.1,
    ftp: 245, vo2Max: 58, powerMax: 680, tss: 320, atl: 85, ctl: 72, tsb: -13,
    powerCurve5s: 680, powerCurve30s: 480, powerCurve1m: 340, powerCurve5m: 290, powerCurve30m: 260,
    polarizedLow: 78, polarizedMod: 5, polarizedHigh: 17,
    seed: 1001,
  },
  {
    id: "demo-2", name: "Marco Silva", email: "marco.silva@mail.com", team: "Endurance Squad",
    age: 31, weightKg: 74, heightCm: 182,
    recovery: 45, sleep: 62, sleepEff: 72, hrv: 35, rhr: 58, spo2: 96.1, resp: 16.8, skinTemp: 0.4,
    ftp: 275, vo2Max: 60, powerMax: 1120, tss: 480, atl: 135, ctl: 95, tsb: -40,
    powerCurve5s: 1120, powerCurve30s: 820, powerCurve1m: 510, powerCurve5m: 330, powerCurve30m: 285,
    polarizedLow: 55, polarizedMod: 25, polarizedHigh: 20,
    seed: 2002,
  },
  {
    id: "demo-3", name: "Sophie Chen", email: "sophie.chen@mail.com", team: "Sprint Group",
    age: 24, weightKg: 52, heightCm: 164,
    recovery: 91, sleep: 95, sleepEff: 94, hrv: 105, rhr: 42, spo2: 98.2, resp: 13.1, skinTemp: -0.1,
    ftp: 215, vo2Max: 56, powerMax: 490, tss: 180, atl: 55, ctl: 60, tsb: 5,
    powerCurve5s: 490, powerCurve30s: 370, powerCurve1m: 310, powerCurve5m: 280, powerCurve30m: 235,
    polarizedLow: 82, polarizedMod: 4, polarizedHigh: 14,
    seed: 3003,
  },
  {
    id: "demo-4", name: "Jonas Keller", email: "jonas.keller@mail.com", team: "Endurance Squad",
    age: 29, weightKg: 71, heightCm: 178,
    recovery: 68, sleep: 74, sleepEff: 80, hrv: 62, rhr: 52, spo2: 97.4, resp: 15.0, skinTemp: 0.2,
    ftp: 270, vo2Max: 57, powerMax: 820, tss: 350, atl: 90, ctl: 78, tsb: -12,
    powerCurve5s: 820, powerCurve30s: 620, powerCurve1m: 460, powerCurve5m: 340, powerCurve30m: 290,
    polarizedLow: 72, polarizedMod: 10, polarizedHigh: 18,
    seed: 4004,
  },
  {
    id: "demo-5", name: "Emma Larsson", email: "emma.larsson@mail.com", team: "Sprint Group",
    age: 22, weightKg: 55, heightCm: 168,
    recovery: 33, sleep: 51, sleepEff: 65, hrv: 28, rhr: 64, spo2: 95.3, resp: 17.5, skinTemp: 0.6,
    ftp: 185, vo2Max: 47, powerMax: 920, tss: 420, atl: 120, ctl: 70, tsb: -50,
    powerCurve5s: 920, powerCurve30s: 710, powerCurve1m: 420, powerCurve5m: 240, powerCurve30m: 190,
    polarizedLow: 50, polarizedMod: 30, polarizedHigh: 20,
    seed: 5005,
  },
  {
    id: "demo-6", name: "Tom Hartmann", email: "tom.hartmann@mail.com", team: "Sprint Group",
    age: 26, weightKg: 68, heightCm: 175,
    recovery: 75, sleep: 82, sleepEff: 85, hrv: 71, rhr: 50, spo2: 97.6, resp: 14.8, skinTemp: 0.0,
    ftp: 260, vo2Max: 54, powerMax: 640, tss: 280, atl: 75, ctl: 68, tsb: -7,
    powerCurve5s: 640, powerCurve30s: 510, powerCurve1m: 410, powerCurve5m: 330, powerCurve30m: 280,
    polarizedLow: 76, polarizedMod: 7, polarizedHigh: 17,
    seed: 6006,
  },
] as const;

// ─── Dynamic data generation (regenerates on each request so dates stay current) ──

let _cachedDate: string | null = null;
let _cachedAthletes: AthleteSummary[] | null = null;
let _cachedDashboard: DashboardData | null = null;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAthletes(): AthleteSummary[] {
  const today = todayStr();
  if (_cachedDate === today && _cachedAthletes) return _cachedAthletes;
  _cachedAthletes = ATHLETE_CONFIGS.map(cfg => mockAthlete(cfg));
  _cachedDate = today;
  _cachedDashboard = null; // invalidate dashboard cache too
  return _cachedAthletes;
}

function getDashboard(): DashboardData {
  const athletes = getAthletes();
  const today = todayStr();
  if (_cachedDate === today && _cachedDashboard) return _cachedDashboard;

  const withRec = athletes.filter(a => a.recoveryScore != null);
  const withSlp = athletes.filter(a => a.sleepScore != null);
  const withHrv = athletes.filter(a => a.hrv != null);

  _cachedDashboard = {
    athletes,
    teamAverageRecovery: Math.round(withRec.reduce((s, a) => s + (a.recoveryScore ?? 0), 0) / withRec.length),
    teamAverageSleep: Math.round(withSlp.reduce((s, a) => s + (a.sleepScore ?? 0), 0) / withSlp.length),
    teamAverageHrv: Math.round(withHrv.reduce((s, a) => s + (a.hrv ?? 0), 0) / withHrv.length),
    attentionAthletes: athletes.filter(
      a => (a.recoveryScore != null && a.recoveryScore < 60) || (a.sleepScore != null && a.sleepScore < 65)
    ),
  };
  return _cachedDashboard;
}

// ─── Public API (same signatures as production) ───────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  return getDashboard();
}

export async function getAthleteById(id: string): Promise<AthleteSummary | null> {
  return getAthletes().find(a => a.id === id || a.userId === id) ?? null;
}

export async function getAthleteByUserId(userId: string): Promise<AthleteSummary | null> {
  return getAthletes().find(a => a.userId === userId) ?? null;
}
