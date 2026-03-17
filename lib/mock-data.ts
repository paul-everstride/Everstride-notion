import { AthleteSummary, DashboardData, PolarizedZones, PowerCurvePoint, TrendPoint } from "@/lib/types";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const performanceLabels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"];

function buildTrend(labels: string[], values: number[]): TrendPoint[] {
  return labels.map((label, index) => ({
    label,
    value: values[index] ?? values[values.length - 1]
  }));
}

function buildPowerCurve(values: number[]): PowerCurvePoint[] {
  const labels = ["5 sec", "30 sec", "1 min", "5 min", "30 min", "FTP"];

  return labels.map((label, index) => ({
    label,
    value: values[index] ?? values[values.length - 1]
  }));
}

type MockAthleteSeed = {
  id: string;
  userId: string;
  name: string;
  email: string;
  team: string;
  age: number;
  weightKg: number;
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
  createdAt: string;
  statusNote: string;
  readinessTrend: number[];
  sleepTrend: number[];
  hrvTrend: number[];
  rhrTrend: number[];
  tssTrend: number[];
  sleepEfficiencyTrend: number[];
  atlTrend: number[];
  ctlTrend: number[];
  tsbTrend: number[];
  powerTrend: number[];
  ftpTrend: number[];
  vo2MaxTrend: number[];
  powerCurve: number[];
};

function buildAthlete(seed: MockAthleteSeed): AthleteSummary {
  return {
    id: seed.id,
    userId: seed.userId,
    name: seed.name,
    email: seed.email,
    age: seed.age,
    weightKg: seed.weightKg,
    team: seed.team,
    recoveryScore: seed.recoveryScore,
    sleepScore: seed.sleepScore,
    restHr: seed.restHr,
    hrv: seed.hrv,
    tss: seed.tss,
    atl: seed.atl,
    ctl: seed.ctl,
    tsb: seed.tsb,
    vo2Max: seed.vo2Max,
    ftp: seed.ftp,
    powerMax: seed.powerMax,
    polarizedZones: seed.polarizedZones,
    spo2: seed.spo2,
    sleepConsistency: seed.sleepConsistency,
    sleepEfficiency: seed.sleepEfficiency,
    respirationRate: seed.respirationRate,
    skinTemp: seed.skinTemp,
    totalBedMs: seed.totalBedMs,
    totalRemMs: seed.totalRemMs,
    totalSlowWaveMs: seed.totalSlowWaveMs,
    totalLightMs: seed.totalLightMs,
    totalAwakeMs: seed.totalAwakeMs,
    creationDate: "2026-03-11",
    createdAt: seed.createdAt,
    statusNote: seed.statusNote,
    readinessTrend: buildTrend(dayLabels, seed.readinessTrend),
    sleepTrend: buildTrend(dayLabels, seed.sleepTrend),
    hrvTrend: buildTrend(dayLabels, seed.hrvTrend),
    rhrTrend: buildTrend(dayLabels, seed.rhrTrend),
    tssTrend: buildTrend(dayLabels, seed.tssTrend),
    sleepEfficiencyTrend: buildTrend(dayLabels, seed.sleepEfficiencyTrend),
    atlTrend: buildTrend(dayLabels, seed.atlTrend),
    ctlTrend: buildTrend(dayLabels, seed.ctlTrend),
    tsbTrend: buildTrend(dayLabels, seed.tsbTrend),
    powerTrend: buildTrend(performanceLabels, seed.powerTrend),
    ftpTrend: buildTrend(performanceLabels, seed.ftpTrend),
    vo2MaxTrend: buildTrend(performanceLabels, seed.vo2MaxTrend),
    powerCurve: buildPowerCurve(seed.powerCurve)
  };
}

export const mockAthletes: AthleteSummary[] = [
  buildAthlete({
    id: "ath-1",
    userId: "user-1",
    name: "Maya Chen",
    email: "maya.chen@everstride.ai",
    team: "Velocity Collective",
    age: 27,
    weightKg: 58,
    recoveryScore: 82,
    sleepScore: 88,
    restHr: 49,
    hrv: 78,
    tss: 92,
    atl: 83,
    ctl: 95,
    tsb: 12,
    vo2Max: 63,
    ftp: 286,
    powerMax: 1120,
    polarizedZones: { low: 74, moderate: 17, high: 9 },
    spo2: 98,
    sleepConsistency: 91,
    sleepEfficiency: 93,
    respirationRate: 14.8,
    skinTemp: 0.1,
    totalBedMs: 29280000,
    totalRemMs: 5760000,
    totalSlowWaveMs: 5040000,
    totalLightMs: 12600000,
    totalAwakeMs: 840000,
    createdAt: "2026-03-11T06:14:00.000Z",
    statusNote: "Travel absorbed well. Green for intensity.",
    readinessTrend: [76, 79, 77, 80, 84, 81, 82],
    sleepTrend: [84, 86, 82, 87, 90, 89, 88],
    hrvTrend: [71, 74, 70, 73, 79, 77, 78],
    rhrTrend: [51, 50, 50, 49, 48, 49, 49],
    tssTrend: [84, 88, 90, 87, 95, 91, 92],
    sleepEfficiencyTrend: [90, 92, 90, 91, 94, 93, 93],
    atlTrend: [79, 80, 81, 81, 84, 82, 83],
    ctlTrend: [92, 93, 94, 95, 95, 96, 95],
    tsbTrend: [8, 9, 10, 11, 12, 11, 12],
    powerTrend: [1090, 1104, 1097, 1115, 1128, 1120],
    ftpTrend: [279, 281, 282, 284, 285, 286],
    vo2MaxTrend: [61, 61, 62, 62, 63, 63],
    powerCurve: [1098, 760, 546, 391, 262, 286]
  }),
  buildAthlete({
    id: "ath-2",
    userId: "user-2",
    name: "Jonah Alvarez",
    email: "jonah.alvarez@everstride.ai",
    team: "Northline Squad",
    age: 30,
    weightKg: 71,
    recoveryScore: 58,
    sleepScore: 69,
    restHr: 56,
    hrv: 51,
    tss: 78,
    atl: 89,
    ctl: 86,
    tsb: -3,
    vo2Max: 58,
    ftp: 318,
    powerMax: 1260,
    polarizedZones: { low: 64, moderate: 21, high: 15 },
    spo2: 97,
    sleepConsistency: 76,
    sleepEfficiency: 81,
    respirationRate: 16.1,
    skinTemp: 0.3,
    totalBedMs: 26940000,
    totalRemMs: 4740000,
    totalSlowWaveMs: 4020000,
    totalLightMs: 11760000,
    totalAwakeMs: 1800000,
    createdAt: "2026-03-11T05:58:00.000Z",
    statusNote: "Moderate strain yesterday. Keep work sub-threshold.",
    readinessTrend: [67, 64, 61, 60, 57, 55, 58],
    sleepTrend: [73, 71, 68, 70, 66, 67, 69],
    hrvTrend: [58, 56, 54, 52, 49, 50, 51],
    rhrTrend: [54, 55, 55, 56, 57, 56, 56],
    tssTrend: [70, 72, 75, 79, 82, 80, 78],
    sleepEfficiencyTrend: [84, 83, 81, 82, 79, 80, 81],
    atlTrend: [84, 86, 87, 88, 90, 89, 89],
    ctlTrend: [82, 83, 84, 85, 86, 86, 86],
    tsbTrend: [-2, -3, -3, -3, -4, -3, -3],
    powerTrend: [1220, 1235, 1240, 1248, 1255, 1260],
    ftpTrend: [311, 313, 314, 316, 317, 318],
    vo2MaxTrend: [56, 57, 57, 58, 58, 58],
    powerCurve: [1240, 842, 603, 430, 290, 318]
  }),
  buildAthlete({
    id: "ath-3",
    userId: "user-3",
    name: "Elena Petrova",
    email: "elena.petrova@everstride.ai",
    team: "Summit Project",
    age: 25,
    weightKg: 55,
    recoveryScore: 34,
    sleepScore: 52,
    restHr: 61,
    hrv: 39,
    tss: 104,
    atl: 96,
    ctl: 79,
    tsb: -17,
    vo2Max: 57,
    ftp: 271,
    powerMax: 1032,
    polarizedZones: { low: 57, moderate: 26, high: 17 },
    spo2: 96,
    sleepConsistency: 63,
    sleepEfficiency: 72,
    respirationRate: 17.5,
    skinTemp: 0.7,
    totalBedMs: 23880000,
    totalRemMs: 3780000,
    totalSlowWaveMs: 3120000,
    totalLightMs: 10080000,
    totalAwakeMs: 2940000,
    createdAt: "2026-03-11T06:26:00.000Z",
    statusNote: "Red flag. Pull volume and follow up on illness markers.",
    readinessTrend: [48, 44, 42, 39, 37, 32, 34],
    sleepTrend: [61, 58, 57, 55, 50, 51, 52],
    hrvTrend: [47, 46, 44, 42, 40, 38, 39],
    rhrTrend: [58, 59, 60, 60, 61, 61, 61],
    tssTrend: [92, 95, 98, 100, 103, 105, 104],
    sleepEfficiencyTrend: [77, 75, 74, 73, 71, 71, 72],
    atlTrend: [91, 92, 94, 95, 96, 97, 96],
    ctlTrend: [81, 81, 80, 80, 79, 79, 79],
    tsbTrend: [-10, -11, -14, -15, -17, -18, -17],
    powerTrend: [1008, 1014, 1020, 1024, 1028, 1032],
    ftpTrend: [267, 268, 269, 270, 270, 271],
    vo2MaxTrend: [58, 58, 57, 57, 57, 57],
    powerCurve: [1010, 704, 490, 352, 240, 271]
  }),
  buildAthlete({
    id: "ath-4",
    userId: "user-4",
    name: "Noah Brooks",
    email: "noah.brooks@everstride.ai",
    team: "Velocity Collective",
    age: 29,
    weightKg: 68,
    recoveryScore: 74,
    sleepScore: 79,
    restHr: 52,
    hrv: 66,
    tss: 86,
    atl: 80,
    ctl: 88,
    tsb: 8,
    vo2Max: 61,
    ftp: 332,
    powerMax: 1298,
    polarizedZones: { low: 71, moderate: 18, high: 11 },
    spo2: 98,
    sleepConsistency: 84,
    sleepEfficiency: 88,
    respirationRate: 15.2,
    skinTemp: -0.1,
    totalBedMs: 28020000,
    totalRemMs: 5280000,
    totalSlowWaveMs: 4560000,
    totalLightMs: 12000000,
    totalAwakeMs: 1320000,
    createdAt: "2026-03-11T05:41:00.000Z",
    statusNote: "Stable readiness. Ready for planned speed session.",
    readinessTrend: [69, 72, 73, 74, 76, 75, 74],
    sleepTrend: [76, 79, 81, 78, 80, 77, 79],
    hrvTrend: [61, 63, 64, 65, 68, 67, 66],
    rhrTrend: [53, 53, 52, 52, 51, 52, 52],
    tssTrend: [82, 80, 84, 85, 87, 88, 86],
    sleepEfficiencyTrend: [86, 87, 89, 88, 89, 88, 88],
    atlTrend: [76, 77, 78, 79, 80, 81, 80],
    ctlTrend: [86, 86, 87, 87, 88, 88, 88],
    tsbTrend: [10, 9, 9, 8, 8, 7, 8],
    powerTrend: [1268, 1274, 1281, 1288, 1294, 1298],
    ftpTrend: [326, 327, 329, 330, 331, 332],
    vo2MaxTrend: [60, 60, 60, 61, 61, 61],
    powerCurve: [1266, 858, 612, 448, 301, 332]
  })
];

export const mockDashboardData: DashboardData = {
  athletes: mockAthletes,
  teamAverageRecovery: 62,
  teamAverageSleep: 72,
  teamAverageHrv: 59,
  attentionAthletes: mockAthletes.filter((athlete) => athlete.recoveryScore < 60 || athlete.tsb < 0)
};
