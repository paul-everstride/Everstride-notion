"use client";

import { useState, useMemo, useRef } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Calendar, SlidersHorizontal, X } from "lucide-react";
import type { AthleteSummary, RecoveryHistoryDay, TrendPoint } from "@/lib/types";
import { cn, formatSleepDuration, formatSignedNumber, formatWeight, getRecoveryTone } from "@/lib/utils";
import { AthleteHeroStrip } from "@/components/photo-accents";

// ── Detail table column config ────────────────────────────────────────────────

type DetailColKey = "date" | "recovery" | "hrv" | "rhr" | "spo2" | "skinTemp" | "sleepScore" | "sleepEfficiency" | "sleepDuration" | "sleepDeep" | "sleepRem";

const DETAIL_COL_DEFS: Array<{ key: DetailColKey; label: string; header: string }> = [
  { key: "date",            label: "Date",             header: "Date"         },
  { key: "recovery",        label: "Recovery",         header: "Recovery"     },
  { key: "hrv",             label: "HRV (ms)",         header: "HRV (ms)"     },
  { key: "rhr",             label: "Resting HR",       header: "Resting HR"   },
  { key: "spo2",            label: "SpO₂",             header: "SpO₂"         },
  { key: "skinTemp",        label: "Skin Temp",        header: "Skin Temp"    },
  { key: "sleepScore",      label: "Sleep Score",      header: "Sleep Score"  },
  { key: "sleepEfficiency", label: "Sleep Efficiency", header: "Sleep Eff."   },
  { key: "sleepDuration",   label: "Sleep Duration",   header: "Sleep Dur."   },
  { key: "sleepDeep",       label: "Deep Sleep",       header: "Deep"         },
  { key: "sleepRem",        label: "REM Sleep",        header: "REM"          },
];

const DEFAULT_DETAIL_COLS: DetailColKey[] = ["date", "recovery", "hrv", "rhr", "spo2", "skinTemp"];

function renderDetailCell(key: DetailColKey, day: RecoveryHistoryDay): React.ReactNode {
  const tone = day.recoveryScore != null ? getRecoveryTone(day.recoveryScore) : null;
  const recColor = tone === "success" ? "#059669" : tone === "warning" ? "#d97706" : tone === "danger" ? "#dc2626" : undefined;
  switch (key) {
    case "date":
      return <span className="text-muted whitespace-nowrap">{day.label}</span>;
    case "recovery":
      return day.recoveryScore != null
        ? <span style={{ color: recColor }} className="font-semibold">{day.recoveryScore}%</span>
        : <span className="text-muted">—</span>;
    case "hrv":
      return day.hrv != null ? day.hrv : <span className="text-muted">—</span>;
    case "rhr":
      return day.restHr != null ? `${day.restHr} bpm` : <span className="text-muted">—</span>;
    case "spo2":
      return day.spo2 != null ? `${day.spo2}%` : <span className="text-muted">—</span>;
    case "skinTemp":
      return day.skinTempC != null ? `${day.skinTempC}°C` : <span className="text-muted">—</span>;
    case "sleepScore":
      return day.sleepScore != null ? day.sleepScore : <span className="text-muted">—</span>;
    case "sleepEfficiency":
      return day.sleepEfficiency != null ? `${day.sleepEfficiency}%` : <span className="text-muted">—</span>;
    case "sleepDuration":
      return day.sleepDurationMins != null
        ? `${Math.floor(day.sleepDurationMins / 60)}h ${day.sleepDurationMins % 60}m`
        : <span className="text-muted">—</span>;
    case "sleepDeep":
      return day.sleepDeepMins != null ? `${day.sleepDeepMins}m` : <span className="text-muted">—</span>;
    case "sleepRem":
      return day.sleepRemMins != null ? `${day.sleepRemMins}m` : <span className="text-muted">—</span>;
  }
}

// ── Detail column editor panel ────────────────────────────────────────────────

function DetailColEditorPanel({
  colOrder, onReorder, onClose,
}: {
  colOrder: DetailColKey[];
  onReorder: (next: DetailColKey[]) => void;
  onClose: () => void;
}) {
  const dragKey = useRef<DetailColKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<DetailColKey | null>(null);

  const isActive = (key: DetailColKey) => colOrder.includes(key);
  const locked   = (key: DetailColKey) => key === "date";

  const toggleKey = (key: DetailColKey) => {
    if (locked(key)) return;
    if (colOrder.includes(key)) {
      onReorder(colOrder.filter(k => k !== key));
    } else {
      onReorder([...colOrder, key]);
    }
  };

  const handleDrop = (targetKey: DetailColKey) => {
    setDragOverKey(null);
    const src = dragKey.current;
    if (!src || src === targetKey) return;
    if (!colOrder.includes(src) || !colOrder.includes(targetKey)) return;
    const next = [...colOrder];
    const fromIdx = next.indexOf(src);
    const toIdx   = next.indexOf(targetKey);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, src);
    onReorder(next);
    dragKey.current = null;
  };

  const activeItems   = colOrder.map(k => DETAIL_COL_DEFS.find(d => d.key === k)!).filter(Boolean);
  const inactiveItems = DETAIL_COL_DEFS.filter(d => !colOrder.includes(d.key));
  const sortedItems   = [...activeItems, ...inactiveItems];

  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-72 border-l border-line bg-canvas shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div>
            <p className="text-xs text-muted mb-0.5">Configure</p>
            <h3 className="text-sm font-semibold text-ink">Table columns</h3>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {sortedItems.map(item => {
            const active = isActive(item.key);
            const isLocked = locked(item.key);
            return (
              <div
                key={item.key}
                draggable={active && !isLocked}
                onDragStart={() => { dragKey.current = item.key; }}
                onDragEnter={() => setDragOverKey(item.key)}
                onDragOver={e => { e.preventDefault(); }}
                onDragEnd={() => { setDragOverKey(null); dragKey.current = null; }}
                onDrop={() => handleDrop(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-2 text-left text-sm rounded-md border transition-colors duration-100",
                  dragOverKey === item.key && active && !isLocked ? "border-t-2 border-t-brand" : "",
                  active
                    ? "border-brand/20 bg-brandSoft text-ink"
                    : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong"
                )}>
                <span
                  className={cn(
                    "text-muted/40 cursor-grab select-none text-base leading-none shrink-0",
                    (!active || isLocked) && "invisible"
                  )}
                  title="Drag to reorder">
                  ⠿
                </span>
                <span className="flex-1">{item.label}</span>
                {isLocked ? (
                  <span className="text-xs ml-2 font-medium text-muted/40">Locked</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleKey(item.key)}
                    className={cn("text-xs ml-2 font-medium shrink-0", active ? "text-brand" : "text-muted/50")}>
                    {active ? "On" : "Off"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5 bg-surface flex items-center justify-between">
          <span className="text-xs text-muted">{colOrder.length} columns visible</span>
          <button type="button" onClick={onClose} className="text-sm font-medium text-brand hover:text-brandInk transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Null-safe display helper ─────────────────────────────────────────────────

const na = (v: number | null | undefined, fmt: (n: number) => string = (n) => String(n)) =>
  v == null ? "N/A" : fmt(v);

// ── Label helpers ────────────────────────────────────────────────────────────

const MN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

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

function SectionChart({ title, data, color, height = 200, sub, tickInterval = 0 }: {
  title: string; data: TrendPoint[]; color: string; height?: number; sub?: string; tickInterval?: number;
}) {
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
            <XAxis
              dataKey="label"
              interval={tickInterval}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
            />
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

type Tab   = "readiness" | "recovery" | "performance" | "load" | "power" | "profile";
type TF    = "7d" | "30d" | "3m" | "6m" | "1y" | "custom";
type RecTF = "7d" | "30d" | "90d" | "365d" | "all";

export function AthleteDetailPanel({ athlete }: { athlete: AthleteSummary }) {
  const todayStr   = new Date().toISOString().slice(0, 10);
  const thirtyAgo  = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [tab,          setTab]          = useState<Tab>("readiness");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [detailColOrder, setDetailColOrder] = useState<DetailColKey[]>(DEFAULT_DETAIL_COLS);
  const [showDetailColEditor, setShowDetailColEditor] = useState(false);
  const [timeframe,    setTimeframe]    = useState<TF>("30d");
  const [recTf,        setRecTf]        = useState<RecTF>("all");
  const [recTablePage, setRecTablePage] = useState(0);
  const [customStart,  setCustomStart]  = useState(thirtyAgo);
  const [customEnd,    setCustomEnd]    = useState(todayStr);

  // ── Day label — shows actual date; "Today" only when it really is today ──
  const dayLabel = useMemo(() => {
    if (selectedDate === todayStr) return "Today";
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (selectedDate === yesterday) return "Yesterday";
    const d = new Date(selectedDate + "T12:00:00Z");
    return `${String(d.getUTCDate()).padStart(2, "0")} ${MN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }, [selectedDate, todayStr]);

  // ── Trend data for current timeframe — always real data from recoveryHistory ──
  const trendData = useMemo(() => {
    // Map timeframe → cutoff date string
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1y": 365 };
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = timeframe === "custom"
      ? customStart
      : new Date(Date.now() - (daysMap[timeframe] ?? 30) * 86_400_000).toISOString().slice(0, 10);
    const endStr = timeframe === "custom" ? customEnd : todayStr;

    const filtered = athlete.recoveryHistory.filter(d => d.date >= startStr && d.date <= endStr);

    // Compute a sensible x-axis tick interval so labels don't overlap
    const n = filtered.length;
    const tickInterval = n <= 10 ? 0 : n <= 35 ? 4 : n <= 95 ? 13 : n <= 190 ? 25 : 59;

    if (filtered.length === 0) {
      return { tickInterval, recovery: null, sleep: null, hrv: null, rhr: null, spo2: null, sleepEff: null, ftp: null, vo2: null, power: null, tss: null, atl: null, ctl: null, tsb: null };
    }

    /** Map a field from recoveryHistory to a TrendPoint array; returns null if no values */
    const toTrend = (getValue: (d: RecoveryHistoryDay) => number | null): TrendPoint[] | null => {
      const pts = filtered
        .map(d => ({ label: d.shortLabel, value: getValue(d) }))
        .filter((p): p is TrendPoint => p.value != null);
      return pts.length > 0 ? pts : null;
    };

    return {
      tickInterval,
      recovery: toTrend(d => d.recoveryScore),
      sleep:    toTrend(d => d.sleepScore),
      hrv:      toTrend(d => d.hrv),
      rhr:      toTrend(d => d.restHr),
      spo2:     toTrend(d => d.spo2),
      sleepEff: toTrend(d => d.sleepEfficiency),
      ftp:      null,
      vo2:      null,
      power:    null,
      tss:      null,
      atl:      null,
      ctl:      null,
      tsb:      null,
    };
  }, [athlete, timeframe, customStart, customEnd]);

  // ── Recovery history (declared here so historyMap can reference it) ──
  const recHistory = athlete.recoveryHistory; // oldest → newest

  // ── Per-date lookup map built from recoveryHistory ──
  const historyMap = useMemo(() => {
    const m = new Map<string, typeof recHistory[0]>();
    for (const d of recHistory) m.set(d.date, d);
    return m;
  }, [recHistory]);

  // ── Daily snapshot values — keyed exactly to selectedDate ──
  // All fields are null for any date with no data (e.g. today when sync has stopped).
  const dayVals = useMemo(() => {
    const rec = historyMap.get(selectedDate);
    return {
      recovery:          rec?.recoveryScore    ?? null,
      hrv:               rec?.hrv              ?? null,
      sleep:             rec?.sleepScore       ?? null,
      rhr:               rec?.restHr           ?? null,
      spo2:              rec?.spo2             ?? null,
      resp:              rec?.resp             ?? null,
      sleepEfficiency:   rec?.sleepEfficiency  ?? null,
      sleepDurationMins: rec?.sleepDurationMins ?? null,
      sleepDeepMins:     rec?.sleepDeepMins    ?? null,
      sleepRemMins:      rec?.sleepRemMins     ?? null,
      sleepLightMins:    rec?.sleepLightMins   ?? null,
      sleepAwakeMins:    rec?.sleepAwakeMins   ?? null,
    };
  }, [selectedDate, historyMap]);

  // ── Sleep breakdown — computed from selected date's data ──
  const sleepTotalMs = (dayVals.sleepDurationMins ?? 0) * 60_000;
  const sleepBedMs   = sleepTotalMs || 1; // avoid div by zero
  const hasSleepData = (dayVals.sleepDurationMins ?? 0) > 0;
  const deepPct   = Math.round((dayVals.sleepDeepMins  ?? 0) * 60_000 / sleepBedMs * 100);
  const remPct    = Math.round((dayVals.sleepRemMins   ?? 0) * 60_000 / sleepBedMs * 100);
  const lightPct  = Math.round((dayVals.sleepLightMins ?? 0) * 60_000 / sleepBedMs * 100);
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
    { key: "recovery",    label: "Recovery" },
    { key: "performance", label: "Performance" },
    { key: "load",        label: "Training Load" },
    { key: "power",       label: "Power" },
    { key: "profile",     label: "Profile" },
  ];

  // ── Recovery tab data ──
  const filteredRecHistory = useMemo(() => {
    if (recTf === "all" || !recHistory.length) return recHistory;
    const days = ({ "7d": 7, "30d": 30, "90d": 90, "365d": 365 } as Record<RecTF, number>)[recTf];
    const lastDate = recHistory[recHistory.length - 1].date;
    const cutoff = new Date(lastDate + "T12:00:00Z");
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return recHistory.filter(d => d.date >= cutoffStr);
  }, [recHistory, recTf]);

  const recStats = useMemo(() => {
    const h = recHistory;
    const withRec  = h.filter(d => d.recoveryScore != null);
    const withHrv  = h.filter(d => d.hrv != null);
    const withRhr  = h.filter(d => d.restHr != null);
    const withSpo2 = h.filter(d => d.spo2 != null);
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
    const avgSpo2Raw = withSpo2.length
      ? withSpo2.reduce((s, d) => s + (d.spo2 ?? 0), 0) / withSpo2.length : null;
    return {
      avgRec:       avg(withRec.map(d => d.recoveryScore!)),
      avgHrv:       avg(withHrv.map(d => d.hrv!)),
      avgRhr:       avg(withRhr.map(d => d.restHr!)),
      avgSpo2:      avgSpo2Raw != null ? Math.round(avgSpo2Raw * 10) / 10 : null,
      daysTracked:  h.length,
      greenCount:   withRec.filter(d => (d.recoveryScore ?? 0) >= 67).length,
      yellowCount:  withRec.filter(d => (d.recoveryScore ?? 0) >= 34 && (d.recoveryScore ?? 0) < 67).length,
      redCount:     withRec.filter(d => (d.recoveryScore ?? 0) < 34).length,
    };
  }, [recHistory]);

  const recChartTickInterval = useMemo(() => {
    const n = filteredRecHistory.length;
    if (n <= 7)   return 0;
    if (n <= 30)  return 4;
    if (n <= 90)  return 9;
    if (n <= 180) return 13;
    return 20;
  }, [filteredRecHistory.length]);

  // ── Year boundary markers for the recovery chart ──
  const yearMarkers = useMemo(() => {
    const markers: { xLabel: string; year: number }[] = [];
    for (let i = 1; i < filteredRecHistory.length; i++) {
      const prevYear = parseInt(filteredRecHistory[i - 1].date.slice(0, 4));
      const currYear = parseInt(filteredRecHistory[i].date.slice(0, 4));
      if (currYear > prevYear) {
        markers.push({ xLabel: filteredRecHistory[i].shortLabel, year: currYear });
      }
    }
    return markers;
  }, [filteredRecHistory]);

  // ── Paginated table data (newest first, 30 per page) ──
  const RECORDS_PER_PAGE = 30;
  const reversedHistory  = useMemo(() => [...filteredRecHistory].reverse(), [filteredRecHistory]);
  const totalPages       = Math.max(1, Math.ceil(reversedHistory.length / RECORDS_PER_PAGE));
  const pagedHistory     = useMemo(
    () => reversedHistory.slice(recTablePage * RECORDS_PER_PAGE, (recTablePage + 1) * RECORDS_PER_PAGE),
    [reversedHistory, recTablePage]
  );

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

  const DayNav = () => {
    const prevDate = new Date(selectedDate + "T12:00:00Z");
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevStr = prevDate.toISOString().slice(0, 10);

    const nextDate = new Date(selectedDate + "T12:00:00Z");
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextStr = nextDate.toISOString().slice(0, 10);

    const atToday = selectedDate >= todayStr;
    const hasData = historyMap.has(selectedDate);

    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center border border-line rounded-md overflow-hidden">
          <button type="button" onClick={() => setSelectedDate(prevStr)}
            className="px-2 py-1.5 text-xs text-muted hover:text-ink hover:bg-surfaceStrong border-r border-line transition-colors">‹</button>
          <span className={cn("px-3 py-1.5 text-sm whitespace-nowrap", hasData ? "text-ink" : "text-muted")}>
            {dayLabel}
            {!hasData && <span className="ml-1.5 text-[10px] opacity-60">no data</span>}
          </span>
          <button type="button" onClick={() => setSelectedDate(nextStr)} disabled={atToday}
            className={cn("px-2 py-1.5 text-xs border-l border-line transition-colors",
              atToday ? "text-muted opacity-30 cursor-not-allowed" : "text-muted hover:text-ink hover:bg-surfaceStrong")}>›</button>
        </div>
        <label className="relative flex items-center justify-center w-7 h-7 rounded-md border border-line text-muted hover:text-ink hover:bg-surfaceStrong transition-colors cursor-pointer">
          <Calendar size={13} />
          <input type="date" max={todayStr} value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </label>
      </div>
    );
  };

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
      {/* Athlete hero photo strip */}
      <AthleteHeroStrip name={athlete.name} />

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
                sub={dayVals.recovery != null
                  ? (dayVals.recovery >= 67 ? "Good recovery" : dayVals.recovery >= 34 ? "Moderate recovery" : "Low recovery")
                  : "No data for this date"} />
              <MetricPill label="HRV" value={dayVals.hrv != null ? `${dayVals.hrv} ms` : "N/A"} sub="Overnight avg" />
              <MetricPill label="Sleep score" value={dayVals.sleep != null ? String(dayVals.sleep) : "N/A"}
                sub={dayVals.sleepEfficiency != null ? `Eff ${dayVals.sleepEfficiency}%` : "No sleep data"} />
              <MetricPill label="Resting HR" value={dayVals.rhr != null ? `${dayVals.rhr} bpm` : "N/A"} sub="Overnight avg" />
              <MetricPill label="SpO₂" value={dayVals.spo2 != null ? `${dayVals.spo2}%` : "N/A"} sub="Overnight" />
              <MetricPill label="Resp rate" value={dayVals.resp != null ? `${dayVals.resp} rpm` : "N/A"} sub="Overnight" />
            </div>
          </div>

          {/* Sleep breakdown */}
          <div className="border border-line rounded-lg overflow-hidden bg-canvas">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium text-ink">Sleep breakdown</span>
              <span className="text-xs text-muted">
                {hasSleepData ? `${formatSleepDuration(sleepTotalMs)} in bed` : dayLabel}
              </span>
            </div>
            {hasSleepData ? (
              <div className="px-4 py-4 space-y-3">
                <div className="flex rounded-full overflow-hidden h-3 gap-px bg-line">
                  <div style={{ width: `${deepPct}%`,  backgroundColor: "#3b82f6" }} />
                  <div style={{ width: `${remPct}%`,   backgroundColor: "#8b5cf6" }} />
                  <div style={{ width: `${lightPct}%`, backgroundColor: "#93c5fd" }} />
                  <div style={{ width: `${awakePct}%`, backgroundColor: "#d1d5db" }} />
                </div>
                <div className="flex flex-wrap gap-5">
                  {[
                    { label: "Deep",  pct: deepPct,  ms: (dayVals.sleepDeepMins  ?? 0) * 60_000, color: "#3b82f6" },
                    { label: "REM",   pct: remPct,   ms: (dayVals.sleepRemMins   ?? 0) * 60_000, color: "#8b5cf6" },
                    { label: "Light", pct: lightPct, ms: (dayVals.sleepLightMins ?? 0) * 60_000, color: "#93c5fd" },
                    { label: "Awake", pct: awakePct, ms: (dayVals.sleepAwakeMins ?? 0) * 60_000, color: "#d1d5db" },
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
                    { label: "Efficiency",  value: dayVals.sleepEfficiency != null ? `${dayVals.sleepEfficiency}%` : "N/A" },
                    { label: "Duration",    value: dayVals.sleepDurationMins != null ? formatSleepDuration(dayVals.sleepDurationMins * 60_000) : "N/A" },
                    { label: "Skin temp Δ", value: athlete.skinTemp != null ? `${athlete.skinTemp > 0 ? "+" : ""}${athlete.skinTemp.toFixed(1)}°C` : "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface rounded-md px-3 py-2">
                      <p className="text-[10px] text-muted">{label}</p>
                      <p className="text-sm font-semibold text-ink mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 flex items-center justify-center">
                <p className="text-sm text-muted">No sleep data for {dayLabel}</p>
              </div>
            )}
          </div>

          {/* Trends */}
          <SectionHeader title="Readiness trends" sub="Historical view" controls={<TimeframeBar />} />
          {(!trendData.recovery && !trendData.sleep && !trendData.hrv && !trendData.rhr) ? (
            <div className="border border-line rounded-lg bg-canvas px-6 py-10 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium text-ink">No data for this period</p>
              <p className="text-xs text-muted max-w-xs">
                {athlete.name.split(" ")[0]}'s wearable hasn't synced recently. Try a longer timeframe or check that their WHOOP is connected.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {trendData.recovery && <SectionChart title="Recovery score"  data={trendData.recovery} color="#e16b2b" tickInterval={trendData.tickInterval} />}
              {trendData.sleep    && <SectionChart title="Sleep score"     data={trendData.sleep}    color="#3b82f6" tickInterval={trendData.tickInterval} />}
              {trendData.hrv ? (
                <SectionChart title="HRV" data={trendData.hrv} color="#059669" sub="ms" tickInterval={trendData.tickInterval} />
              ) : (
                <div className="border border-line rounded-lg bg-canvas px-4 py-6 flex items-center justify-center">
                  <p className="text-sm text-muted">HRV data not available from this device</p>
                </div>
              )}
              {trendData.rhr ? (
                <SectionChart title="Resting HR" data={trendData.rhr} color="#d97706" sub="bpm" tickInterval={trendData.tickInterval} />
              ) : (
                <div className="border border-line rounded-lg bg-canvas px-4 py-6 flex items-center justify-center">
                  <p className="text-sm text-muted">Resting HR data not available from this device</p>
                </div>
              )}
              {trendData.spo2     && <SectionChart title="SpO₂"            data={trendData.spo2}     color="#8b5cf6" sub="%" tickInterval={trendData.tickInterval} />}
              {trendData.sleepEff && <SectionChart title="Sleep efficiency" data={trendData.sleepEff} color="#06b6d4" sub="%" tickInterval={trendData.tickInterval} />}
            </div>
          )}
        </div>
      )}

      {/* ── RECOVERY ── */}
      {tab === "recovery" && (
        <div className="px-6 py-5 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Avg Recovery Score",
                value: recStats.avgRec != null ? `${recStats.avgRec}%` : "N/A",
                color: recStats.avgRec != null
                  ? (recStats.avgRec >= 67 ? "#059669" : recStats.avgRec >= 34 ? "#d97706" : "#dc2626")
                  : "#9b9a97",
              },
              {
                label: "Avg HRV (RMSSD)",
                value: recStats.avgHrv != null ? `${recStats.avgHrv} ms` : "N/A",
                color: "#059669",
              },
              {
                label: "Avg Resting HR",
                value: recStats.avgRhr != null ? `${recStats.avgRhr} bpm` : "N/A",
                color: "#d97706",
              },
              {
                label: "Days Tracked",
                value: String(recStats.daysTracked),
                color: "#6366f1",
              },
            ].map(card => (
              <div key={card.label} className="border border-line rounded-lg bg-canvas px-4 py-4 space-y-1">
                <p className="text-xs text-muted">{card.label}</p>
                <p className="text-2xl font-bold tabular leading-tight" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Distribution + SpO2 */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              <span className="text-muted">{recStats.greenCount} green</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning inline-block" />
              <span className="text-muted">{recStats.yellowCount} yellow</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger inline-block" />
              <span className="text-muted">{recStats.redCount} red</span>
            </span>
            {recStats.avgSpo2 != null && (
              <span className="text-muted flex items-center gap-1">
                Avg SpO₂ <span className="font-semibold text-ink ml-0.5">{recStats.avgSpo2}%</span>
              </span>
            )}
          </div>

          {/* Full recovery timeline chart */}
          <div className="border border-line rounded-lg bg-canvas overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 flex-wrap gap-2">
              <span className="text-sm font-medium text-ink">Daily Recovery Score</span>
              <div className="inline-flex items-center bg-surfaceStrong rounded-md p-0.5 gap-0.5">
                {(["7d","30d","90d","365d","all"] as RecTF[]).map(tf => (
                  <button key={tf} type="button" onClick={() => { setRecTf(tf); setRecTablePage(0); }}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-[5px] transition-colors duration-100 font-medium",
                      recTf === tf ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink"
                    )}>
                    {tf === "all" ? "All" : tf}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 220 }} className="px-1 pt-2 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredRecHistory.map(d => ({
                    xLabel:       d.shortLabel,
                    tooltipLabel: d.label,
                    recoveryScore: d.recoveryScore,
                  }))}
                  margin={{ top: 4, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    {/* Fill gradient — subtle background shading */}
                    <linearGradient id="rec-hist-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                    </linearGradient>
                    {/* Stroke gradient — green (top/high) → yellow (mid) → red (bottom/low)
                        Y domain is 0–100; y=67 is 33% from top, y=33 is 67% from top */}
                    <linearGradient id="rec-stroke-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#059669" />
                      <stop offset="33%"  stopColor="#059669" />
                      <stop offset="50%"  stopColor="#d97706" />
                      <stop offset="67%"  stopColor="#d97706" />
                      <stop offset="78%"  stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e9e9e7" />
                  <XAxis
                    dataKey="xLabel"
                    interval={recChartTickInterval}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tickCount={5}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
                    width={36}
                  />
                  {/* Zone threshold lines */}
                  <ReferenceLine y={67} stroke="#059669" strokeOpacity={0.25} strokeDasharray="4 3" strokeWidth={1} />
                  <ReferenceLine y={33} stroke="#dc2626" strokeOpacity={0.25} strokeDasharray="4 3" strokeWidth={1} />
                  {/* Year boundary markers */}
                  {yearMarkers.map(m => (
                    <ReferenceLine
                      key={m.year}
                      x={m.xLabel}
                      stroke="#9b9a97"
                      strokeOpacity={0.5}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{ value: String(m.year), position: "insideTopRight", fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
                    />
                  ))}
                  <Tooltip
                    contentStyle={TS}
                    labelStyle={TL}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(_: any, payload: any[]) =>
                      (payload?.[0]?.payload?.tooltipLabel as string) ?? ""}
                    formatter={(v: number) => [`${Math.round(v)}%`, "Recovery"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="recoveryScore"
                    stroke="url(#rec-stroke-grad)"
                    strokeWidth={2}
                    fill="url(#rec-hist-fill)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#6366f1", stroke: "#ffffff", strokeWidth: 1.5 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily breakdown table — paginated, 30 records per page, newest first */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">Daily Breakdown</h3>
              <div className="flex items-center gap-2">
                {reversedHistory.length > 0 && (
                  <span className="text-xs text-muted">
                    {recTablePage * RECORDS_PER_PAGE + 1}–{Math.min((recTablePage + 1) * RECORDS_PER_PAGE, reversedHistory.length)} of {reversedHistory.length} days
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowDetailColEditor(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted border border-line rounded-md px-2 py-1 hover:text-ink hover:border-ink/30 hover:bg-surfaceStrong transition-colors duration-100"
                  title="Edit columns">
                  <SlidersHorizontal size={12} />
                  Columns
                </button>
              </div>
            </div>
            <div className="border border-line rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line text-sm">
                  <thead className="bg-surface">
                    <tr>
                      {detailColOrder.map((key, i) => {
                        const def = DETAIL_COL_DEFS.find(d => d.key === key);
                        return def ? (
                          <th key={key}
                            className={`px-4 py-2.5 text-xs font-medium text-muted whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}>
                            {def.header}
                          </th>
                        ) : null;
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-canvas">
                    {pagedHistory.map(day => (
                      <tr key={day.date} className="hover:bg-surface/60 transition-colors duration-75">
                        {detailColOrder.map((key, i) => (
                          <td key={key} className={`px-4 py-2.5 tabular text-ink ${i === 0 ? "text-sm" : "text-right"}`}>
                            {renderDetailCell(key, day)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {pagedHistory.length === 0 && (
                      <tr>
                        <td colSpan={detailColOrder.length} className="px-4 py-8 text-center text-sm text-muted">No data for this period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-2.5 bg-surface">
                  <button
                    type="button"
                    onClick={() => setRecTablePage(p => Math.max(0, p - 1))}
                    disabled={recTablePage === 0}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md border border-line transition-colors",
                      recTablePage === 0
                        ? "text-muted opacity-40 cursor-not-allowed bg-canvas"
                        : "text-ink bg-canvas hover:bg-surfaceStrong"
                    )}>
                    ‹ Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i).map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRecTablePage(i)}
                        className={cn(
                          "w-7 h-7 text-xs rounded-md transition-colors",
                          i === recTablePage
                            ? "bg-ink text-canvas font-semibold"
                            : "text-muted hover:text-ink hover:bg-surfaceStrong"
                        )}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecTablePage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={recTablePage === totalPages - 1}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md border border-line transition-colors",
                      recTablePage === totalPages - 1
                        ? "text-muted opacity-40 cursor-not-allowed bg-canvas"
                        : "text-ink bg-canvas hover:bg-surfaceStrong"
                    )}>
                    Next ›
                  </button>
                </div>
              )}
            </div>
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

      {showDetailColEditor && (
        <DetailColEditorPanel
          colOrder={detailColOrder}
          onReorder={setDetailColOrder}
          onClose={() => setShowDetailColEditor(false)}
        />
      )}
    </div>
  );
}
