export type AppRole = "coach" | "athlete";

export type TrendPoint = {
  label: string;
  value: number;
};

export type PolarizedZones = {
  low: number;
  moderate: number;
  high: number;
};

export type PowerCurvePoint = {
  label: string;
  value: number;
};

export type AthleteMetricRow = {
  id: string;
  created_at: string;
  user_id: string;
  Email: string | null;
  First_name: string | null;
  Last_name: string | null;
  recoveryscore: number | null;
  HRV: number | null;
  Sleep_score: number | null;
  rest_hr: number | null;
  SP02: number | null;
  total_bed_mil: number | null;
  total_rem_mil: number | null;
  total_slow_wave_mil: number | null;
  total_light_mil: number | null;
  total_awake_mil: number | null;
  creation_date: string | null;
  sleep_consistency: number | null;
  sleep_efficiency: number | null;
  Resp_rate: number | null;
  skin_temp: number | null;
};

/** One day of full recovery + sleep data sourced from the OW API. */
export type RecoveryHistoryDay = {
  date: string;             // YYYY-MM-DD
  label: string;            // "Thu, Nov 6"  (for table display)
  shortLabel: string;       // "Nov 6"       (for chart X-axis)
  // Recovery / biometrics (from timeseries)
  recoveryScore: number | null;
  hrv: number | null;       // HRV RMSSD in ms
  restHr: number | null;    // Resting HR in bpm
  spo2: number | null;      // SpO₂ in %
  skinTempC: number | null; // Raw skin temperature in °C
  resp: number | null;      // Respiratory rate in breaths/min
  // Sleep (from sleep summaries, matched by date)
  sleepScore: number | null;
  sleepEfficiency: number | null;  // %
  sleepDurationMins: number | null;
  sleepDeepMins: number | null;
  sleepRemMins: number | null;
  sleepLightMins: number | null;
  sleepAwakeMins: number | null;
};

export type AthleteSummary = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  team: string;
  recoveryScore: number | null;
  sleepScore: number | null;
  restHr: number | null;
  hrv: number | null;
  tss: number | null;
  atl: number | null;
  ctl: number | null;
  tsb: number | null;
  vo2Max: number | null;
  ftp: number | null;
  powerMax: number | null;
  polarizedZones: PolarizedZones;
  spo2: number | null;
  sleepConsistency: number | null;
  sleepEfficiency: number | null;
  respirationRate: number | null;
  skinTemp: number | null;
  totalBedMs: number;
  totalRemMs: number;
  totalSlowWaveMs: number;
  totalLightMs: number;
  totalAwakeMs: number;
  creationDate: string;
  createdAt: string;
  statusNote: string;
  readinessTrend: TrendPoint[];
  sleepTrend: TrendPoint[];
  hrvTrend: TrendPoint[];
  rhrTrend: TrendPoint[];
  tssTrend: TrendPoint[];
  sleepEfficiencyTrend: TrendPoint[];
  atlTrend: TrendPoint[];
  ctlTrend: TrendPoint[];
  tsbTrend: TrendPoint[];
  powerTrend: TrendPoint[];
  ftpTrend: TrendPoint[];
  vo2MaxTrend: TrendPoint[];
  powerCurve: PowerCurvePoint[];
  /** Full daily recovery history (all available data, oldest → newest). */
  recoveryHistory: RecoveryHistoryDay[];
  /** Activities/workouts (e.g. Strava), newest first. */
  workouts: Workout[];
  /** Derived activity summary for dashboard/detail. */
  lastActivityDate: string | null;   // YYYY-MM-DD of most recent workout
  activities7d: number;              // count in the last 7 days
  distance7dKm: number;              // total distance (km) in the last 7 days
  duration7dMin: number;             // total moving time (min) in the last 7 days
};

/** A single activity/workout surfaced from Open Wearables. */
export type Workout = {
  id: string;
  type: string;                 // "cycling", "running", …
  name: string | null;
  date: string;                 // YYYY-MM-DD (local start date)
  startTime: string;            // ISO datetime
  durationSec: number | null;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPaceSecPerKm: number | null;
  elevationGainM: number | null;
  calories: number | null;
  provider: string | null;      // "strava", …
};

export type DashboardData = {
  athletes: AthleteSummary[];
  teamAverageRecovery: number;
  teamAverageSleep: number;
  teamAverageHrv: number;
  attentionAthletes: AthleteSummary[];
};
