/**
 * DEMO DATA LAYER — Mock data for marketing / screenshots.
 * No API calls, no Supabase, no OW backend needed.
 * Generates 365 days of history + full-year trends for all metrics.
 *
 * Data generation mimics real WHOOP patterns:
 * - HRV and Recovery are strongly correlated (same shape)
 * - Day-to-day values are noisy/spiky, NOT smooth random walks
 * - Each athlete has a distinct profile (elite → struggling)
 * - Occasional bad days (dips) and rare peak days
 * - RHR inversely correlates with HRV/Recovery
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

/** Box-Muller: generate a normally-distributed random number (mean 0, stddev 1) */
function gaussianPair(rng: () => number): [number, number] {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const mag = Math.sqrt(-2 * Math.log(u1));
  return [mag * Math.cos(2 * Math.PI * u2), mag * Math.sin(2 * Math.PI * u2)];
}

const HISTORY_DAYS = 365;
const TREND_DAYS = 365;

// ─── Athlete profile type ─────────────────────────────────────────────────────

type AthleteProfile = {
  // HRV distribution
  hrvMean: number;      // typical HRV in ms (e.g. 75 for good athlete)
  hrvStdDev: number;    // day-to-day spread (e.g. 15 = ±15ms typical)
  hrvMin: number;       // floor
  hrvMax: number;       // ceiling

  // Recovery mapping (derived from HRV each day)
  recNoise: number;     // extra recovery noise on top of HRV correlation (stddev)

  // Bad days: chance of a significant dip (both HRV and recovery tank)
  badDayChance: number; // e.g. 0.04 = ~4% of days = ~15/year
  badDayDrop: number;   // how much HRV drops on bad days (subtracted)

  // Peak days: chance of an exceptional recovery (95-100)
  peakChance: number;   // e.g. 0.015 = ~5 days/year

  // RHR
  rhrMean: number;
  rhrStdDev: number;

  // Sleep
  sleepMean: number;
  sleepStdDev: number;
  sleepEffMean: number;
  sleepEffStdDev: number;

  // Other vitals
  spo2Mean: number;
  respMean: number;
  skinTempMean: number;
};

// ─── Core data generation (spiky, WHOOP-like) ─────────────────────────────────

/**
 * Generate recovery history for N days.
 * HRV is drawn fresh each day (spiky), recovery is derived from HRV.
 * This matches real WHOOP patterns where graphs look very noisy day-to-day.
 */
function genHistory(
  profile: AthleteProfile,
  days: number,
  seed: number
): RecoveryHistoryDay[] {
  const rng = seeded(seed);
  const history: RecoveryHistoryDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    // Generate two gaussian pairs (4 random normals) for this day
    const [g1, g2] = gaussianPair(rng);
    const [g3, g4] = gaussianPair(rng);

    // ── HRV: drawn independently each day (spiky, not a random walk) ──
    let hrv = profile.hrvMean + g1 * profile.hrvStdDev;

    // Bad day check (both HRV and recovery tank together)
    const isBadDay = rng() < profile.badDayChance;
    if (isBadDay) {
      hrv -= profile.badDayDrop + rng() * profile.badDayDrop * 0.5;
    }

    // Peak day check (only for athletes with peakChance > 0)
    const isPeakDay = !isBadDay && rng() < profile.peakChance;
    if (isPeakDay) {
      hrv = profile.hrvMean + profile.hrvStdDev * (1.5 + rng() * 1.0);
    }

    hrv = Math.max(profile.hrvMin, Math.min(profile.hrvMax, Math.round(hrv)));

    // ── Recovery: directly derived from HRV (no independent noise) ──
    // This ensures the recovery and HRV graphs look identical in shape.
    const hrvNorm = (hrv - profile.hrvMin) / (profile.hrvMax - profile.hrvMin); // 0..1
    let rec = 65 + hrvNorm * 27; // base mapping: 65..92

    rec = Math.max(1, Math.min(100, Math.round(rec)));

    // ── RHR: inversely correlated with HRV (high HRV = low RHR) ──
    const rhrFromHrv = profile.rhrMean - (hrv - profile.hrvMean) * 0.15;
    const rhr = Math.max(36, Math.min(75, Math.round(rhrFromHrv + g3 * profile.rhrStdDev)));

    // ── Sleep metrics ──
    const sleepEff = Math.max(55, Math.min(99, Math.round(profile.sleepEffMean + g4 * profile.sleepEffStdDev)));
    const [g5, g6] = gaussianPair(rng);
    const dur = Math.max(300, Math.min(600, Math.round(profile.sleepMean * 60 + g5 * 45)));
    const durScore = Math.min(100, Math.round((dur / 480) * 100));
    const sleepScore = Math.round((sleepEff + durScore) / 2);

    // ── Other vitals ──
    const spo2 = Math.max(93, Math.min(100, Math.round((profile.spo2Mean + g6 * 0.8) * 10) / 10));
    const [g7, g8] = gaussianPair(rng);
    const resp = Math.max(11, Math.min(20, Math.round((profile.respMean + g7 * 0.8) * 10) / 10));
    const skin = Math.round((profile.skinTempMean + g8 * 0.3) * 10) / 10;

    // ── Sleep stages ──
    const deepPct = Math.max(0.08, Math.min(0.25, 0.16 + rng() * 0.08 - 0.04));
    const remPct = Math.max(0.15, Math.min(0.30, 0.22 + rng() * 0.06 - 0.03));
    const awakePct = Math.max(0.01, Math.min(0.08, 0.04 + rng() * 0.04 - 0.02));
    const lightPct = 1 - deepPct - remPct - awakePct;

    const ds = dateStr(i);
    history.push({
      date: ds,
      label: fullDayLabel(ds),
      shortLabel: shortLabel(ds),
      recoveryScore: rec,
      hrv,
      restHr: rhr,
      spo2,
      skinTempC: skin,
      resp,
      sleepScore,
      sleepEfficiency: sleepEff,
      sleepDurationMins: dur,
      sleepDeepMins: Math.round(dur * deepPct),
      sleepRemMins: Math.round(dur * remPct),
      sleepLightMins: Math.round(dur * lightPct),
      sleepAwakeMins: Math.round(dur * awakePct),
    });
  }
  return history;
}

/** Generate a slow-drifting trend (for metrics like FTP, VO2max that change gradually) */
function genDriftTrend(base: number, variance: number, days: number, seed: number): TrendPoint[] {
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

function statusNote(rec: number | null): string {
  if (rec == null) return "No recovery data yet.";
  if (rec >= 67) return "Good recovery. Ready for training.";
  if (rec >= 34) return "Moderate recovery. Manageable load today.";
  return "Low recovery. Reduce training load.";
}

// ─── Athlete profiles ────────────────────────────────────────────────────────
// Each profile defines how that athlete's data looks across the year.
// Think of it as their "physiology" — some athletes recover better than others.

const PROFILES: Record<string, AthleteProfile> = {
  // Sophie Chen — ELITE. The best on the team. High HRV, high recovery.
  // Hits 100% recovery 4-5 times/year. Rarely has bad days.
  elite: {
    hrvMean: 85, hrvStdDev: 18, hrvMin: 30, hrvMax: 135,
    recNoise: 4, badDayChance: 0.02, badDayDrop: 30, peakChance: 0.014,
    rhrMean: 44, rhrStdDev: 3,
    sleepMean: 7.8, sleepStdDev: 0.6, sleepEffMean: 92, sleepEffStdDev: 4,
    spo2Mean: 98.0, respMean: 13.5, skinTempMean: -0.1,
  },

  // Lena Berger — VERY GOOD. Solid recovery, mostly green. Occasionally hits 95+.
  veryGood: {
    hrvMean: 68, hrvStdDev: 16, hrvMin: 20, hrvMax: 120,
    recNoise: 5, badDayChance: 0.035, badDayDrop: 25, peakChance: 0.008,
    rhrMean: 48, rhrStdDev: 3,
    sleepMean: 7.5, sleepStdDev: 0.7, sleepEffMean: 89, sleepEffStdDev: 5,
    spo2Mean: 97.8, respMean: 14.2, skinTempMean: 0.1,
  },

  // Tom Hartmann — GOOD. Above average, decent consistency.
  good: {
    hrvMean: 60, hrvStdDev: 15, hrvMin: 18, hrvMax: 110,
    recNoise: 5, badDayChance: 0.04, badDayDrop: 22, peakChance: 0.005,
    rhrMean: 50, rhrStdDev: 3.5,
    sleepMean: 7.3, sleepStdDev: 0.8, sleepEffMean: 85, sleepEffStdDev: 5,
    spo2Mean: 97.6, respMean: 14.8, skinTempMean: 0.0,
  },

  // Jonas Keller — AVERAGE. Solid but inconsistent. More yellow days than green.
  average: {
    hrvMean: 52, hrvStdDev: 14, hrvMin: 15, hrvMax: 100,
    recNoise: 6, badDayChance: 0.05, badDayDrop: 20, peakChance: 0.003,
    rhrMean: 53, rhrStdDev: 4,
    sleepMean: 7.0, sleepStdDev: 0.9, sleepEffMean: 80, sleepEffStdDev: 6,
    spo2Mean: 97.4, respMean: 15.0, skinTempMean: 0.2,
  },

  // Marco Silva — BELOW AVERAGE / OVERTRAINED. Pushing too hard, low recovery.
  belowAvg: {
    hrvMean: 42, hrvStdDev: 12, hrvMin: 12, hrvMax: 85,
    recNoise: 6, badDayChance: 0.07, badDayDrop: 18, peakChance: 0.001,
    rhrMean: 58, rhrStdDev: 4,
    sleepMean: 6.5, sleepStdDev: 1.0, sleepEffMean: 73, sleepEffStdDev: 7,
    spo2Mean: 96.1, respMean: 16.5, skinTempMean: 0.4,
  },

  // Emma Larsson — STRUGGLING. Poor sleep, low HRV, frequently in the red.
  struggling: {
    hrvMean: 35, hrvStdDev: 10, hrvMin: 10, hrvMax: 75,
    recNoise: 5, badDayChance: 0.08, badDayDrop: 15, peakChance: 0.0,
    rhrMean: 63, rhrStdDev: 4,
    sleepMean: 6.0, sleepStdDev: 1.0, sleepEffMean: 66, sleepEffStdDev: 8,
    spo2Mean: 95.5, respMean: 17.2, skinTempMean: 0.6,
  },
};

// ─── Mock athlete builder ─────────────────────────────────────────────────────

function mockAthlete(cfg: {
  id: string; name: string; email: string; team: string;
  age: number; weightKg: number; heightCm: number;
  profile: AthleteProfile;
  ftp: number; vo2Max: number; powerMax: number;
  tss: number; atl: number; ctl: number; tsb: number;
  powerCurve5s: number; powerCurve30s: number; powerCurve1m: number;
  powerCurve5m: number; powerCurve30m: number;
  polarizedLow: number; polarizedMod: number; polarizedHigh: number;
  seed: number;
}): AthleteSummary {
  const today = dateStr(0);
  const p = cfg.profile;
  const history = genHistory(p, HISTORY_DAYS, cfg.seed);
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
    team: _teamAssignments.get(cfg.id) ?? cfg.team,
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
    spo2: todayEntry.spo2 ?? 97,
    sleepConsistency: Math.round((todayEntry.sleepScore ?? 80) * 0.95),
    sleepEfficiency: todayEntry.sleepEfficiency ?? 85,
    respirationRate: todayEntry.resp ?? 14,
    skinTemp: todayEntry.skinTempC ?? 0,
    totalBedMs: (totalMins + 15) * 60_000,
    totalRemMs: remMins * 60_000,
    totalSlowWaveMs: deepMins * 60_000,
    totalLightMs: lightMins * 60_000,
    totalAwakeMs: awakeMins * 60_000,
    creationDate: today,
    createdAt: dateStr(HISTORY_DAYS) + "T00:00:00.000Z",
    statusNote: statusNote(todayEntry.recoveryScore),
    // All readiness trends are extracted directly from the history
    // so Recovery, HRV, RHR, sleep, etc. all come from the SAME generated days
    readinessTrend:       history.map(d => ({ label: d.shortLabel, value: d.recoveryScore ?? 0, date: d.date })),
    hrvTrend:             history.map(d => ({ label: d.shortLabel, value: d.hrv ?? 0, date: d.date })),
    rhrTrend:             history.map(d => ({ label: d.shortLabel, value: d.restHr ?? 0, date: d.date })),
    sleepTrend:           history.map(d => ({ label: d.shortLabel, value: d.sleepScore ?? 0, date: d.date })),
    sleepEfficiencyTrend: history.map(d => ({ label: d.shortLabel, value: d.sleepEfficiency ?? 0, date: d.date })),
    // Training load metrics: slow drift (these change gradually)
    tssTrend:             genDriftTrend(cfg.tss, 40, TREND_DAYS, cfg.seed + 6),
    atlTrend:             genDriftTrend(cfg.atl, 12, TREND_DAYS, cfg.seed + 7),
    ctlTrend:             genDriftTrend(cfg.ctl, 6, TREND_DAYS, cfg.seed + 8),
    tsbTrend:             genDriftTrend(cfg.tsb, 8, TREND_DAYS, cfg.seed + 9),
    // Performance: slow drift (FTP, power, VO2 change over weeks/months)
    powerTrend:           genDriftTrend(cfg.powerMax, 30, TREND_DAYS, cfg.seed + 10),
    ftpTrend:             genDriftTrend(cfg.ftp, 8, TREND_DAYS, cfg.seed + 11),
    vo2MaxTrend:          genDriftTrend(cfg.vo2Max, 2, TREND_DAYS, cfg.seed + 12),
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
    age: 27, weightKg: 58, heightCm: 170, profile: PROFILES.veryGood,
    ftp: 245, vo2Max: 58, powerMax: 680, tss: 320, atl: 85, ctl: 72, tsb: -13,
    powerCurve5s: 680, powerCurve30s: 480, powerCurve1m: 340, powerCurve5m: 290, powerCurve30m: 260,
    polarizedLow: 78, polarizedMod: 5, polarizedHigh: 17,
    seed: 1001,
  },
  {
    id: "demo-2", name: "Marco Silva", email: "marco.silva@mail.com", team: "Endurance Squad",
    age: 31, weightKg: 74, heightCm: 182, profile: PROFILES.belowAvg,
    ftp: 275, vo2Max: 60, powerMax: 1120, tss: 480, atl: 135, ctl: 95, tsb: -40,
    powerCurve5s: 1120, powerCurve30s: 820, powerCurve1m: 510, powerCurve5m: 330, powerCurve30m: 285,
    polarizedLow: 55, polarizedMod: 25, polarizedHigh: 20,
    seed: 2002,
  },
  {
    id: "demo-3", name: "Sophie Chen", email: "sophie.chen@mail.com", team: "Sprint Group",
    age: 24, weightKg: 52, heightCm: 164, profile: PROFILES.elite,
    ftp: 215, vo2Max: 56, powerMax: 490, tss: 180, atl: 55, ctl: 60, tsb: 5,
    powerCurve5s: 490, powerCurve30s: 370, powerCurve1m: 310, powerCurve5m: 280, powerCurve30m: 235,
    polarizedLow: 82, polarizedMod: 4, polarizedHigh: 14,
    seed: 3003,
  },
  {
    id: "demo-4", name: "Jonas Keller", email: "jonas.keller@mail.com", team: "Endurance Squad",
    age: 29, weightKg: 71, heightCm: 178, profile: PROFILES.average,
    ftp: 270, vo2Max: 57, powerMax: 820, tss: 350, atl: 90, ctl: 78, tsb: -12,
    powerCurve5s: 820, powerCurve30s: 620, powerCurve1m: 460, powerCurve5m: 340, powerCurve30m: 290,
    polarizedLow: 72, polarizedMod: 10, polarizedHigh: 18,
    seed: 4004,
  },
  {
    id: "demo-5", name: "Emma Larsson", email: "emma.larsson@mail.com", team: "Sprint Group",
    age: 22, weightKg: 55, heightCm: 168, profile: PROFILES.struggling,
    ftp: 185, vo2Max: 47, powerMax: 920, tss: 420, atl: 120, ctl: 70, tsb: -50,
    powerCurve5s: 920, powerCurve30s: 710, powerCurve1m: 420, powerCurve5m: 240, powerCurve30m: 190,
    polarizedLow: 50, polarizedMod: 30, polarizedHigh: 20,
    seed: 5005,
  },
  {
    id: "demo-6", name: "Tom Hartmann", email: "tom.hartmann@mail.com", team: "Sprint Group",
    age: 26, weightKg: 68, heightCm: 175, profile: PROFILES.good,
    ftp: 260, vo2Max: 54, powerMax: 640, tss: 280, atl: 75, ctl: 68, tsb: -7,
    powerCurve5s: 640, powerCurve30s: 510, powerCurve1m: 410, powerCurve5m: 330, powerCurve30m: 280,
    polarizedLow: 76, polarizedMod: 7, polarizedHigh: 17,
    seed: 6006,
  },
] as const;

// ─── In-memory team management (demo only) ──────────────────────────────────

const _defaultAssignments = new Map<string, string>(
  ATHLETE_CONFIGS.map(c => [c.id, c.team])
);
const _teamAssignments = new Map<string, string>(_defaultAssignments);
const _extraTeams = new Set<string>(); // teams created by user (may be empty)
let _lastTeamJson = "";

function _invalidateAthleteCache() {
  _cachedAthletes = null;
  _cachedDashboard = null;
}

/** Serialize current team state to a JSON string (for cookie storage) */
export function serializeTeamState(): string {
  return JSON.stringify({
    assignments: Object.fromEntries(_teamAssignments),
    extraTeams: [..._extraTeams],
  });
}

/** Restore team state from a JSON string (from cookie) */
export function loadTeamState(json: string | undefined) {
  if (!json || json === _lastTeamJson) return;
  try {
    const parsed = JSON.parse(json);
    if (parsed.assignments) {
      _teamAssignments.clear();
      for (const [k, v] of Object.entries(parsed.assignments)) {
        _teamAssignments.set(k, v as string);
      }
    }
    if (parsed.extraTeams) {
      _extraTeams.clear();
      for (const t of parsed.extraTeams) _extraTeams.add(t);
    }
    _invalidateAthleteCache();
    _lastTeamJson = json;
  } catch { /* ignore malformed cookie */ }
}

export function getDemoTeams(): { id: string; name: string }[] {
  const teamNames = new Set<string>([..._teamAssignments.values(), ..._extraTeams]);
  return [...teamNames].map(name => ({ id: `team-${name.toLowerCase().replace(/\s+/g, "-")}`, name }));
}

export function getDemoTeamAthletes(): Record<string, { ow_user_id: string; athlete_name: string; athlete_email: string; has_data: boolean }[]> {
  const athletes = getAthletes();
  const result: Record<string, { ow_user_id: string; athlete_name: string; athlete_email: string; has_data: boolean }[]> = {};
  for (const team of getDemoTeams()) {
    result[team.id] = athletes
      .filter(a => a.team === team.name)
      .map(a => ({ ow_user_id: a.id, athlete_name: a.name, athlete_email: a.email ?? "", has_data: true }));
  }
  return result;
}

export function demoMoveAthlete(athleteId: string, newTeamName: string) {
  _teamAssignments.set(athleteId, newTeamName);
  _invalidateAthleteCache();
}

export function demoRenameTeam(oldName: string, newName: string) {
  for (const [id, team] of _teamAssignments) {
    if (team === oldName) _teamAssignments.set(id, newName);
  }
  if (_extraTeams.has(oldName)) { _extraTeams.delete(oldName); _extraTeams.add(newName); }
  _invalidateAthleteCache();
}

export function demoCreateTeam(name: string): string {
  _extraTeams.add(name);
  return `team-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

export function demoDeleteTeam(name: string): boolean {
  // Only allow deleting empty teams
  const hasAthletes = [..._teamAssignments.values()].some(t => t === name);
  if (hasAthletes) return false;
  _extraTeams.delete(name);
  return true;
}

// ─── Dynamic data generation (regenerates on each request so dates stay current) ──

let _cachedDate: string | null = null;
let _cachedAthletes: AthleteSummary[] | null = null;
let _cachedDashboard: DashboardData | null = null;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAthletes(): AthleteSummary[] {
  const today = todayString();
  if (_cachedDate === today && _cachedAthletes) return _cachedAthletes;
  _cachedAthletes = ATHLETE_CONFIGS.map(cfg => mockAthlete(cfg));
  _cachedDate = today;
  _cachedDashboard = null;
  return _cachedAthletes;
}

function getDashboard(): DashboardData {
  const athletes = getAthletes();
  const today = todayString();
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

/** Demo mode flag — this data layer is always demo (no real OW/Supabase) */
export const IS_DEMO_DATA = true;

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
