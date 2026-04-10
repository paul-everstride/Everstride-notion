"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { AthleteSummary, RecoveryHistoryDay, TrendPoint } from "@/lib/types";
import { PolarizedBar } from "@/components/polarized-bar";
import { cn, formatSignedNumber, formatWeight } from "@/lib/utils";
import { BarChart2, Table, Calendar } from "lucide-react";
import { ComparePhotoStrip } from "@/components/photo-accents";

const athleteColors = ["#e16b2b", "#3b82f6", "#059669", "#d97706", "#dc2626", "#8b5cf6"];

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS_TODAY    = ["04:00","07:00","10:00","13:00","16:00","19:00","22:00","NOW"];
const LABELS_BIWEEKLY = Array.from({ length: 14 }, (_, i) => `D${i + 1}`);
const LABELS_YEARLY   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES     = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_SHORT     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Page-based biweekly: 12 data points (6 months) per page
function getBiweeklyPageLabels(pageOffset: number): { labels: string[]; ranges: string[]; periodLabel: string; seedStr: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentHalf = now.getMonth() >= 6 ? 1 : 0; // 0=Jan–Jun, 1=Jul–Dec
  const targetHalfTotal = currentYear * 2 + currentHalf + pageOffset;
  const targetYear = Math.floor(targetHalfTotal / 2);
  const targetHalf = ((targetHalfTotal % 2) + 2) % 2;
  const startMonth = targetHalf === 0 ? 0 : 6;
  const months = MONTH_SHORT.slice(startMonth, startMonth + 6);
  const labels = months.flatMap(m => [`${m} 1`, `${m} 15`]);
  const ranges = months.flatMap((m, i) => {
    const mi = startMonth + i;
    const lastDay = new Date(targetYear, mi + 1, 0).getDate();
    return [`01 ${m} – 14 ${m}`, `15 ${m} – ${lastDay} ${m}`];
  });
  const periodLabel = `${MONTH_SHORT[startMonth]} – ${MONTH_SHORT[startMonth + 5]} ${targetYear}`;
  const seedStr = `bw-page-${targetYear}-h${targetHalf}`;
  return { labels, ranges, periodLabel, seedStr };
}

// Page-based monthly: 12 months per year
function getMonthlyPageLabels(yearOffset: number): { labels: string[]; periodLabel: string; seedStr: string } {
  const targetYear = new Date().getFullYear() + yearOffset;
  return { labels: MONTH_SHORT.slice(), periodLabel: String(targetYear), seedStr: `monthly-page-${targetYear}` };
}

// Labels for 5-year view
const LABELS_5YEAR = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 4 + i));

// ── Period helpers (timeframe mode) ──────────────────────────────────────────

type PeriodInfo = { label: string; dataLabels: string[]; seedStr: string };

function getPeriodInfo(type: "week" | "month" | "year", offset: number): PeriodInfo {
  const now = new Date();
  if (type === "week") {
    const dow = now.getDay();
    const mondayOff = dow === 0 ? 6 : dow - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOff + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`;
    return {
      label: `${fmt(monday)} – ${fmt(sunday)}`,
      dataLabels: ["MON","TUE","WED","THU","FRI","SAT","SUN"],
      seedStr: `week-${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`
    };
  }
  if (type === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return {
      label: `01 ${MONTH_NAMES[d.getMonth()]} – ${days} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      dataLabels: Array.from({ length: days }, (_, i) => (i + 1) % 5 === 1 ? String(i + 1) : ""),
      seedStr: `month-${d.getFullYear()}-${d.getMonth()}`
    };
  }
  const year = now.getFullYear() + offset;
  return {
    label: `${year}`,
    dataLabels: LABELS_YEARLY.slice(),
    seedStr: `year-${year}`
  };
}

function getPerfPeriodInfo(type: "biweekly" | "monthly" | "yearly", offset: number): PeriodInfo {
  if (type === "monthly") return getPeriodInfo("month", offset);
  if (type === "yearly")  return getPeriodInfo("year",  offset);
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + offset * 14);
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`;
  return {
    label: `${fmt(start)} – ${fmt(end)}`,
    dataLabels: LABELS_BIWEEKLY.slice(),
    seedStr: `bw-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
  };
}

// ── Snapshot helpers ──────────────────────────────────────────────────────────

type SnapshotPeriod = "2weeks" | "monthly" | "custom";

type SnapshotWindow = {
  label: string;          // e.g. "01 MAR – 14 MAR"
  startDayOffset: number; // days from today to first day (negative = past)
  days: number;           // total days in window
  aggregate?: "point" | "avg"; // default "point"
};

function getSnapshotWindow(
  period: SnapshotPeriod,
  periodOffset: number,
  customStart: number,
  customEnd: number
): SnapshotWindow {
  const now = new Date();
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`;

  if (period === "2weeks") {
    // period offset 0 = most recent 2 weeks ending today
    const endOffset   = periodOffset * 14;           // 0, -14, -28 …
    const startOffset = endOffset - 13;
    const startD = new Date(now); startD.setDate(now.getDate() + startOffset);
    const endD   = new Date(now); endD.setDate(now.getDate() + endOffset);
    return {
      label: `${fmtShort(startD)} – ${fmtShort(endD)}`,
      startDayOffset: startOffset,
      days: 14
    };
  }

  if (period === "monthly") {
    const d = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const msPerDay = 86400000;
    const startDayOffset = Math.round((d.getTime() - now.getTime()) / msPerDay);
    return {
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      startDayOffset,
      days: daysInMonth
    };
  }

  // custom
  const startD = new Date(now); startD.setDate(now.getDate() + customStart);
  const endD   = new Date(now); endD.setDate(now.getDate() + customEnd);
  return {
    label: `${fmt(startD)} – ${fmt(endD)}`,
    startDayOffset: customStart,
    days: Math.max(customEnd - customStart + 1, 1)
  };
}

/**
 * Look up actual history data for a snapshot window.
 * For metrics with a historyField, searches recoveryHistory by date.
 * For performance metrics without historyField, returns the base value.
 * aggregate "point" returns the max value; "avg" returns the mean (rounded to 1dp).
 */
function getHistorySnapshot(
  athlete: AthleteSummary,
  historyField: keyof RecoveryHistoryDay | undefined,
  baseValue: number | null,
  startDayOffset: number,
  days: number,
  aggregate: "point" | "avg" = "point"
): number | null {
  if (!historyField) return baseValue;
  const vals: number[] = [];
  for (let i = 0; i < Math.max(days, 1); i++) {
    const d = new Date();
    d.setDate(d.getDate() + startDayOffset + i);
    const dateStr = d.toISOString().slice(0, 10);
    const day = athlete.recoveryHistory.find(r => r.date === dateStr);
    if (!day) continue;
    const val = day[historyField];
    if (typeof val === "number" && !isNaN(val)) vals.push(val);
  }
  if (!vals.length) return null;
  if (aggregate === "avg") return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  return vals.reduce((best, v) => (v > best ? v : best), vals[0]);
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function chartDomain(data: Record<string, number | string>[], pct = false): [number, number] {
  const nums = data.flatMap(row =>
    Object.entries(row).filter(([k]) => k !== "label").map(([, v]) => Number(v)).filter(v => !isNaN(v))
  );
  if (!nums.length) return [0, pct ? 100 : 100];
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min;
  const pad = range < 1 ? Math.max(max * 0.2, 5) : range * 0.2;
  return [Math.max(0, Math.floor(min - pad)), pct ? 100 : Math.ceil(max + pad)];
}

function scalarDomain(values: number[], pct = false): [number, number] {
  if (!values.length) return [0, pct ? 100 : 100];
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min;
  const pad = range < 1 ? Math.max(max * 0.2, 5) : range * 0.2;
  return [Math.max(0, Math.floor(min - pad)), pct ? 100 : Math.ceil(max + pad)];
}

function tickFmt(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

const TS = { border: "1px solid #e9e9e7", background: "#ffffff", color: "#37352f", fontSize: 12, fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "6px 10px", borderRadius: "6px" };
const TL = { color: "#9b9a97", fontSize: 10 };

// ── Types ─────────────────────────────────────────────────────────────────────

type CompareMetric = {
  key: string;
  label: string;
  unit?: string;
  baseValue: (a: AthleteSummary) => number | null;
  getSeries: (a: AthleteSummary, timeframe: string) => TrendPoint[];
  renderCurrent: (a: AthleteSummary) => string;
  /** Field in RecoveryHistoryDay to use for snapshot date lookups. Undefined = use baseValue. */
  historyField?: keyof RecoveryHistoryDay;
  /** Fixed Y-axis domain for the snapshot bar chart. Falls back to auto-scale if omitted. */
  barDomain?: [number, number];
};

// ── Series factories ──────────────────────────────────────────────────────────

function readinessSeries(historyField: keyof RecoveryHistoryDay, trendKey: keyof AthleteSummary) {
  return (athlete: AthleteSummary, timeframe: string): TrendPoint[] => {
    const [type, p2] = timeframe.split(":");
    const offset = parseInt(p2 || "0");
    const now = new Date();

    if (type === "week") {
      const dow = now.getDay();
      const mondayOff = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOff + offset * 7);
      monday.setHours(0, 0, 0, 0);
      const points: TrendPoint[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const day = athlete.recoveryHistory.find(r => r.date === dateStr);
        if (!day) continue;
        const val = day[historyField];
        if (typeof val === "number" && !isNaN(val)) {
          const label = day.shortLabel ?? `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
          points.push({ label, value: val });
        }
      }
      return points;
    }

    if (type === "month") {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const points: TrendPoint[] = [];
      for (let i = 0; i < daysInMonth; i++) {
        const dd = new Date(d.getFullYear(), d.getMonth(), i + 1);
        const dateStr = dd.toISOString().slice(0, 10);
        const day = athlete.recoveryHistory.find(r => r.date === dateStr);
        if (!day) continue;
        const val = day[historyField];
        if (typeof val === "number" && !isNaN(val)) {
          points.push({ label: day.shortLabel ?? `${dd.getDate()}`, value: val });
        }
      }
      return points;
    }

    if (type === "year") {
      const year = now.getFullYear() + offset;
      const monthBuckets = new Map<number, number[]>();
      for (const day of athlete.recoveryHistory) {
        if (parseInt(day.date.slice(0, 4)) !== year) continue;
        const val = day[historyField];
        if (typeof val !== "number" || isNaN(val)) continue;
        const m = parseInt(day.date.slice(5, 7)) - 1;
        if (!monthBuckets.has(m)) monthBuckets.set(m, []);
        monthBuckets.get(m)!.push(val);
      }
      return Array.from(monthBuckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([m, vals]) => ({
          label: MONTH_SHORT[m],
          value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
        }));
    }

    // Fallback: use the trend array
    const realData = athlete[trendKey] as TrendPoint[] | undefined;
    return realData ?? [];
  };
}

/** Date-aware trend series — filters/aggregates trend arrays by timeframe, matching readinessSeries behavior */
function trendSeries(trendKey: keyof AthleteSummary) {
  return (athlete: AthleteSummary, timeframe: string): TrendPoint[] => {
    const data = athlete[trendKey] as TrendPoint[] | undefined;
    if (!data?.length) return [];

    const [type, p2] = timeframe.split(":");
    const offset = parseInt(p2 || "0");
    const now = new Date();

    // ── Week: 7 daily points for target Mon–Sun ──
    if (type === "week") {
      const dow = now.getDay();
      const mondayOff = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOff + offset * 7);
      monday.setHours(0, 0, 0, 0);
      const points: TrendPoint[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const pt = data.find(p => p.date === ds);
        if (pt) points.push(pt);
      }
      return points;
    }

    // ── Month / monthly: daily points for target calendar month ──
    if (type === "month" || type === "monthly") {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const startStr = d.toISOString().slice(0, 10);
      const endD = new Date(d.getFullYear(), d.getMonth(), daysInMonth);
      const endStr = endD.toISOString().slice(0, 10);
      return data.filter(p => p.date && p.date >= startStr && p.date <= endStr);
    }

    // ── Year / yearly: aggregate to monthly averages ──
    if (type === "year" || type === "yearly") {
      const year = now.getFullYear() + offset;
      const yearStr = String(year);
      const monthBuckets = new Map<number, number[]>();
      for (const pt of data) {
        if (!pt.date || pt.date.slice(0, 4) !== yearStr) continue;
        const m = parseInt(pt.date.slice(5, 7)) - 1;
        if (!monthBuckets.has(m)) monthBuckets.set(m, []);
        monthBuckets.get(m)!.push(pt.value);
      }
      return Array.from(monthBuckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([m, vals]) => ({
          label: MONTH_SHORT[m],
          value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
          date: `${yearStr}-${String(m + 1).padStart(2, "0")}-01`,
        }));
    }

    // ── Biweekly: 14 daily points ──
    if (type === "biweekly") {
      const end = new Date(now);
      end.setDate(now.getDate() + offset * 14);
      const start = new Date(end);
      start.setDate(end.getDate() - 13);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      return data.filter(p => p.date && p.date >= startStr && p.date <= endStr);
    }

    // ── Custom month picker: "months:2026-01,2026-03" ──
    if (type === "months") {
      const monthStrs = (p2 || "").split(",").filter(Boolean);
      if (!monthStrs.length) return data;
      const ranges = monthStrs.map(ms => {
        const [y, m] = ms.split("-").map(Number);
        const first = `${String(y)}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const last = `${String(y)}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        return { first, last };
      });
      return data.filter(p => p.date && ranges.some(r => p.date! >= r.first && p.date! <= r.last));
    }

    // ── Fallback: return full array ──
    return data;
  };
}

// ── Metric definitions ────────────────────────────────────────────────────────

const readinessMetrics: CompareMetric[] = [
  { key: "rec",  label: "Recovery score", unit: "",    barDomain: [0, 100],  historyField: "recoveryScore", baseValue: (a) => a.recoveryScore ?? 0, getSeries: readinessSeries("recoveryScore", "readinessTrend"), renderCurrent: (a) => a.recoveryScore != null ? `${a.recoveryScore}` : "–" },
  { key: "slp",  label: "Sleep score",    unit: "",    barDomain: [0, 100],  historyField: "sleepScore",    baseValue: (a) => a.sleepScore ?? 0,    getSeries: readinessSeries("sleepScore",    "sleepTrend"),     renderCurrent: (a) => a.sleepScore != null ? `${a.sleepScore}` : "–" },
  { key: "rhr",  label: "RHR",            unit: "bpm", barDomain: [30, 80],  historyField: "restHr",        baseValue: (a) => a.restHr ?? 0,        getSeries: readinessSeries("restHr",        "rhrTrend"),       renderCurrent: (a) => a.restHr != null ? `${a.restHr} bpm` : "–" },
  { key: "hrv",  label: "HRV",            unit: "ms",  barDomain: [0, 150],  historyField: "hrv",           baseValue: (a) => a.hrv ?? 0,           getSeries: readinessSeries("hrv",           "hrvTrend"),       renderCurrent: (a) => a.hrv != null ? `${a.hrv} ms` : "–" },
];

const perfSnapshotMetrics: CompareMetric[] = [
  { key: "power",          label: "Power max",        unit: "w",  baseValue: (a) => a.powerMax ?? 0,         getSeries: trendSeries("powerTrend"), renderCurrent: (a) => a.powerMax != null ? `${a.powerMax}w` : "N/A" },
  { key: "ftp",            label: "FTP",              unit: "w",  baseValue: (a) => a.ftp ?? 0,              getSeries: trendSeries("ftpTrend"), renderCurrent: (a) => a.ftp != null ? `${a.ftp}w` : "N/A" },
  { key: "vo2",            label: "VO2 max",          unit: "",   baseValue: (a) => a.vo2Max ?? 0,           getSeries: trendSeries("vo2MaxTrend"), renderCurrent: (a) => a.vo2Max != null ? `${a.vo2Max}` : "N/A" },
  { key: "tss",            label: "TSS",              unit: "",   baseValue: (a) => a.tss ?? 0,              getSeries: trendSeries("tssTrend"), renderCurrent: (a) => a.tss != null ? `${a.tss}` : "N/A" },
  { key: "balance",        label: "TSB",              unit: "",   baseValue: (a) => Math.abs(a.tsb ?? 0)+10, getSeries: trendSeries("tsbTrend"), renderCurrent: (a) => a.tsb != null ? formatSignedNumber(a.tsb) : "N/A" },
  { key: "atl",            label: "ATL",              unit: "",   baseValue: (a) => a.atl ?? 0,              getSeries: trendSeries("atlTrend"), renderCurrent: (a) => a.atl != null ? `${a.atl}` : "N/A" },
  { key: "ctl",            label: "CTL",              unit: "",   baseValue: (a) => a.ctl ?? 0,              getSeries: trendSeries("ctlTrend"), renderCurrent: (a) => a.ctl != null ? `${a.ctl}` : "N/A" },
  { key: "sleepEfficiency",label: "Sleep efficiency", unit: "%",  barDomain: [0, 100], baseValue: (a) => a.sleepEfficiency ?? 0, getSeries: readinessSeries("sleepEfficiency", "sleepEfficiencyTrend"), renderCurrent: (a) => a.sleepEfficiency != null ? `${a.sleepEfficiency}%` : "N/A" },
];

/** Derive a per-duration power trend from the overall powerTrend, scaled by the
 *  ratio of that duration's peak to the athlete's powerMax. This gives each
 *  power curve duration (5s, 30s, 1m, 5m, 30m) a realistic historical series. */
function scaledPowerSeries(curveIndex: number) {
  return (athlete: AthleteSummary, timeframe: string): TrendPoint[] => {
    const baseSeries = trendSeries("powerTrend");
    const raw = baseSeries(athlete, timeframe);
    if (!raw.length) return [];
    const peakWatts = athlete.powerCurve[curveIndex]?.value ?? 0;
    const maxPower = athlete.powerMax ?? 1;
    if (maxPower === 0) return [];
    const ratio = peakWatts / maxPower;
    return raw.map(pt => ({ ...pt, value: Math.round(pt.value * ratio) }));
  };
}

const powerCurveMetrics: CompareMetric[] = [
  { key: "pc0",   label: "5 sec",     unit: "w", baseValue: (a) => a.powerCurve[0]?.value ?? 0, getSeries: scaledPowerSeries(0), renderCurrent: (a) => `${a.powerCurve[0]?.value ?? 0}w` },
  { key: "pc1",   label: "30 sec",    unit: "w", baseValue: (a) => a.powerCurve[1]?.value ?? 0, getSeries: scaledPowerSeries(1), renderCurrent: (a) => `${a.powerCurve[1]?.value ?? 0}w` },
  { key: "pc2",   label: "1 min",     unit: "w", baseValue: (a) => a.powerCurve[2]?.value ?? 0, getSeries: scaledPowerSeries(2), renderCurrent: (a) => `${a.powerCurve[2]?.value ?? 0}w` },
  { key: "pc3",   label: "5 min",     unit: "w", baseValue: (a) => a.powerCurve[3]?.value ?? 0, getSeries: scaledPowerSeries(3), renderCurrent: (a) => `${a.powerCurve[3]?.value ?? 0}w` },
  { key: "pc4",   label: "30 min",    unit: "w", baseValue: (a) => a.powerCurve[4]?.value ?? 0, getSeries: scaledPowerSeries(4), renderCurrent: (a) => `${a.powerCurve[4]?.value ?? 0}w` },
  { key: "power", label: "Power max", unit: "w", baseValue: (a) => a.powerMax ?? 0,              getSeries: trendSeries("powerTrend"), renderCurrent: (a) => a.powerMax != null ? `${a.powerMax}w` : "N/A" },
];

const fitnessMetrics: CompareMetric[] = [
  { key: "ftp",     label: "FTP",     unit: "w", baseValue: (a) => a.ftp ?? 0,              getSeries: trendSeries("ftpTrend"), renderCurrent: (a) => a.ftp != null ? `${a.ftp}w` : "N/A" },
  { key: "vo2",     label: "VO2 max", unit: "",  baseValue: (a) => a.vo2Max ?? 0,           getSeries: trendSeries("vo2MaxTrend"), renderCurrent: (a) => a.vo2Max != null ? `${a.vo2Max}` : "N/A" },
  { key: "tss",     label: "TSS",     unit: "",  baseValue: (a) => a.tss ?? 0,              getSeries: trendSeries("tssTrend"), renderCurrent: (a) => a.tss != null ? `${a.tss}` : "N/A" },
  { key: "balance", label: "TSB",     unit: "",  baseValue: (a) => Math.abs(a.tsb ?? 0)+10, getSeries: trendSeries("tsbTrend"), renderCurrent: (a) => a.tsb != null ? formatSignedNumber(a.tsb) : "N/A" },
];

const loadMetrics: CompareMetric[] = [
  { key: "atl",            label: "ATL",              unit: "",  baseValue: (a) => a.atl ?? 0,        getSeries: trendSeries("atlTrend"), renderCurrent: (a) => a.atl != null ? `${a.atl}` : "N/A" },
  { key: "ctl",            label: "CTL",              unit: "",  baseValue: (a) => a.ctl ?? 0,        getSeries: trendSeries("ctlTrend"), renderCurrent: (a) => a.ctl != null ? `${a.ctl}` : "N/A" },
  { key: "sleepEfficiency",label: "Sleep efficiency", unit: "%", barDomain: [0, 100], baseValue: (a) => a.sleepEfficiency ?? 0, getSeries: readinessSeries("sleepEfficiency", "sleepEfficiencyTrend"), renderCurrent: (a) => a.sleepEfficiency != null ? `${a.sleepEfficiency}%` : "N/A" },
];

const PERF_SECTIONS = [
  { key: "power",   label: "Power Curve",     accentColor: "#e16b2b", metrics: powerCurveMetrics },
  { key: "fitness", label: "Performance",     accentColor: "#d97706", metrics: fitnessMetrics },
  { key: "load",    label: "Load & Recovery", accentColor: "#059669", metrics: loadMetrics },
];

// ── Series merger ─────────────────────────────────────────────────────────────

function mergeSeries(athletes: AthleteSummary[], metric: CompareMetric, timeframe: string) {
  if (!athletes.length) return [];
  const allSeries = athletes.map(a => metric.getSeries(a, timeframe));
  if (allSeries.every(s => !s.length)) return [];

  // Build label→value maps per athlete for accurate date alignment
  const maps = allSeries.map(s => new Map(s.map(p => [p.label, p.value])));

  // Use the longest series as the ordered label base, then append any remaining labels
  const baseIdx = allSeries.reduce((bi, s, i) => s.length > allSeries[bi].length ? i : bi, 0);
  const labels: string[] = allSeries[baseIdx].map(p => p.label);
  const labelSet = new Set(labels);
  for (const s of allSeries) {
    for (const p of s) {
      if (!labelSet.has(p.label)) { labels.push(p.label); labelSet.add(p.label); }
    }
  }

  return labels.map(label => {
    const row: Record<string, number | string> = { label };
    athletes.forEach((a, i) => {
      const val = maps[i].get(label);
      if (val != null) row[a.name] = val;
    });
    return row;
  });
}

// ── CompareChart (line chart) ─────────────────────────────────────────────────

function CompareChart({
  title, athletes, metric, onSeeMore, accentColor, timeframe, colorMap
}: {
  title: string; athletes: AthleteSummary[]; metric: CompareMetric;
  onSeeMore?: (m: CompareMetric) => void; accentColor: string; timeframe: string;
  colorMap: Map<string, string>;
}) {
  const isPct  = metric.unit === "%" || metric.barDomain?.[1] === 100;
  const data   = useMemo(() => mergeSeries(athletes, metric, timeframe), [athletes, metric, timeframe]);
  const domain = useMemo(() => chartDomain(data, isPct), [data, isPct]);
  const isYear = timeframe.startsWith("year");

  const athleteAvgs = useMemo(() => athletes.map(a => {
    const s = metric.getSeries(a, timeframe);
    if (!s.length) return null;
    const avg = s.reduce((sum, p) => sum + p.value, 0) / s.length;
    return Math.round(avg * 10) / 10;
  }), [athletes, metric, timeframe]);

  return (
    <div className="border border-line bg-canvas rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <span className="text-sm font-medium text-ink">{title}</span>
        {onSeeMore && (
          <button type="button" onClick={() => onSeeMore(metric)}
            className="text-xs text-muted border border-line rounded-md px-2 py-1 hover:text-ink hover:border-ink/30 transition-colors duration-100">
            Expand ↗
          </button>
        )}
      </div>
      <div className="flex border-b border-line" style={{ borderBottomColor: "#e9e9e7" }}>
        {athletes.map((athlete, i) => {
          const color = colorMap.get(athlete.id) ?? athleteColors[0];
          const avg = athleteAvgs[i];
          return (
            <div key={athlete.id} className="flex-1 flex flex-col gap-1 px-3 py-2.5 border-r border-line last:border-r-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted">{athlete.name.split(" ")[0]}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular text-ink">
                  {avg != null ? `${tickFmt(avg)}${metric.unit ? ` ${metric.unit}` : ""}` : "–"}
                </span>
                {avg != null && <span className="text-[10px] text-muted">avg</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 190 }} className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical horizontal stroke="#e9e9e7" strokeDasharray="2 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false}
              tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
              tickFormatter={(label: string) =>
                timeframe.startsWith("biweekly")
                  ? (label.endsWith(" 1") ? label.replace(" 1", "") : "")
                  : label
              } />
            <YAxis domain={domain} tickFormatter={tickFmt} tickCount={5} tickLine={false} axisLine={false} tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} width={36} />
            <Tooltip contentStyle={TS} labelStyle={TL}
              labelFormatter={(label: string) => {
                if (timeframe.startsWith("biweekly")) {
                  const parts = (label as string).split(" ");
                  if (parts.length === 2) {
                    const month = parts[0], day = parseInt(parts[1]);
                    const mi = MONTH_SHORT.indexOf(month);
                    if (mi >= 0) {
                      if (day === 1) return `01 ${month} – 14 ${month}`;
                      const lastDay = new Date(new Date().getFullYear(), mi + 1, 0).getDate();
                      return `15 ${month} – ${lastDay} ${month}`;
                    }
                  }
                }
                if (isYear) return `${label} (monthly avg)`;
                return label;
              }}
              formatter={(v: number, name: string) => [`${tickFmt(v)}${metric.unit ? ` ${metric.unit}` : ""}`, name]} />
            {athletes.map((athlete) => {
              const stroke = colorMap.get(athlete.id) ?? athleteColors[0];
              return <Line key={athlete.id} type="monotone" dataKey={athlete.name} stroke={stroke} strokeWidth={1.5}
                dot={{ r: 2.5, fill: stroke, stroke: "#ffffff", strokeWidth: 1 }}
                activeDot={{ r: 4, fill: stroke, stroke: "#ffffff", strokeWidth: 1 }} />;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── SnapshotBarChart ──────────────────────────────────────────────────────────

function SnapshotBarChart({
  title, athletes, metric, window: win, accentColor, colorMap
}: {
  title: string; athletes: AthleteSummary[]; metric: CompareMetric;
  window: SnapshotWindow; accentColor: string; colorMap: Map<string, string>;
}) {
  const data = useMemo(() => athletes.map((athlete) => ({
    name: athlete.name.split(" ")[0],
    value: getHistorySnapshot(athlete, metric.historyField, metric.baseValue(athlete), win.startDayOffset, win.days, win.aggregate ?? "point"),
    color: colorMap.get(athlete.id) ?? athleteColors[0],
    athleteId: athlete.id
  })), [athletes, metric, win, colorMap]);

  const domain: [number, number] = metric.barDomain ?? scalarDomain(data.map(d => d.value ?? 0));

  return (
    <div className="border border-line bg-canvas rounded-lg flex flex-col overflow-hidden">
      <div className="border-b border-line px-3 py-2.5">
        <span className="text-sm font-medium text-ink">{title}</span>
      </div>
      <div className="flex border-b border-line" style={{ borderBottomColor: "#e9e9e7" }}>
        {athletes.map((athlete) => {
          const color = colorMap.get(athlete.id) ?? athleteColors[0];
          const peak = data.find(d => d.athleteId === athlete.id)?.value ?? null;
          return (
            <div key={athlete.id} className="flex-1 flex flex-col gap-1 px-3 py-2.5 border-r border-line last:border-r-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted">{athlete.name.split(" ")[0]}</span>
              </div>
              <span className="text-sm font-semibold tabular text-ink">
                {peak != null ? `${tickFmt(peak)}${metric.unit ? ` ${metric.unit}` : ""}` : "–"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 190 }} className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} horizontal stroke="#e9e9e7" strokeDasharray="2 3" />
            <XAxis dataKey="name" tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} tickLine={false} axisLine={false} />
            <YAxis domain={domain} tickFormatter={tickFmt} tickCount={5} tickLine={false} axisLine={false} tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} width={36} />
            <Tooltip contentStyle={TS} labelStyle={TL} formatter={(v: number, name: string) => [tickFmt(v), name]} />
            <Bar dataKey="value" maxBarSize={44}>
              {data.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── PowerHexagon ──────────────────────────────────────────────────────────────

const POWER_SHORT_LABELS = ["5s", "30s", "1min", "5min", "30min", "FTP"];

function PowerHexagon({
  athletes, window: win, colorMap, powerUnit, onToggleUnit
}: {
  athletes: AthleteSummary[]; window: SnapshotWindow; colorMap: Map<string, string>;
  powerUnit: "w" | "w/kg"; onToggleUnit: () => void;
}) {
  const isWkg = powerUnit === "w/kg";
  const { hexData, wattLookup } = useMemo(() => {
    // Build raw values: 5 power curve points + FTP (in watts or W/kg)
    const rawValues = athletes.map(a => {
      const wt = a.weightKg || 1;
      return [
        ...a.powerCurve.map((pt) => isWkg ? (pt.value ?? 0) / wt : (pt.value ?? 0)),
        isWkg ? (a.ftp ?? 0) / wt : (a.ftp ?? 0),
      ];
    });

    // Store actual values for tooltip display
    const lookup = new Map<string, number>();

    const data = POWER_SHORT_LABELS.map((subject, i) => {
      const vals = rawValues.map(av => av[i] ?? 0);
      const maxVal = Math.max(...vals, 0.01);
      const row: Record<string, string | number> = { subject };
      athletes.forEach((a, ai) => {
        const val = rawValues[ai][i] ?? 0;
        row[a.name] = Math.round((val / maxVal) * 100); // Normalised for radar shape
        lookup.set(`${subject}__${a.name}`, val);
      });
      return row;
    });

    return { hexData: data, wattLookup: lookup };
  }, [athletes, win, isWkg]);

  return (
    <div className="border border-line bg-canvas rounded-lg flex flex-col lg:row-span-2 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <span className="text-sm font-medium text-ink">Power Profile</span>
        <button type="button" onClick={onToggleUnit}
          className="flex items-center gap-1 text-xs font-medium bg-surface hover:bg-surfaceStrong border border-line rounded-full px-2.5 py-1 transition-colors">
          <span className={isWkg ? "text-muted" : "text-ink font-semibold"}>W</span>
          <span className="text-muted">/</span>
          <span className={isWkg ? "text-ink font-semibold" : "text-muted"}>W/kg</span>
        </button>
      </div>
      <div className="flex border-b border-line" style={{ borderBottomColor: "#e9e9e7" }}>
        {athletes.map((athlete) => {
          const color = colorMap.get(athlete.id) ?? athleteColors[0];
          const maxDisplay = isWkg && athlete.weightKg
            ? `${((athlete.powerMax ?? 0) / athlete.weightKg).toFixed(2)} w/kg`
            : `${athlete.powerMax}w max`;
          return (
            <div key={athlete.id} className="flex-1 flex flex-col gap-1 px-3 py-2.5 border-r border-line last:border-r-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted">{athlete.name.split(" ")[0]}</span>
              </div>
              <span className="text-sm font-semibold tabular text-ink">{maxDisplay}</span>
            </div>
          );
        })}
      </div>
      <div className="px-2 py-3" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={hexData} margin={{ top: 16, right: 36, bottom: 16, left: 36 }}>
            <PolarGrid gridType="polygon" stroke="#e9e9e7" />
            <PolarAngleAxis dataKey="subject"
              tick={{ fill: "#9b9a97", fontSize: 11, fontFamily: "inherit" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={TS} labelStyle={TL}
              formatter={(v: number, name: string, props: { payload?: { subject?: string } }) => {
                const subject = props.payload?.subject ?? "";
                const val = wattLookup.get(`${subject}__${name}`) ?? 0;
                return [isWkg ? `${val.toFixed(2)} w/kg` : `${Math.round(val)}w`, name];
              }}
            />
            {athletes.map((athlete) => {
              const color = colorMap.get(athlete.id) ?? athleteColors[0];
              return (
                <Radar key={athlete.id} name={athlete.name} dataKey={athlete.name}
                  stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0} />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── SnapshotTable (readiness) ─────────────────────────────────────────────────

function SnapshotTable({
  athletes, metrics, window: win, colorMap
}: {
  athletes: AthleteSummary[]; metrics: CompareMetric[]; window: SnapshotWindow;
  colorMap: Map<string, string>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-canvas">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted w-40">Metric</th>
            {athletes.map((a) => (
              <th key={a.id} className="px-4 py-3 text-left font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colorMap.get(a.id) ?? athleteColors[0] }} />
                  <span className="text-xs font-medium text-ink">{a.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, rowIdx) => (
            <tr key={metric.key} className={cn("border-b border-line last:border-b-0 transition-colors hover:bg-surface/60", rowIdx % 2 === 1 ? "bg-surface/40" : "bg-canvas")}>
              <td className="px-4 py-2.5 text-sm text-muted">{metric.label}</td>
              {athletes.map((a) => {
                const val = getHistorySnapshot(a, metric.historyField, metric.baseValue(a), win.startDayOffset, win.days, win.aggregate ?? "point");
                return (
                  <td key={`${a.id}-${metric.key}`} className="px-4 py-2.5 text-sm font-medium tabular text-ink">
                    {val != null ? `${tickFmt(val)}${metric.unit ? ` ${metric.unit}` : ""}` : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── PerfSnapshotTable ─────────────────────────────────────────────────────────

function PerfSnapshotTable({
  athletes, window: win, colorMap
}: {
  athletes: AthleteSummary[]; window: SnapshotWindow; colorMap: Map<string, string>;
}) {
  const cols = athletes.length + 1;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const SectionRow = ({ label, sectionKey, accentColor }: { label: string; sectionKey: string; accentColor: string }) => {
    const isCollapsed = collapsed[sectionKey];
    return (
      <tr
        className="cursor-pointer select-none group transition-colors hover:bg-surface"
        onClick={() => toggle(sectionKey)}
      >
        <td colSpan={cols} className="px-4 py-2.5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-3.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-xs font-semibold tracking-wide text-ink uppercase">{label}</span>
            <span className="ml-auto text-[10px] text-muted group-hover:text-ink transition-colors">{isCollapsed ? "▶" : "▼"}</span>
          </div>
        </td>
      </tr>
    );
  };

  const MetricRow = ({ metric, rowIdx, indent }: { metric: CompareMetric; rowIdx: number; indent?: boolean }) => (
    <tr className="border-b border-line last:border-b-0 transition-colors hover:bg-surface/60">
      <td className={cn("px-4 py-2.5 text-sm text-muted whitespace-nowrap", indent && "pl-8")}>
        {metric.label}
      </td>
      {athletes.map((a) => {
        const val = getHistorySnapshot(a, metric.historyField, metric.baseValue(a), win.startDayOffset, win.days, win.aggregate ?? "point");
        return (
          <td key={`${a.id}-${metric.key}`} className="px-4 py-2.5 text-sm font-medium tabular text-ink">
            {val != null ? `${tickFmt(val)}${metric.unit ? ` ${metric.unit}` : ""}` : "–"}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-canvas">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted w-40">Metric</th>
            {athletes.map((a) => (
              <th key={a.id} className="px-4 py-3 text-left font-medium">
                <span className="inline-flex items-center gap-2">
                  <span className="block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colorMap.get(a.id) ?? athleteColors[0] }} />
                  <span className="text-xs font-medium text-ink">{a.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SectionRow label="Performance" sectionKey="perf" accentColor="#d97706" />
          {!collapsed["perf"] && [...fitnessMetrics, ...loadMetrics].map((m, idx) => (
            <MetricRow key={m.key} metric={m} rowIdx={idx} />
          ))}
          <SectionRow label="Power Curve" sectionKey="power" accentColor="#e16b2b" />
          {!collapsed["power"] && powerCurveMetrics.map((m, idx) => (
            <MetricRow key={m.key} metric={m} rowIdx={idx} indent />
          ))}
          <SectionRow label="Training Zones" sectionKey="zones" accentColor="#059669" />
          {!collapsed["zones"] && (
            <tr className="border-b border-line last:border-b-0 transition-colors hover:bg-surface/60">
              <td className="px-4 py-2.5 text-sm text-muted pl-8">Polarized</td>
              {athletes.map((a) => (
                <td key={`${a.id}-pol`} className="px-4 py-2.5">
                  <PolarizedBar zones={a.polarizedZones} compact />
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── MetricDetailPanel ─────────────────────────────────────────────────────────

function MetricDetailPanel({
  metric, athletes, onClose, timeframe, accentColor, colorMap
}: {
  metric: CompareMetric; athletes: AthleteSummary[];
  onClose: () => void; timeframe: string; accentColor: string;
  colorMap: Map<string, string>;
}) {
  const data = useMemo(() => mergeSeries(athletes, metric, timeframe), [athletes, metric, timeframe]);

  return (
    <div className="border border-line bg-canvas" style={{ borderColor: accentColor }}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-xs text-muted">Focused metric</p>
          <h3 className="mt-0.5 text-sm font-semibold text-ink">{metric.label}</h3>
        </div>
        <button type="button" onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-muted border border-line hover:text-ink hover:border-ink/30 transition-colors duration-100">
          Close
        </button>
      </div>
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="lg:col-span-9 border-r border-line">
          <div style={{ height: 280 }} className="px-1 pt-3 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical horizontal stroke="#e9e9e7" strokeDasharray="2 3" />
                <XAxis dataKey="label" tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} tickLine={false} axisLine={false} />
                <YAxis domain={chartDomain(data)} tickFormatter={tickFmt} tickCount={6} tickLine={false} axisLine={false} tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} width={36} />
                <Tooltip contentStyle={TS} labelStyle={TL} />
                {athletes.map((a) => {
                  const stroke = colorMap.get(a.id) ?? athleteColors[0];
                  return <Line key={a.id} type="monotone" dataKey={a.name} stroke={stroke} strokeWidth={1.5}
                    dot={{ r: 3, fill: stroke, stroke: "#ffffff", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: stroke, stroke: "#ffffff", strokeWidth: 1.5 }} />;
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-3 p-4">
          <p className="text-[10px] tracking-widest uppercase text-muted mb-3">Period avg</p>
          <div className="space-y-2">
            {athletes.map((a, i) => {
              const s = metric.getSeries(a, timeframe);
              const avg = s.length ? Math.round((s.reduce((sum, p) => sum + p.value, 0) / s.length) * 10) / 10 : null;
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 border-b border-line pb-2">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="block h-1.5 w-1.5 shrink-0" style={{ backgroundColor: colorMap.get(a.id) ?? athleteColors[0] }} />
                    <span className="text-[11px] text-ink">{a.name.split(" ")[0]}</span>
                  </div>
                  <span className="text-[11px] tabular text-muted">
                    {avg != null ? `${tickFmt(avg)}${metric.unit ? ` ${metric.unit}` : ""}` : "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DateNavCell — reusable date navigator ─────────────────────────────────────

function DateNavCell({
  label, dayOffset, onPrev, onNext, disableNext = false, dimLabel = false
}: {
  label: string; dayOffset?: number;
  onPrev: () => void; onNext: () => void;
  disableNext?: boolean; dimLabel?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0 border border-line rounded-md overflow-hidden">
      <button type="button" onClick={onPrev}
        className="px-2 py-1 text-xs text-muted hover:text-ink hover:bg-surfaceStrong border-r border-line transition-colors duration-100">‹</button>
      <span className={cn("px-3 py-1 text-sm whitespace-nowrap", dimLabel ? "text-muted" : "text-ink")}>
        {label}
      </span>
      <button type="button" onClick={onNext} disabled={disableNext}
        className={cn("px-2 py-1 text-xs border-l border-line transition-colors duration-100",
          disableNext ? "text-muted opacity-30 cursor-not-allowed" : "text-muted hover:text-ink hover:bg-surfaceStrong")}>›</button>
    </div>
  );
}

// ── Month helpers ─────────────────────────────────────────────────────────────

function toMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthStr(s: string): { year: number; month: number } {
  const [y, m] = s.split("-").map(Number);
  return { year: y, month: m };
}


// ── MonthPickerModal ──────────────────────────────────────────────────────────

const MAX_MONTHS = 10;

function MonthPickerModal({
  value,
  onChange,
  onClose,
}: {
  value: string[];
  onChange: (months: string[]) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const [draft, setDraft] = useState<string[]>(value);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const thisMonthStr = toMonthStr(now);

  const toggle = (m: string) => {
    setDraft(prev => {
      if (prev.includes(m)) return prev.filter(x => x !== m);
      if (prev.length >= MAX_MONTHS) return prev;
      return [...prev, m];
    });
  };

  const canApply = draft.length >= 2;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-line rounded-xl shadow-xl p-5 w-[380px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Compare months</h3>
            <p className="text-xs text-muted mt-0.5">Pick up to {MAX_MONTHS} months from any year</p>
          </div>
          <button type="button" onClick={onClose}
            className="text-muted hover:text-ink transition-colors text-sm leading-none">✕</button>
        </div>

        {/* Selected months pills */}
        <div className="mb-4 min-h-[32px]">
          {draft.length === 0 ? (
            <p className="text-xs text-muted italic">No months selected</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {draft.map(m => {
                const { year, month } = parseMonthStr(m);
                return (
                  <button key={m} type="button" onClick={() => toggle(m)}
                    className="inline-flex items-center gap-1 text-xs border border-brand/30 bg-brandSoft text-brand rounded-md px-2 py-0.5 hover:bg-brand/10 transition-colors">
                    {MONTH_SHORT[month - 1]} '{String(year).slice(2)}
                    <span className="opacity-60 text-[10px]">✕</span>
                  </button>
                );
              })}
              {draft.length > 0 && (
                <button type="button" onClick={() => setDraft([])}
                  className="text-xs text-muted hover:text-ink transition-colors px-1">
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Count indicator */}
        <div className="flex items-center justify-between mb-3">
          {/* Year navigator */}
          <div className="inline-flex items-center gap-0 border border-line rounded-md overflow-hidden">
            <button type="button" onClick={() => setViewYear(y => y - 1)}
              className="px-2 py-1 text-xs text-muted hover:text-ink hover:bg-surfaceStrong border-r border-line transition-colors duration-100">‹</button>
            <span className="px-3 py-1 text-sm text-ink font-medium">{viewYear}</span>
            <button type="button" onClick={() => setViewYear(y => y + 1)}
              disabled={viewYear >= now.getFullYear()}
              className={cn("px-2 py-1 text-xs border-l border-line transition-colors duration-100",
                viewYear >= now.getFullYear()
                  ? "text-muted opacity-30 cursor-not-allowed"
                  : "text-muted hover:text-ink hover:bg-surfaceStrong")}>›</button>
          </div>
          <span className={cn("text-xs font-medium tabular", draft.length >= MAX_MONTHS ? "text-warning" : "text-muted")}>
            {draft.length}/{MAX_MONTHS}
          </span>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {MONTH_SHORT.map((name, i) => {
            const monthStr = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
            const isFuture = monthStr > thisMonthStr;
            const isSelected = draft.includes(monthStr);
            const isDisabled = isFuture || (!isSelected && draft.length >= MAX_MONTHS);
            return (
              <button key={name} type="button"
                onClick={() => !isDisabled && toggle(monthStr)}
                disabled={isDisabled}
                className={cn(
                  "rounded-md py-1.5 text-xs font-medium transition-colors duration-100",
                  isSelected
                    ? "bg-brand text-white border border-brand"
                    : isDisabled
                    ? "text-muted opacity-30 cursor-not-allowed border border-transparent"
                    : "border border-line text-ink hover:border-brand/40 hover:bg-brandSoft hover:text-brand"
                )}>
                {name}
              </button>
            );
          })}
        </div>

        {/* Status */}
        {!canApply && draft.length > 0 && (
          <div className="rounded-md px-3 py-2 mb-3 text-xs bg-warningSoft text-warning border border-warning/20">
            Select at least 2 months to compare
          </div>
        )}
        {canApply && (
          <div className="rounded-md px-3 py-2 mb-3 text-xs bg-surface text-muted border border-line">
            {draft.length} months selected · each shown as a separate data point
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100">
            Cancel
          </button>
          <button type="button"
            disabled={!canApply}
            onClick={() => { onChange(draft); onClose(); }}
            className={cn(
              "text-sm rounded-md px-3 py-1.5 font-medium transition-colors duration-100",
              !canApply
                ? "text-muted border border-line cursor-not-allowed opacity-50"
                : "text-brand border border-brand/30 hover:bg-brandSoft"
            )}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Week/Month/Year period pickers ────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const DAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function WeekPickerModal({
  timeframeOffset,
  onSelect,
  onClose,
}: {
  timeframeOffset: number;
  onSelect: (offset: number) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const nowMonday = getMondayOf(now);
  const currentWeekMonday = getMondayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + timeframeOffset * 7));

  const canNextMonth = !(viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (!canNextMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid: days for this month view
  const firstDay = new Date(viewYear, viewMonth, 1);
  // Start grid from Monday of the week containing the 1st
  const gridStart = getMondayOf(firstDay);
  // Build 6 weeks of days (42 days)
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  // Group into weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7));

  const isFutureWeek = (monday: Date) => monday.getTime() > nowMonday.getTime();
  const isActiveWeek = (monday: Date) => monday.getTime() === currentWeekMonday.getTime();

  const handleClickDay = (day: Date) => {
    const monday = getMondayOf(day);
    if (isFutureWeek(monday)) return;
    const offset = Math.round((monday.getTime() - nowMonday.getTime()) / (7 * 86400000));
    onSelect(Math.min(0, offset));
    onClose();
  };

  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Select week</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-sm">✕</button>
        </div>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth}
            className="px-2 py-1 text-xs text-muted hover:text-ink hover:bg-surfaceStrong rounded transition-colors">‹ Prev</button>
          <span className="text-sm font-medium text-ink">{MONTH_SHORT[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} disabled={!canNextMonth}
            className={cn("px-2 py-1 text-xs rounded transition-colors", canNextMonth ? "text-muted hover:text-ink hover:bg-surfaceStrong" : "text-muted opacity-30 cursor-not-allowed")}>
            Next ›
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map(h => (
            <div key={h} className="text-center text-[10px] font-medium text-muted py-1">{h}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => {
          const monday = getMondayOf(week[0]);
          const future = isFutureWeek(monday);
          const active = isActiveWeek(monday);
          const hovered = hoveredWeek === wi;
          return (
            <div key={wi}
              className={cn(
                "grid grid-cols-7 rounded-md transition-colors duration-75 mb-0.5",
                !future && hovered ? "bg-blue/10" : "",
                active ? "ring-1 ring-blue/40" : ""
              )}
              onMouseEnter={() => !future && setHoveredWeek(wi)}
              onMouseLeave={() => setHoveredWeek(null)}
            >
              {week.map((day, di) => {
                const inMonth = day.getMonth() === viewMonth;
                const isToday = day.toDateString() === now.toDateString();
                return (
                  <button
                    key={di}
                    type="button"
                    disabled={future}
                    onClick={() => handleClickDay(day)}
                    className={cn(
                      "text-center py-1.5 text-xs rounded transition-colors",
                      future ? "text-muted/30 cursor-not-allowed" : "cursor-pointer",
                      !future && inMonth ? "text-ink" : "text-muted/50",
                      isToday ? "font-semibold" : "",
                      active && !future ? "text-blue font-semibold" : ""
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthYearPickerModal({
  timeframeOffset,
  onSelect,
  onClose,
}: {
  timeframeOffset: number;
  onSelect: (offset: number) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);

  const selectedDate = new Date(currentYear, now.getMonth() + timeframeOffset, 1);
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  const isFutureMonth = (year: number, month: number) =>
    year > currentYear || (year === currentYear && month > now.getMonth());

  const handleSelect = (month: number) => {
    if (isFutureMonth(viewYear, month)) return;
    const offset = (viewYear - currentYear) * 12 + (month - now.getMonth());
    onSelect(Math.min(0, offset));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl p-5 w-[300px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Select month</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-sm">✕</button>
        </div>
        {/* Year nav */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setViewYear(y => y - 1)}
            className="px-2 py-1 text-xs text-muted hover:text-ink hover:bg-surfaceStrong rounded transition-colors">‹ {viewYear - 1}</button>
          <span className="text-sm font-semibold text-ink">{viewYear}</span>
          <button type="button" onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= currentYear}
            className={cn("px-2 py-1 text-xs rounded transition-colors", viewYear < currentYear ? "text-muted hover:text-ink hover:bg-surfaceStrong" : "text-muted opacity-30 cursor-not-allowed")}>
            {viewYear + 1} ›
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_SHORT.map((name, i) => {
            const future = isFutureMonth(viewYear, i);
            const active = viewYear === selectedYear && i === selectedMonth;
            return (
              <button key={name} type="button" disabled={future} onClick={() => handleSelect(i)}
                className={cn(
                  "rounded-md py-2 text-xs font-medium transition-colors duration-100",
                  active ? "bg-blue text-white border border-blue" :
                  future ? "text-muted opacity-30 cursor-not-allowed border border-transparent" :
                  "border border-line text-ink hover:border-blue/40 hover:bg-blue/5 hover:text-blue"
                )}>
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearPickerPanel({
  timeframeOffset,
  onSelect,
  onClose,
}: {
  timeframeOffset: number;
  onSelect: (offset: number) => void;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const selectedYear = currentYear + timeframeOffset;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl p-5 w-[220px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Select year</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-sm">✕</button>
        </div>
        <div className="space-y-1">
          {[...years].reverse().map(year => {
            const active = year === selectedYear;
            return (
              <button key={year} type="button"
                onClick={() => { onSelect(year - currentYear); onClose(); }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-100",
                  active ? "bg-blue/10 text-blue font-semibold" : "text-ink hover:bg-surfaceStrong"
                )}>
                {year}
                {active && <span className="text-[10px] text-blue">Current</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CompareWorkbench ──────────────────────────────────────────────────────────

export function CompareWorkbench({
  athletes, section
}: {
  athletes: AthleteSummary[];
  section: "readiness" | "performance";
}) {
  const [flaggedOnly, setFlaggedOnly]     = useState(false);
  const [selectedIds, setSelectedIds]     = useState<string[]>(athletes.slice(0, 4).map(a => a.id));
  const [expandedMetricKey, setExpanded]  = useState<string | null>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expandedMetricKey && expandedPanelRef.current) {
      expandedPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expandedMetricKey]);

  // Mode
  const [mode, setMode]                   = useState<"snapshot" | "timeframe">("timeframe");
  const [snapshotView, setSnapshotView]   = useState<"bar" | "table">("bar");

  // Snapshot range state
  const [snapDayOffset, setSnapDayOffset]   = useState(0);           // for readiness day mode
  const [snapPeriod, setSnapPeriod]         = useState<SnapshotPeriod>("2weeks");
  const [snapPeriodOffset, setSnapPeriodOffset] = useState(0);      // for 2weeks / monthly
  const [snapCustomStart, setSnapCustomStart]   = useState(-13);    // day offset from today
  const [snapCustomEnd,   setSnapCustomEnd]     = useState(0);

  // Snapshot readiness aggregation mode
  const [snapReadMode, setSnapReadMode]     = useState<"day" | "week-avg" | "month-avg" | "year-avg">("day");
  const [snapWeekOffset, setSnapWeekOffset] = useState(0);
  const [snapMonthOffset, setSnapMonthOffset] = useState(0);
  const [snapYearOffset, setSnapYearOffset] = useState(0);
  const [showSnapPeriodPicker, setShowSnapPeriodPicker] = useState(false);

  // Timeframe state
  const [timeframeType, setTimeframeType] = useState(() => section === "readiness" ? "week" : "biweekly");
  const [timeframeOffset, setTimeframeOffset] = useState(0);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [perfPageOffset, setPerfPageOffset] = useState(0);
  const [powerUnit, setPowerUnit] = useState<"w" | "w/kg">("w");
  // Custom perf month selection
  const _now = new Date();
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    // Default: last 6 months
    return Array.from({ length: 6 }, (_, i) =>
      toMonthStr(new Date(_now.getFullYear(), _now.getMonth() - (5 - i), 1))
    );
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const timeframeTypeOptions = section === "readiness"
    ? ["week", "month", "year"] : ["biweekly", "monthly", "yearly", "custom"];

  const accentColor = section === "readiness" ? "#3b82f6" : "#e16b2b";

  const activeTimeframe = useMemo(() => {
    if (timeframeType === "custom") return `months:${selectedMonths.join(",")}`;
    if (section === "performance" && (timeframeType === "biweekly" || timeframeType === "monthly")) return `${timeframeType}:${perfPageOffset}`;
    return `${timeframeType}:${timeframeOffset}`;
  }, [timeframeType, timeframeOffset, perfPageOffset, selectedMonths, section]);

  const snapshotWindow = useMemo((): SnapshotWindow => {
    if (section === "readiness" && mode === "snapshot") {
      const now = new Date();
      const msPerDay = 86400000;

      if (snapReadMode === "day") {
        const d = new Date(); d.setDate(d.getDate() + snapDayOffset);
        const label = snapDayOffset === 0 ? "Today" : snapDayOffset === -1 ? "Yesterday"
          : `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`;
        return { label, startDayOffset: snapDayOffset, days: 1, aggregate: "point" };
      }

      if (snapReadMode === "week-avg") {
        const dow = now.getDay();
        const mondayOff = dow === 0 ? 6 : dow - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOff + snapWeekOffset * 7);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`;
        const startDayOffset = Math.round((monday.getTime() - now.getTime()) / msPerDay);
        return { label: `${fmt(monday)} – ${fmt(sunday)}`, startDayOffset, days: 7, aggregate: "avg" };
      }

      if (snapReadMode === "month-avg") {
        const d = new Date(now.getFullYear(), now.getMonth() + snapMonthOffset, 1);
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const startDayOffset = Math.round((d.getTime() - now.getTime()) / msPerDay);
        return {
          label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
          startDayOffset, days: daysInMonth, aggregate: "avg"
        };
      }

      if (snapReadMode === "year-avg") {
        const year = now.getFullYear() + snapYearOffset;
        const jan1 = new Date(year, 0, 1);
        const isLeap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
        const startDayOffset = Math.round((jan1.getTime() - now.getTime()) / msPerDay);
        return { label: `${year}`, startDayOffset, days: isLeap ? 366 : 365, aggregate: "avg" };
      }
    }
    return getSnapshotWindow(snapPeriod, snapPeriodOffset, snapCustomStart, snapCustomEnd);
  }, [section, mode, snapReadMode, snapDayOffset, snapWeekOffset, snapMonthOffset, snapYearOffset, snapPeriod, snapPeriodOffset, snapCustomStart, snapCustomEnd]);

  const perfPageInfo = useMemo(() => {
    if (section !== "performance" || mode !== "timeframe") return null;
    if (timeframeType === "biweekly") return getBiweeklyPageLabels(perfPageOffset);
    if (timeframeType === "monthly") return { ...getMonthlyPageLabels(perfPageOffset), ranges: undefined as string[] | undefined };
    return null;
  }, [section, mode, timeframeType, perfPageOffset]);

  const periodInfo = useMemo((): PeriodInfo | null => {
    if (mode !== "timeframe") return null;
    if (section === "readiness") return getPeriodInfo(timeframeType as "week" | "month" | "year", timeframeOffset);
    return getPerfPeriodInfo(timeframeType as "biweekly" | "monthly" | "yearly", timeframeOffset);
  }, [mode, section, timeframeType, timeframeOffset]);

  const availableAthletes = useMemo(
    () => flaggedOnly ? athletes.filter(a => (a.recoveryScore != null && a.recoveryScore < 60) || (a.tsb != null && a.tsb < 0)) : athletes,
    [athletes, flaggedOnly]
  );
  const selectedAthletes = useMemo(
    () => availableAthletes.filter(a => selectedIds.includes(a.id)),
    [availableAthletes, selectedIds]
  );
  // Stable color per athlete — keyed by ID so color never changes when others are deselected
  const colorMap = useMemo(
    () => new Map(availableAthletes.map((a, i) => [a.id, athleteColors[i % athleteColors.length]])),
    [availableAthletes]
  );

  // Dynamic power metrics that respond to W vs W/kg toggle
  const wkg = powerUnit === "w/kg";
  const toWkg = (watts: number, a: AthleteSummary) => a.weightKg ? Math.round((watts / a.weightKg) * 100) / 100 : 0;
  const fmtWkg = (v: number) => v.toFixed(2);
  const dynPowerCurveMetrics: CompareMetric[] = useMemo(() => wkg ? [
    { key: "pc0",   label: "5 sec",     unit: "w/kg", baseValue: (a) => toWkg(a.powerCurve[0]?.value ?? 0, a), getSeries: scaledPowerSeries(0), renderCurrent: (a) => `${fmtWkg(toWkg(a.powerCurve[0]?.value ?? 0, a))} w/kg` },
    { key: "pc1",   label: "30 sec",    unit: "w/kg", baseValue: (a) => toWkg(a.powerCurve[1]?.value ?? 0, a), getSeries: scaledPowerSeries(1), renderCurrent: (a) => `${fmtWkg(toWkg(a.powerCurve[1]?.value ?? 0, a))} w/kg` },
    { key: "pc2",   label: "1 min",     unit: "w/kg", baseValue: (a) => toWkg(a.powerCurve[2]?.value ?? 0, a), getSeries: scaledPowerSeries(2), renderCurrent: (a) => `${fmtWkg(toWkg(a.powerCurve[2]?.value ?? 0, a))} w/kg` },
    { key: "pc3",   label: "5 min",     unit: "w/kg", baseValue: (a) => toWkg(a.powerCurve[3]?.value ?? 0, a), getSeries: scaledPowerSeries(3), renderCurrent: (a) => `${fmtWkg(toWkg(a.powerCurve[3]?.value ?? 0, a))} w/kg` },
    { key: "pc4",   label: "30 min",    unit: "w/kg", baseValue: (a) => toWkg(a.powerCurve[4]?.value ?? 0, a), getSeries: scaledPowerSeries(4), renderCurrent: (a) => `${fmtWkg(toWkg(a.powerCurve[4]?.value ?? 0, a))} w/kg` },
    { key: "power", label: "Power max", unit: "w/kg", baseValue: (a) => toWkg(a.powerMax ?? 0, a),              getSeries: trendSeries("powerTrend"), renderCurrent: (a) => a.powerMax != null ? `${fmtWkg(toWkg(a.powerMax, a))} w/kg` : "N/A" },
  ] : powerCurveMetrics, [wkg]);
  const dynFitnessMetrics: CompareMetric[] = useMemo(() => wkg ? [
    { key: "ftp",     label: "FTP",     unit: "w/kg", baseValue: (a) => toWkg(a.ftp ?? 0, a), getSeries: trendSeries("ftpTrend"), renderCurrent: (a) => a.ftp != null ? `${fmtWkg(toWkg(a.ftp, a))} w/kg` : "N/A" },
    ...fitnessMetrics.slice(1), // VO2, TSS, TSB stay the same
  ] : fitnessMetrics, [wkg]);
  const dynPerfSections = useMemo(() => [
    { key: "power",   label: "Power Curve",  accentColor: "#e16b2b", metrics: dynPowerCurveMetrics },
    { key: "fitness", label: "Performance",  accentColor: "#d97706", metrics: dynFitnessMetrics },
    { key: "load",    label: "Load & Recovery", accentColor: "#2563eb", metrics: loadMetrics },
  ], [dynPowerCurveMetrics, dynFitnessMetrics]);

  const allTimeframeMetrics = section === "readiness"
    ? readinessMetrics
    : [...dynPowerCurveMetrics, ...dynFitnessMetrics, ...loadMetrics];
  const expandedMetric = allTimeframeMetrics.find(m => m.key === expandedMetricKey) ?? null;

  const toggleAthlete = (id: string) =>
    setSelectedIds(c => c.includes(id) ? c.filter(v => v !== id) : [...c, id]);

  // ── Content ────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (!selectedAthletes.length) {
      return (
        <div className="flex flex-col items-center justify-center bg-surface p-10 text-center">
          <p className="text-sm text-muted">No athletes selected</p>
          <button type="button"
            onClick={() => setSelectedIds(availableAthletes.slice(0, 4).map(a => a.id))}
            className="mt-4 rounded-md border border-brand/30 text-brand bg-brandSoft px-4 py-2 text-sm font-medium hover:bg-brand hover:text-white transition-colors duration-100">
            Select first athletes
          </button>
        </div>
      );
    }

    if (mode === "snapshot") {
      if (snapshotView === "table") {
        return (
          <div className="p-4 bg-canvas">
            {section === "readiness"
              ? <SnapshotTable athletes={selectedAthletes} metrics={readinessMetrics} window={snapshotWindow} colorMap={colorMap} />
              : <PerfSnapshotTable athletes={selectedAthletes} window={snapshotWindow} colorMap={colorMap} />
            }
          </div>
        );
      }
      if (section === "readiness") {
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 p-4 bg-canvas">
            {readinessMetrics.map(m => (
              <SnapshotBarChart key={m.key} title={m.label} athletes={selectedAthletes}
                metric={m} window={snapshotWindow} accentColor={accentColor} colorMap={colorMap} />
            ))}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 p-4 bg-canvas">
          <PowerHexagon athletes={selectedAthletes} window={snapshotWindow} colorMap={colorMap} powerUnit={powerUnit} onToggleUnit={() => setPowerUnit(u => u === "w" ? "w/kg" : "w")} />
          {perfSnapshotMetrics.map(m => (
            <SnapshotBarChart key={m.key} title={m.label} athletes={selectedAthletes}
              metric={m} window={snapshotWindow} accentColor={accentColor} colorMap={colorMap} />
          ))}
        </div>
      );
    }

    // helper: process pairs so the expanded card takes the full row and its neighbor drops below
    const renderMetricGrid = (
      metrics: CompareMetric[],
      accent: string,
      wrapperClass = "grid grid-cols-1 gap-4 lg:grid-cols-2 p-4 bg-canvas"
    ) => {
      const nodes: React.ReactNode[] = [];
      for (let i = 0; i < metrics.length; i += 2) {
        const left  = metrics[i];
        const right = metrics[i + 1] ?? null;
        const leftExp  = expandedMetric !== null && expandedMetric.key === left.key  && selectedAthletes.length > 0;
        const rightExp = expandedMetric !== null && right !== null && expandedMetric.key === right.key && selectedAthletes.length > 0;

        if (leftExp || rightExp) {
          const exp    = leftExp ? left  : right!;
          const other  = leftExp ? right : left;
          // expanded card spans full row; neighbor (if any) drops to next row naturally
          nodes.push(
            <div key={exp.key} ref={expandedPanelRef} className="lg:col-span-2">
              <MetricDetailPanel
                metric={exp} athletes={selectedAthletes}
                onClose={() => setExpanded(null)} timeframe={activeTimeframe} accentColor={accent} colorMap={colorMap} />
            </div>
          );
          if (other) {
            nodes.push(
              <CompareChart key={other.key} title={other.label} athletes={selectedAthletes}
                metric={other} accentColor={accent} timeframe={activeTimeframe}
                onSeeMore={m2 => setExpanded(m2.key)} colorMap={colorMap} />
            );
          }
        } else {
          nodes.push(
            <CompareChart key={left.key} title={left.label} athletes={selectedAthletes}
              metric={left} accentColor={accent} timeframe={activeTimeframe}
              onSeeMore={m2 => setExpanded(m2.key)} colorMap={colorMap} />
          );
          if (right) {
            nodes.push(
              <CompareChart key={right.key} title={right.label} athletes={selectedAthletes}
                metric={right} accentColor={accent} timeframe={activeTimeframe}
                onSeeMore={m2 => setExpanded(m2.key)} colorMap={colorMap} />
            );
          }
        }
      }
      return <div className={wrapperClass}>{nodes}</div>;
    };

    // TIMEFRAME
    if (section === "readiness") {
      return renderMetricGrid(readinessMetrics, accentColor);
    }
    return (
      <div className="bg-canvas pt-4">
        {/* Power Profile hexagon — always visible in timeframe view */}
        <div className="px-4 pb-4">
          <PowerHexagon athletes={selectedAthletes} window={snapshotWindow} colorMap={colorMap} powerUnit={powerUnit} onToggleUnit={() => setPowerUnit(u => u === "w" ? "w/kg" : "w")} />
        </div>
        {dynPerfSections.map(sec => {
          const isCollapsed = collapsedSections[sec.key];
          return (
            <div key={sec.key} className="mb-2">
              <button
                type="button"
                onClick={() => setCollapsedSections(c => ({ ...c, [sec.key]: !c[sec.key] }))}
                className="w-full flex items-center gap-3 mx-4 px-3 py-2.5 rounded-lg bg-surfaceStrong hover:bg-[#ebebea] transition-colors"
                style={{ width: "calc(100% - 2rem)" }}
              >
                <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: sec.accentColor }} />
                <span className="text-sm font-semibold text-ink">{sec.label}</span>
                <span className="ml-auto text-xs text-muted">{isCollapsed ? "▶" : "▼"}</span>
              </button>
              {!isCollapsed && renderMetricGrid(sec.metrics, sec.accentColor, "grid grid-cols-1 gap-4 lg:grid-cols-2 p-4")}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Snapshot range label for display ──────────────────────────────────────
  const snapRangeLabel = snapshotWindow.label;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="border border-line">

      {/* ── Photo header strip ── */}
      <ComparePhotoStrip title={section === "readiness" ? "Readiness & Recovery" : "Performance"} section={section} />

      {/* ── Control toolbar ── */}
      <div className="bg-surface border-b border-line px-4 py-3 space-y-3">

        {/* Row 1: Mode + View icon toggle */}
        <div className="flex items-center gap-4">
          {/* Mode segmented control */}
          <div className="inline-flex items-center bg-surfaceStrong rounded-md p-0.5 gap-0.5">
            {(["snapshot", "timeframe"] as const).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setExpanded(null); }}
                className={cn(
                  "px-3 py-1 text-sm rounded-[5px] transition-colors duration-100 font-medium",
                  mode === m ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink"
                )}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

        </div>

        {/* Row 2: Range */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-xs text-muted w-12 shrink-0 mt-1.5">Range</span>
          <div className="flex flex-wrap items-center gap-2">

            {/* Segmented options */}
            {/* Readiness snapshot: mode segmented + navigator */}
            {mode === "snapshot" && section === "readiness" ? (
              <div className="flex flex-col gap-2">
                {/* Aggregation mode segmented control */}
                <div className="inline-flex items-center bg-surfaceStrong rounded-md p-0.5 gap-0.5">
                  {(["day", "week-avg", "month-avg", "year-avg"] as const).map(rm => (
                    <button key={rm} type="button"
                      onClick={() => setSnapReadMode(rm)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-[5px] transition-colors duration-100 font-medium whitespace-nowrap",
                        snapReadMode === rm ? "bg-canvas text-blue shadow-sm" : "text-muted hover:text-ink"
                      )}>
                      {rm === "day" ? "Day" : rm === "week-avg" ? "Week avg" : rm === "month-avg" ? "Month avg" : "Year avg"}
                    </button>
                  ))}
                </div>
                {/* Navigator row */}
                <div className="flex items-center gap-2">
                  {snapReadMode === "day" && (
                    <>
                      <DateNavCell
                        label={snapshotWindow.label}
                        onPrev={() => setSnapDayOffset(o => o - 1)}
                        onNext={() => setSnapDayOffset(o => Math.min(0, o + 1))}
                        disableNext={snapDayOffset >= 0}
                      />
                      <label className="relative flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100 cursor-pointer">
                        <Calendar size={13} />
                        <input type="date" max={new Date().toISOString().slice(0, 10)}
                          value={(() => { const d = new Date(); d.setDate(d.getDate() + snapDayOffset); return d.toISOString().slice(0, 10); })()}
                          onChange={e => {
                            const diff = Math.round((new Date(e.target.value).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000);
                            setSnapDayOffset(Math.min(0, diff));
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                      </label>
                    </>
                  )}
                  {snapReadMode === "week-avg" && (
                    <>
                      <DateNavCell
                        label={snapshotWindow.label}
                        onPrev={() => setSnapWeekOffset(o => o - 1)}
                        onNext={() => setSnapWeekOffset(o => Math.min(0, o + 1))}
                        disableNext={snapWeekOffset >= 0}
                      />
                      <button type="button" onClick={() => setShowSnapPeriodPicker(true)}
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100">
                        <Calendar size={13} />
                      </button>
                    </>
                  )}
                  {snapReadMode === "month-avg" && (
                    <>
                      <DateNavCell
                        label={snapshotWindow.label}
                        onPrev={() => setSnapMonthOffset(o => o - 1)}
                        onNext={() => setSnapMonthOffset(o => Math.min(0, o + 1))}
                        disableNext={snapMonthOffset >= 0}
                      />
                      <button type="button" onClick={() => setShowSnapPeriodPicker(true)}
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100">
                        <Calendar size={13} />
                      </button>
                    </>
                  )}
                  {snapReadMode === "year-avg" && (
                    <DateNavCell
                      label={snapshotWindow.label}
                      onPrev={() => setSnapYearOffset(o => o - 1)}
                      onNext={() => setSnapYearOffset(o => Math.min(0, o + 1))}
                      disableNext={snapYearOffset >= 0}
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center bg-surfaceStrong rounded-md p-0.5 gap-0.5">
                  {mode === "snapshot"
                    ? (["2weeks", "monthly", "custom"] as const).map(p => (
                        <button key={p} type="button"
                          onClick={() => { setSnapPeriod(p); setSnapPeriodOffset(0); }}
                          className={cn(
                            "px-3 py-1 text-sm rounded-[5px] transition-colors duration-100 font-medium",
                            snapPeriod === p ? "bg-canvas text-blue shadow-sm" : "text-muted hover:text-ink"
                          )}>
                          {p === "2weeks" ? "2 weeks" : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))
                    : timeframeTypeOptions.map(type => (
                        <button key={type} type="button"
                          onClick={() => { setTimeframeType(type); setTimeframeOffset(0); setPerfPageOffset(0); if (type === "custom") setShowMonthPicker(true); }}
                          className={cn(
                            "px-3 py-1 text-sm rounded-[5px] transition-colors duration-100 font-medium",
                            timeframeType === type
                              ? section === "readiness" ? "bg-canvas text-blue shadow-sm" : "bg-canvas text-brand shadow-sm"
                              : "text-muted hover:text-ink"
                          )}>
                          {type === "biweekly" ? "Biweekly" : type === "monthly" ? "Monthly" : type === "yearly" ? "Yearly" : type === "week" ? "Week" : type === "month" ? "Month" : type === "year" ? "Year" : "Custom"}
                        </button>
                      ))
                  }
                </div>

                {/* Date navigator — performance snapshot + timeframe */}
                {mode === "snapshot" && snapPeriod !== "custom" && (
                  <DateNavCell label={snapRangeLabel}
                    onPrev={() => setSnapPeriodOffset(o => o - 1)}
                    onNext={() => setSnapPeriodOffset(o => Math.min(0, o + 1))}
                    disableNext={snapPeriodOffset >= 0} />
                )}
                {mode === "snapshot" && snapPeriod === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">From</span>
                    <DateNavCell label={(() => { const d = new Date(); d.setDate(d.getDate() + snapCustomStart); return `${String(d.getDate()).padStart(2,"0")} ${MONTH_NAMES[d.getMonth()]}`; })()}
                      onPrev={() => setSnapCustomStart(s => s - 1)}
                      onNext={() => setSnapCustomStart(s => Math.min(snapCustomEnd - 1, s + 1))}
                      disableNext={snapCustomStart >= snapCustomEnd - 1} />
                    <span className="text-xs text-muted">to</span>
                    <DateNavCell label={(() => { const d = new Date(); d.setDate(d.getDate() + snapCustomEnd); return `${String(d.getDate()).padStart(2,"0")} ${MONTH_NAMES[d.getMonth()]}`; })()}
                      onPrev={() => setSnapCustomEnd(e => Math.max(snapCustomStart + 1, e - 1))}
                      onNext={() => setSnapCustomEnd(e => Math.min(0, e + 1))}
                      disableNext={snapCustomEnd >= 0} />
                  </div>
                )}
              </>
            )}
            {mode === "timeframe" && section === "readiness" && (
              <div className="flex items-center gap-2">
                <DateNavCell label={periodInfo?.label ?? ""}
                  onPrev={() => setTimeframeOffset(o => o - 1)}
                  onNext={() => setTimeframeOffset(o => Math.min(0, o + 1))}
                  disableNext={timeframeOffset >= 0} />
                <button type="button" onClick={() => setShowPeriodPicker(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100">
                  <Calendar size={13} />
                </button>
              </div>
            )}
            {mode === "timeframe" && section === "performance" && (timeframeType === "biweekly" || timeframeType === "monthly") && (
              <DateNavCell
                label={perfPageInfo?.periodLabel ?? ""}
                onPrev={() => setPerfPageOffset(o => o - 1)}
                onNext={() => setPerfPageOffset(o => Math.min(0, o + 1))}
                disableNext={perfPageOffset >= 0}
              />
            )}

            {/* Custom month label — click to re-open picker */}
            {mode === "timeframe" && section === "performance" && timeframeType === "custom" && (
              <button type="button" onClick={() => setShowMonthPicker(true)}
                className="inline-flex items-center gap-1.5 border border-brand/30 bg-brandSoft text-brand rounded-md px-3 py-1 text-sm font-medium hover:bg-brand/10 transition-colors duration-100">
                <Calendar size={13} />
                {selectedMonths.length} month{selectedMonths.length !== 1 ? "s" : ""} selected
              </button>
            )}

          </div>
        </div>

        {/* Row 3: Athletes + Flagged + View toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted w-12 shrink-0">Athletes</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {availableAthletes.map((athlete, i) => {
              const selected = selectedIds.includes(athlete.id);
              const color = athleteColors[i % athleteColors.length];
              return (
                <button key={athlete.id} type="button" onClick={() => toggleAthlete(athlete.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors duration-100 border",
                    selected
                      ? "border-line bg-canvas text-ink shadow-sm"
                      : "border-transparent text-muted hover:text-ink hover:bg-surfaceStrong"
                  )}>
                  <span className="w-2 h-2 rounded-sm shrink-0 transition-opacity"
                    style={{ backgroundColor: color, opacity: selected ? 1 : 0.3 }} />
                  {athlete.name.split(" ")[0]}
                </button>
              );
            })}
            <button type="button" onClick={() => setSelectedIds(availableAthletes.map(a => a.id))}
              className="rounded-md px-2.5 py-1 text-sm text-brand font-medium hover:bg-brandSoft transition-colors duration-100">
              + All
            </button>
            <div className="w-px h-4 bg-line mx-0.5" />
            <button type="button" onClick={() => setFlaggedOnly(c => !c)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors duration-100",
                flaggedOnly ? "bg-dangerSoft text-danger" : "text-muted hover:text-ink hover:bg-surfaceStrong"
              )}>
              <span className="text-[10px]">{flaggedOnly ? "●" : "○"}</span>
              Flagged
            </button>
          </div>

          {/* View toggle — snapshot only, pinned to right */}
          {mode === "snapshot" && (
            <div className="ml-auto inline-flex items-center bg-surfaceStrong border border-line rounded-lg p-0.5 gap-0.5">
              <button type="button"
                onClick={() => setSnapshotView("bar")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-100",
                  snapshotView === "bar" ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink"
                )}>
                <BarChart2 size={14} />
                Charts
              </button>
              <button type="button"
                onClick={() => setSnapshotView("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-100",
                  snapshotView === "table" ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink"
                )}>
                <Table size={14} />
                Table
              </button>
            </div>
          )}
        </div>

      </div>
      {/* ── end control strip ── */}

      {renderContent()}

      {/* Month picker modal (custom performance month compare) */}
      {showMonthPicker && (
        <MonthPickerModal
          value={selectedMonths}
          onChange={months => setSelectedMonths(months)}
          onClose={() => setShowMonthPicker(false)}
        />
      )}

      {/* Timeframe period pickers (readiness) */}
      {showPeriodPicker && section === "readiness" && timeframeType === "week" && (
        <WeekPickerModal
          timeframeOffset={timeframeOffset}
          onSelect={setTimeframeOffset}
          onClose={() => setShowPeriodPicker(false)}
        />
      )}
      {showPeriodPicker && section === "readiness" && timeframeType === "month" && (
        <MonthYearPickerModal
          timeframeOffset={timeframeOffset}
          onSelect={setTimeframeOffset}
          onClose={() => setShowPeriodPicker(false)}
        />
      )}
      {showPeriodPicker && section === "readiness" && timeframeType === "year" && (
        <YearPickerPanel
          timeframeOffset={timeframeOffset}
          onSelect={setTimeframeOffset}
          onClose={() => setShowPeriodPicker(false)}
        />
      )}

      {/* Snapshot period pickers (readiness avg modes) */}
      {showSnapPeriodPicker && section === "readiness" && snapReadMode === "week-avg" && (
        <WeekPickerModal
          timeframeOffset={snapWeekOffset}
          onSelect={setSnapWeekOffset}
          onClose={() => setShowSnapPeriodPicker(false)}
        />
      )}
      {showSnapPeriodPicker && section === "readiness" && snapReadMode === "month-avg" && (
        <MonthYearPickerModal
          timeframeOffset={snapMonthOffset}
          onSelect={setSnapMonthOffset}
          onClose={() => setShowSnapPeriodPicker(false)}
        />
      )}
    </div>
  );
}
