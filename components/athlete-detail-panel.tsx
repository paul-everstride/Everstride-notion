"use client";

import { useState, useMemo } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Calendar } from "lucide-react";
import type { AthleteSummary, TrendPoint } from "@/lib/types";
import { cn, formatSleepDuration, formatSignedNumber, formatWeight } from "@/lib/utils";

// ── Null-safe display helper ─────────────────────────────────────────────────

const na = (v: number | null | undefined, fmt: (n: number) => string = (n) => String(n)) =>
  v == null ? "N/A" : fmt(v);

// ── Deterministic helpers ────────────────────────────────────────────────────

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967295; };
}
function genTrend(seed: number, base: number, labels: string[], variance = 0.07): TrendPoint[] {
  const rng = lcg(seed);
  let val = base;
  return labels.map(label => {
    val += (rng() - 0.5) * base * variance;
    val = Math.max(base * 0.72, Math.min(base * 1.28, val));
    return { label, value: Math.round(val * 10) / 10 };
  });
}

/** TSB-specific: signed trend that can cross zero, drifts around a center value */
function genTsbTrend(seed: number, center: number, labels: string[], swing = 12): TrendPoint[] {
  const rng = lcg(seed);
  let val = center;
  return labels.map(label => {
    val += (rng() - 0.5) * swing;
    val += (center - val) * 0.12; // mean-revert toward center
    return { label, value: Math.round(val * 10) / 10 };
  });
}

// ── Label builders ───────────────────────────────────────────────────────────

const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function getTimeframeInfo(tf: string, cStart: string, cEnd: string): { labels: string[]; seed: string } {
  const now = new Date();
  if (tf === "7d") {
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - 6 + i);
      return `${d.getDate()} ${MS[d.getMonth()]}`;
    });
    return { labels, seed: "7d" };
  }
  if (tf === "30d") {
    const labels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - 29 + i);
      return (i % 7 === 0 || i === 29) ? `${d.getDate()} ${MS[d.getMonth()]}` : "";
    });
    return { labels, seed: "30d" };
  }
  if (tf === "3m") {
    const labels = Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - 12 * 7 + i * 7);
      return `${d.getDate()} ${MS[d.getMonth()]}`;
    });
    return { labels, seed: "3m" };
  }
  if (tf === "6m") {
    const labels = Array.from({ length: 26 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - 25 * 7 + i * 7);
      return i % 2 === 0 ? `${d.getDate()} ${MS[d.getMonth()]}` : "";
    });
    return { labels, seed: "6m" };
  }
  if (tf === "1y") {
    const labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return MS[d.getMonth()];
    });
    return { labels, seed: "1y" };
  }
  // custom
  const start = new Date(cStart), end = new Date(cEnd);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const pts = Math.min(30, Math.max(7, Math.floor(days / 3)));
  const step = Math.max(1, Math.floor(days / (pts - 1)));
  const labels: string[] = [];
  for (let i = 0; i < pts; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i * step);
    if (d <= end) labels.push(`${d.getDate()} ${MS[d.getMonth()]}`);
  }
  return { labels, seed: `${cStart}${cEnd}` };
}

// ── Chart helpers ────────────────────────────────────────────────────────────

function domain(data: TrendPoint[]): [number, number] {
  const vals = data.map(d => d.value);
  if (!vals.length) return [0, 100];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const range = mx - mn;
  const pad = range < 1 ? Math.max(mx * 0.2, 5) : range * 0.18;
  return [Math.floor(mn - pad), Math.ceil(mx + pad)];
}
function tfmt(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}
const TS = { border: "1px solid #e9e9e7", background: "#ffffff", color: "#37352f", fontSize: 12, fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "6px 10px", borderRadius: "6px" };
const TL = { color: "#9b9a97", fontSize: 10 };

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricPill({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-[120px] flex flex-col gap-0.5 px-4 py-3 border-r border-line last:border-r-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-semibold tabular text-ink leading-tight" style={accent ? { color: accent } : undefined}>{value}</span>
      {sub && <span className="text-[11px] text-muted leading-snug">{sub}</span>}
    </div>
  );
}

function SectionChart({ title, data, color, height = 200, sub }: { title: string; data: TrendPoint[]; color: string; height?: number; sub?: string }) {
  const dm = domain(data);
  const avg = data.length ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;
  const latest = data[data.length - 1]?.value ?? 0;
  const gid = `adg-${color.replace("#", "")}-${title.replace(/\s/g, "")}`;
  return (
    <div className="border border-line rounded-lg bg-canvas overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div>
          <span className="text-sm font-medium text-ink">{title}</span>
          {sub && <span className="text-xs text-muted ml-2">{sub}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-muted">Now <span className="font-semibold text-ink ml-0.5">{tfmt(latest)}</span></span>
          <span className="text-[10px] text-muted">Avg <span className="ml-0.5">{tfmt(Math.round(avg))}</span></span>
          <span className="text-[10px] text-muted">Max <span className="ml-0.5">{tfmt(Math.max(...data.map(d => d.value)))}</span></span>
        </div>
      </div>
      <div style={{ height }} className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e9e9e7" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} />
            <YAxis domain={dm} tickFormatter={tfmt} tickCount={4} tickLine={false} axisLine={false} tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }} width={32} />
            <ReferenceLine y={avg} stroke={color} strokeOpacity={0.2} strokeDasharray="4 3" strokeWidth={1} />
            <Tooltip contentStyle={TS} labelStyle={TL} formatter={(v: number) => [tfmt(v), ""]} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gid})`}
              dot={{ r: 2.5, fill: color, stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 4, fill: color, stroke: "#ffffff", strokeWidth: 1.5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

type Tab = "readiness" | "performance" | "load" | "power" | "profile";
type TF  = "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

export function AthleteDetailPanel({ athlete }: { athlete: AthleteSummary }) {
  const todayStr   = new Date().toISOString().slice(0, 10);
  const thirtyAgo  = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [tab,         setTab]         = useState<Tab>("readiness");
  const [dayOffset,   setDayOffset]   = useState(0);
  const [timeframe,   setTimeframe]   = useState<TF>("30d");
  const [customStart, setCustomStart] = useState(thirtyAgo);
  const [customEnd,   setCustomEnd]   = useState(todayStr);

  // ── Day label ──
  const dayLabel = useMemo(() => {
    if (dayOffset === 0) return "Today";
    if (dayOffset === -1) return "Yesterday";
    const d = new Date(); d.setDate(d.getDate() + dayOffset);
    return `${String(d.getDate()).padStart(2, "0")} ${MN[d.getMonth()]}`;
  }, [dayOffset]);

  // ── Trend data for current timeframe ──
  const trendData = useMemo(() => {
    const { labels, seed } = getTimeframeInfo(timeframe, customStart, customEnd);
    const g = (base: number | null, key: string, v = 0.08) =>
      base != null ? genTrend(strHash(athlete.id + key + seed), base, labels, v) : null;
    return {
      labels,
      recovery: g(athlete.recoveryScore, "rec",    0.07),
      sleep:    g(athlete.sleepScore,    "slp",    0.07),
      hrv:      g(athlete.hrv,           "hrv",    0.09),
      rhr:      g(athlete.restHr,        "rhr",    0.05),
      spo2:     g(athlete.spo2,          "spo2",   0.02),
      sleepEff: g(athlete.sleepEfficiency,"slpeff",0.06),
      ftp:      g(athlete.ftp,           "ftp",    0.06),
      vo2:      g(athlete.vo2Max,        "vo2",    0.05),
      power:    g(athlete.powerMax,      "power",  0.08),
      tss:      g(athlete.tss,           "tss",    0.12),
      atl:      g(athlete.atl,           "atl",    0.08),
      ctl:      g(athlete.ctl,           "ctl",    0.05),
      tsb:      athlete.tsb != null ? genTsbTrend(strHash(athlete.id + "tsb" + seed), athlete.tsb, labels) : null,
    };
  }, [athlete, timeframe, customStart, customEnd]);

  // ── Daily snapshot values ──
  const dayVals = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + dayOffset);
    const s = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const val = (base: number | null, key: string): number | null => {
      if (base == null) return null;
      const rng = lcg(strHash(athlete.id + key + "snap" + s));
      return base + (rng() - 0.5) * base * 0.18;
    };
    return {
      recovery: athlete.recoveryScore != null ? Math.round(val(athlete.recoveryScore, "rec")!) : null,
      hrv:      athlete.hrv != null ? Math.round(val(athlete.hrv, "hrv")! * 10) / 10 : null,
      sleep:    Math.round(val(athlete.sleepScore, "slp")!),
      rhr:      athlete.restHr != null ? Math.round(val(athlete.restHr, "rhr")!) : null,
      spo2:     athlete.spo2 != null ? Math.round(val(athlete.spo2, "spo2")! * 10) / 10 : null,
      resp:     athlete.respirationRate != null ? Math.round(val(athlete.respirationRate, "resp")! * 10) / 10 : null,
    };
  }, [athlete, dayOffset]);

  // ── Sleep breakdown ──
  const total = athlete.totalBedMs || 1;
  const deepPct   = Math.round(athlete.totalSlowWaveMs / total * 100);
  const remPct    = Math.round(athlete.totalRemMs       / total * 100);
  const lightPct  = Math.round(athlete.totalLightMs     / total * 100);
  const awakePct  = Math.max(0, 100 - deepPct - remPct - lightPct);

  const TF_OPTS: { key: TF; label: string }[] = [
    { key: "7d",     label: "7 days" },
    { key: "30d",    label: "30 days" },
    { key: "3m",     label: "3 months" },
    { key: "6m",     label: "6 months" },
    { key: "1y",     label: "1 year" },
    { key: "custom", label: "Custom" },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: "readiness",   label: "Readiness" },
    { key: "performance", label: "Performance" },
    { key: "load",        label: "Training Load" },
    { key: "power",       label: "Power" },
    { key: "profile",     label: "Profile" },
  ];

  // ── Shared controls ──
  const TimeframeBar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center bg-surfaceStrong rounded-md p-0.5 gap-0.5">
        {TF_OPTS.map(o => (
          <button key={o.key} type="button" onClick={() => setTimeframe(o.key)}
            className={cn("px-3 py-1 text-sm rounded-[5px] transition-colors duration-100 font-medium",
              timeframe === o.key ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink")}>
            {o.label}
          </button>
        ))}
      </div>
      {timeframe === "custom" && (
        <div className="inline-flex items-center gap-2 border border-line rounded-md px-3 py-1.5 bg-canvas">
          <span className="text-xs text-muted">From</span>
          <input type="date" value={customStart} max={customEnd}
            onChange={e => setCustomStart(e.target.value)}
            className="text-sm text-ink bg-transparent outline-none" />
          <span className="text-xs text-muted">to</span>
          <input type="date" value={customEnd} min={customStart} max={todayStr}
            onChange={e => setCustomEnd(e.target.value)}
            className="text-sm text-ink bg-transparent outline-none" />
        </div>
      )}
    </div>
  );

  const DayNav = () => (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center border border-line rounded-md overflow-hidden">
        <button type="button" onClick={() => setDayOffset(o => o - 1)}
          className="px-2 py-1.5 text-xs text-muted hover:text-ink hover:bg-surfaceStrong border-r border-line transition-colors">‹</button>
        <span className="px-3 py-1.5 text-sm text-ink whitespace-nowrap">{dayLabel}</span>
        <button type="button" onClick={() => setDayOffset(o => Math.min(0, o + 1))} disabled={dayOffset >= 0}
          className={cn("px-2 py-1.5 text-xs border-l border-line transition-colors",
            dayOffset >= 0 ? "text-muted opacity-30 cursor-not-allowed" : "text-muted hover:text-ink hover:bg-surfaceStrong")}>›</button>
      </div>
      <label className="relative flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors cursor-pointer">
        <Calendar size={13} />
        <input type="date" max={todayStr}
          value={(() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return d.toISOString().slice(0,10); })()}
          onChange={e => {
            const diff = Math.round((new Date(e.target.value).getTime() - new Date(todayStr).getTime()) / 86400000);
            setDayOffset(Math.min(0, diff));
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </label>
    </div>
  );

  const SectionHeader = ({ title, sub, controls }: { title: string; sub?: string; controls?: React.ReactNode }) => (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {controls}
    </div>
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-line bg-canvas px-6">
        <div className="flex -mb-px">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-100 whitespace-nowrap",
                tab === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── READINESS ── */}
      {tab === "readiness" && (
        <div className="px-6 py-5 space-y-5">
          <SectionHeader title="Daily Readiness" sub="Wearable sync · morning calculation" controls={<DayNav />} />

          {/* Metrics strip */}
          <div className="border border-line rounded-lg overflow-hidden">
            <div className="flex flex-wrap divide-x divide-line bg-canvas">
              <MetricPill label="Recovery"
                value={dayVals.recovery != null ? String(dayVals.recovery) : "N/A"}
                accent={dayVals.recovery != null ? (dayVals.recovery >= 70 ? "#059669" : dayVals.recovery >= 50 ? "#d97706" : "#dc2626") : undefined}
                sub={athlete.statusNote} />
              <MetricPill label="HRV" value={dayVals.hrv != null ? `${dayVals.hrv} ms` : "N/A"} sub="Overnight avg" />
              <MetricPill label="Sleep score" value={`${dayVals.sleep}`} sub={`Eff ${athlete.sleepEfficiency}%`} />
              <MetricPill label="Resting HR" value={dayVals.rhr != null ? `${dayVals.rhr} bpm` : "N/A"} sub="Overnight avg" />
              <MetricPill label="SpO₂" value={dayVals.spo2 != null ? `${dayVals.spo2}%` : "N/A"} sub="Overnight" />
              <MetricPill label="Resp rate" value={dayVals.resp != null ? `${dayVals.resp} rpm` : "N/A"} sub="Overnight" />
            </div>
          </div>

          {/* Sleep breakdown */}
          <div className="border border-line rounded-lg overflow-hidden bg-canvas">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium text-ink">Sleep breakdown</span>
              <span className="text-xs text-muted">{formatSleepDuration(athlete.totalBedMs)} in bed</span>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex rounded-full overflow-hidden h-3 gap-px bg-line">
                <div style={{ width: `${deepPct}%`,  backgroundColor: "#3b82f6" }} />
                <div style={{ width: `${remPct}%`,   backgroundColor: "#8b5cf6" }} />
                <div style={{ width: `${lightPct}%`, backgroundColor: "#93c5fd" }} />
                <div style={{ width: `${awakePct}%`, backgroundColor: "#d1d5db" }} />
              </div>
              <div className="flex flex-wrap gap-5">
                {[
                  { label: "Deep",  pct: deepPct,  ms: athlete.totalSlowWaveMs, color: "#3b82f6" },
                  { label: "REM",   pct: remPct,   ms: athlete.totalRemMs,      color: "#8b5cf6" },
                  { label: "Light", pct: lightPct, ms: athlete.totalLightMs,    color: "#93c5fd" },
                  { label: "Awake", pct: awakePct, ms: athlete.totalAwakeMs,    color: "#d1d5db" },
                ].map(({ label, pct, ms, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-medium text-ink">{formatSleepDuration(ms)}</span>
                    <span className="text-xs text-muted">({pct}%)</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: "Efficiency",   value: `${athlete.sleepEfficiency}%` },
                  { label: "Consistency",  value: `${athlete.sleepConsistency}%` },
                  { label: "Skin temp Δ",  value: athlete.skinTemp != null ? `${athlete.skinTemp > 0 ? "+" : ""}${athlete.skinTemp.toFixed(1)}°C` : "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface rounded-md px-3 py-2">
                    <p className="text-[10px] text-muted">{label}</p>
                    <p className="text-sm font-semibold text-ink mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trends */}
          <SectionHeader title="Readiness trends" sub="Historical view" controls={<TimeframeBar />} />
          <div className="grid gap-4 lg:grid-cols-2">
            {trendData.recovery && <SectionChart title="Recovery score"   data={trendData.recovery} color="#e16b2b" />}
            {trendData.sleep    && <SectionChart title="Sleep score"      data={trendData.sleep}    color="#3b82f6" />}
            {trendData.hrv ? (
              <SectionChart title="HRV" data={trendData.hrv} color="#059669" sub="ms" />
            ) : (
              <div className="border border-line rounded-lg bg-canvas px-4 py-6 flex items-center justify-center">
                <p className="text-sm text-muted">N/A — HRV data not yet available from this device</p>
              </div>
            )}
            {trendData.rhr ? (
              <SectionChart title="Resting HR" data={trendData.rhr} color="#d97706" sub="bpm" />
            ) : (
              <div className="border border-line rounded-lg bg-canvas px-4 py-6 flex items-center justify-center">
                <p className="text-sm text-muted">N/A — Resting HR data not yet available from this device</p>
              </div>
            )}
            {trendData.spo2     && <SectionChart title="SpO₂"             data={trendData.spo2}     color="#8b5cf6" sub="%" />}
            {trendData.sleepEff && <SectionChart title="Sleep efficiency"  data={trendData.sleepEff} color="#06b6d4" sub="%" />}
          </div>
        </div>
      )}

      {/* ── PERFORMANCE ── */}
      {tab === "performance" && (
        <div className="px-6 py-5 space-y-5">
          <SectionHeader title="Performance" sub="FTP · VO2 max · Power" />
          <div className="border border-line rounded-lg bg-canvas px-6 py-8 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-medium text-ink">Performance metrics not available</p>
            <p className="text-sm text-muted max-w-md">
              Performance metrics (FTP, VO2 max, power) require a power meter connection. Coming soon.
            </p>
          </div>
        </div>
      )}

      {/* ── TRAINING LOAD ── */}
      {tab === "load" && (
        <div className="px-6 py-5 space-y-5">
          <SectionHeader title="Training Load" sub="ATL · CTL · TSB · form" />
          <div className="border border-line rounded-lg bg-canvas px-6 py-8 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-medium text-ink">Training load metrics not available</p>
            <p className="text-sm text-muted max-w-md">
              Training load metrics require recovery score data. Coming soon.
            </p>
          </div>
        </div>
      )}

      {/* ── POWER ── */}
      {tab === "power" && (
        <div className="px-6 py-5 space-y-5">
          <SectionHeader title="Power Profile" sub="Curve · hexagon · trend" />
          <div className="border border-line rounded-lg bg-canvas px-6 py-8 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-sm font-medium text-ink">Power data not available</p>
            <p className="text-sm text-muted max-w-md">
              Power data requires a power meter. Coming soon.
            </p>
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === "profile" && (
        <div className="px-6 py-5 space-y-5">
          <h2 className="text-sm font-semibold text-ink">Athlete Profile</h2>

          {[
            {
              title: "Personal",
              rows: [
                { label: "Full name",  value: athlete.name },
                { label: "Email",      value: athlete.email },
                { label: "Team",       value: athlete.team },
                { label: "Age",        value: athlete.age != null ? String(athlete.age) : "N/A" },
                { label: "Weight",     value: formatWeight(athlete.weightKg) },
                { label: "Height",     value: athlete.heightCm != null ? `${athlete.heightCm} cm` : "N/A" },
              ],
            },
            {
              title: "Sleep & Biometrics",
              rows: [
                { label: "Sleep efficiency",   value: `${athlete.sleepEfficiency}%` },
                { label: "Sleep consistency",  value: `${athlete.sleepConsistency}%` },
                { label: "REM sleep",          value: formatSleepDuration(athlete.totalRemMs) },
                { label: "Deep sleep",         value: formatSleepDuration(athlete.totalSlowWaveMs) },
                { label: "Light sleep",        value: formatSleepDuration(athlete.totalLightMs) },
                { label: "SpO₂",               value: athlete.spo2 != null ? `${athlete.spo2}%` : "N/A" },
                { label: "Resp rate",          value: na(athlete.respirationRate, n => `${n} rpm`) },
                { label: "Skin temp Δ",        value: athlete.skinTemp != null ? `${athlete.skinTemp > 0 ? "+" : ""}${athlete.skinTemp.toFixed(1)}°C` : "N/A" },
              ],
            },
            {
              title: "Performance baseline",
              rows: [
                { label: "FTP",       value: athlete.ftp != null ? `${athlete.ftp}w` : "N/A" },
                { label: "VO2 max",   value: athlete.vo2Max != null ? `${athlete.vo2Max} ml/kg/min` : "N/A" },
                { label: "Power max", value: athlete.powerMax != null ? `${athlete.powerMax}w` : "N/A" },
                { label: "TSS",       value: athlete.tss != null ? String(athlete.tss) : "N/A" },
                { label: "ATL",       value: athlete.atl != null ? String(athlete.atl) : "N/A" },
                { label: "CTL",       value: athlete.ctl != null ? String(athlete.ctl) : "N/A" },
                { label: "TSB",       value: athlete.tsb != null ? formatSignedNumber(athlete.tsb) : "N/A" },
              ],
            },
          ].map(section => (
            <div key={section.title} className="border border-line rounded-lg overflow-hidden bg-canvas">
              <div className="border-b border-line px-4 py-2.5 bg-surface">
                <span className="text-xs font-semibold text-muted uppercase tracking-wide">{section.title}</span>
              </div>
              <div className="divide-y divide-line">
                {section.rows.map(({ label, value }) => (
                  <div key={label} className="flex items-center px-4 py-3 hover:bg-surface/60 transition-colors">
                    <span className="text-sm text-muted w-44 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
