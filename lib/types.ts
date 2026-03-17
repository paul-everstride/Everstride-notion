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

export type AthleteSummary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  age: number;
  weightKg: number;
  team: string;
  recoveryScore: number;
  sleepScore: number;
  restHr: number;
  hrv: number;
  tss: number;
  atl: number;
  ctl: number;
  tsb: number;
  vo2Max: number;
  ftp: number;
  powerMax: number;
  polarizedZones: PolarizedZones;
  spo2: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  respirationRate: number;
  skinTemp: number;
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
};

export type DashboardData = {
  athletes: AthleteSummary[];
  teamAverageRecovery: number;
  teamAverageSleep: number;
  teamAverageHrv: number;
  attentionAthletes: AthleteSummary[];
};
