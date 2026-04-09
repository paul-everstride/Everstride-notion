"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Heart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
  Settings2,
  X,
  Pencil,
  Moon,
  Wind,
  Dumbbell,
  Flame,
  SlidersHorizontal,
} from "lucide-react";
import { AthleteTable, type AthleteColumnKey, defaultAthleteColumns } from "@/components/athlete-table";
import { RecoveryBadge } from "@/components/recovery-badge";
import type { AthleteSummary, DashboardData } from "@/lib/types";
import { cn, formatSignedNumber } from "@/lib/utils";
import { DashboardSectionBg } from "@/components/photo-accents";

// ── Column config ──────────────────────────────────────────────────────────────

const columnOptions: Array<{ key: AthleteColumnKey; label: string }> = [
  { key: "name",            label: "Name"             },
  { key: "age",             label: "Age"              },
  { key: "weight",          label: "Weight"           },
  { key: "team",            label: "Team"             },
  { key: "recovery",        label: "Recovery"         },
  { key: "sleep",           label: "Sleep"            },
  { key: "sleepEfficiency", label: "Sleep Efficiency" },
  { key: "rhr",             label: "RHR"              },
  { key: "hrv",             label: "HRV"              },
  { key: "spo2",            label: "SpO₂"             },
  { key: "resp",            label: "Resp Rate"        },
  { key: "skinTemp",        label: "Skin Temp"        },
  { key: "atl",             label: "ATL"              },
  { key: "ctl",             label: "CTL"              },
  { key: "tsb",             label: "TSB"              },
  { key: "vo2",             label: "VO2 max"          },
  { key: "ftp",             label: "FTP"              },
  { key: "polarized",       label: "Polarized"        },
  { key: "powerMax",        label: "Power max"        },
];

// ── Stat strip cell ───────────────────────────────────────────────────────────

// ── Team stat strip components ────────────────────────────────────────────────

function StatDonut({ pct, color, value, label }: { pct: number; color: string; value: string; label: string }) {
  const size = 34, stroke = 4, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, pct / 100)) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-line last:border-r-0">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9e9e7" strokeWidth={stroke} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold tabular leading-none" style={{ color }}>{value}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-muted leading-none mb-0.5 uppercase tracking-wide">{label}</p>
        <p className="text-[11px] font-semibold text-ink tabular">{pct >= 70 ? "Good" : pct >= 40 ? "Fair" : "Low"}</p>
      </div>
    </div>
  );
}

function StatGradientLine({
  values, avg, min, max, label, unit, avgLabel
}: {
  values: number[]; avg: number | null; min: number; max: number;
  label: string; unit: string; avgLabel?: string;
}) {
  const W = 120, trackY = 10, trackH = 2;
  const toX = (v: number) => ((Math.min(Math.max(v, min), max) - min) / (max - min)) * W;
  const gradId = `sg-${label.replace(/\s/g, "")}`;
  const hasData = avg != null && values.length > 0;
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-r border-line last:border-r-0 flex-1 min-w-0">
      <div>
        <p className="text-[10px] text-muted leading-none mb-0.5 uppercase tracking-wide whitespace-nowrap">{label}</p>
        {hasData
          ? <p className="text-xs font-semibold text-ink tabular">{avg}<span className="text-[10px] text-muted font-normal ml-0.5">{unit}</span></p>
          : <p className="text-xs font-semibold text-muted tabular">N/A</p>
        }
        {avgLabel && <p className="text-[10px] text-muted leading-none mt-0.5">{avgLabel}</p>}
      </div>
      <div className="flex-1 min-w-[80px]">
        <svg width="100%" viewBox={`0 0 ${W} 18`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block", minWidth: 80 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#0ea5e9" />
              <stop offset="50%"  stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* track */}
          <rect x="0" y={trackY} width={W} height={trackH} rx="1" fill="#e9e9e7" />
          {hasData && <rect x="0" y={trackY} width={W} height={trackH} rx="1" fill={`url(#${gradId})`} opacity="0.5" />}
          {/* athlete ticks */}
          {hasData && values.map((v, i) => {
            const x = toX(v);
            return <line key={i} x1={x} y1={trackY - 3} x2={x} y2={trackY + trackH + 1}
              stroke="#9b9a97" strokeWidth="1" strokeLinecap="round" opacity="0.55" />;
          })}
          {/* avg marker */}
          {hasData && (() => {
            const mx = toX(avg as number);
            return (
              <g>
                <line x1={mx} y1={trackY - 5} x2={mx} y2={trackY + trackH + 3} stroke="#37352f" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx={mx} cy={trackY + 1} r="2.5" fill="#37352f" />
                <circle cx={mx} cy={trackY + 1} r="1" fill="white" />
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

function StatFlagged({ flagged, total }: { flagged: number; total: number }) {
  const color = flagged === 0 ? "#6366f1" : "#e16b2b";
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 border-r border-line last:border-r-0">
      <div>
        <p className="text-[10px] text-muted leading-none mb-0.5 uppercase tracking-wide">Flagged</p>
        <p className="text-xs font-semibold tabular" style={{ color }}>
          {flagged}<span className="text-muted font-normal text-[10px]"> / {total}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-[3px] max-w-[48px]">
        {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: i < flagged ? color : "#e9e9e7" }} />
        ))}
        {total > 12 && <span className="text-[9px] text-muted">+{total - 12}</span>}
      </div>
    </div>
  );
}

// ── Big metric card ───────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, athleteName, secondary, accentColor
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  athleteName: string;
  secondary: string;
  accentColor: string;
}) {
  return (
    <div className="border border-line bg-canvas rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-xs text-muted">{label}</span>
        <span style={{ color: accentColor, opacity: 0.6 }}>{icon}</span>
      </div>
      <div className="px-3 pb-2">
        <p className="text-3xl font-semibold tabular tracking-tight leading-none" style={{ color: accentColor }}>
          {value}
        </p>
      </div>
      <div className="border-t border-line px-3 py-2 mt-auto">
        <p className="text-sm font-medium text-ink">{athleteName}</p>
        <p className="text-xs text-muted mt-0.5 tabular">{secondary}</p>
      </div>
    </div>
  );
}

// ── Quick-view metric definitions ────────────────────────────────────────────

type QuickMetricDef = {
  key: string;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  pick: (athletes: AthleteSummary[]) => AthleteSummary | undefined;
  value: (a: AthleteSummary) => string;
  secondary: (a: AthleteSummary) => string;
};

const QUICK_METRICS: QuickMetricDef[] = [
  {
    key: "highest_recovery",
    label: "Highest Recovery",
    icon: <Activity size={16} />,
    accentColor: "#3b82f6",
    pick: athletes => [...athletes].filter(a => a.recoveryScore != null).sort((a, b) => (b.recoveryScore ?? 0) - (a.recoveryScore ?? 0))[0],
    value: a => a.recoveryScore != null ? `${a.recoveryScore}` : "N/A",
    secondary: a => `HRV ${a.hrv != null ? `${a.hrv} ms` : "N/A"} · RHR ${a.restHr ?? "N/A"}`,
  },
  {
    key: "lowest_recovery",
    label: "Lowest Recovery",
    icon: <TrendingDown size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].filter(a => a.recoveryScore != null).sort((a, b) => (a.recoveryScore ?? 0) - (b.recoveryScore ?? 0))[0],
    value: a => a.recoveryScore != null ? `${a.recoveryScore}` : "N/A",
    secondary: a => `HRV ${a.hrv != null ? `${a.hrv} ms` : "N/A"} · RHR ${a.restHr ?? "N/A"}`,
  },
  {
    key: "highest_tss",
    label: "Highest TSS",
    icon: <Zap size={16} />,
    accentColor: "#d97706",
    pick: athletes => [...athletes].filter(a => a.tss != null).sort((a, b) => (b.tss ?? 0) - (a.tss ?? 0))[0],
    value: a => a.tss != null ? `${a.tss}` : "N/A",
    secondary: a => `ATL ${a.atl ?? "N/A"} · CTL ${a.ctl ?? "N/A"}`,
  },
  {
    key: "lowest_rhr",
    label: "Lowest RHR",
    icon: <Heart size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].filter(a => a.restHr != null).sort((a, b) => (a.restHr ?? 0) - (b.restHr ?? 0))[0],
    value: a => a.restHr != null ? `${a.restHr} bpm` : "N/A",
    secondary: a => `REC ${a.recoveryScore ?? "N/A"} · HRV ${a.hrv != null ? `${a.hrv} ms` : "N/A"}`,
  },
  {
    key: "highest_hrv",
    label: "Highest HRV",
    icon: <Activity size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].filter(a => a.hrv != null).sort((a, b) => (b.hrv ?? 0) - (a.hrv ?? 0))[0],
    value: a => a.hrv != null ? `${a.hrv} ms` : "N/A",
    secondary: a => `REC ${a.recoveryScore ?? "N/A"} · RHR ${a.restHr ?? "N/A"}`,
  },
  {
    key: "lowest_hrv",
    label: "Lowest HRV",
    icon: <TrendingDown size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].filter(a => a.hrv != null).sort((a, b) => (a.hrv ?? 0) - (b.hrv ?? 0))[0],
    value: a => a.hrv != null ? `${a.hrv} ms` : "N/A",
    secondary: a => `REC ${a.recoveryScore ?? "N/A"} · RHR ${a.restHr ?? "N/A"}`,
  },
  {
    key: "highest_sleep",
    label: "Highest Sleep",
    icon: <Moon size={16} />,
    accentColor: "#8b5cf6",
    pick: athletes => [...athletes].filter(a => a.sleepScore != null).sort((a, b) => (b.sleepScore ?? 0) - (a.sleepScore ?? 0))[0],
    value: a => a.sleepScore != null ? `${a.sleepScore}` : "N/A",
    secondary: a => `Eff ${a.sleepEfficiency != null ? `${a.sleepEfficiency}%` : "N/A"} · HRV ${a.hrv != null ? `${a.hrv} ms` : "N/A"}`,
  },
  {
    key: "lowest_sleep",
    label: "Lowest Sleep",
    icon: <Moon size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].filter(a => a.sleepScore != null).sort((a, b) => (a.sleepScore ?? 0) - (b.sleepScore ?? 0))[0],
    value: a => a.sleepScore != null ? `${a.sleepScore}` : "N/A",
    secondary: a => `Eff ${a.sleepEfficiency != null ? `${a.sleepEfficiency}%` : "N/A"} · HRV ${a.hrv != null ? `${a.hrv} ms` : "N/A"}`,
  },
  {
    key: "highest_ctl",
    label: "Highest CTL",
    icon: <TrendingUp size={16} />,
    accentColor: "#3b82f6",
    pick: athletes => [...athletes].filter(a => a.ctl != null).sort((a, b) => (b.ctl ?? 0) - (a.ctl ?? 0))[0],
    value: a => a.ctl != null ? `${a.ctl}` : "N/A",
    secondary: a => `ATL ${a.atl ?? "N/A"} · TSB ${a.tsb != null ? formatSignedNumber(a.tsb) : "N/A"}`,
  },
  {
    key: "lowest_ctl",
    label: "Lowest CTL",
    icon: <TrendingDown size={16} />,
    accentColor: "#e16b2b",
    pick: athletes => [...athletes].filter(a => a.ctl != null).sort((a, b) => (a.ctl ?? 0) - (b.ctl ?? 0))[0],
    value: a => a.ctl != null ? `${a.ctl}` : "N/A",
    secondary: a => `ATL ${a.atl ?? "N/A"} · TSB ${a.tsb != null ? formatSignedNumber(a.tsb) : "N/A"}`,
  },
  {
    key: "freshest_tsb",
    label: "Freshest (TSB)",
    icon: <Flame size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].filter(a => a.tsb != null).sort((a, b) => (b.tsb ?? 0) - (a.tsb ?? 0))[0],
    value: a => a.tsb != null ? formatSignedNumber(a.tsb) : "N/A",
    secondary: a => `ATL ${a.atl ?? "N/A"} · CTL ${a.ctl ?? "N/A"}`,
  },
  {
    key: "most_fatigued_tsb",
    label: "Most Fatigued (TSB)",
    icon: <Flame size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].filter(a => a.tsb != null).sort((a, b) => (a.tsb ?? 0) - (b.tsb ?? 0))[0],
    value: a => a.tsb != null ? formatSignedNumber(a.tsb) : "N/A",
    secondary: a => `ATL ${a.atl ?? "N/A"} · CTL ${a.ctl ?? "N/A"}`,
  },
  {
    key: "highest_ftp",
    label: "Highest FTP",
    icon: <Dumbbell size={16} />,
    accentColor: "#e16b2b",
    pick: athletes => [...athletes].filter(a => a.ftp != null).sort((a, b) => (b.ftp ?? 0) - (a.ftp ?? 0))[0],
    value: a => a.ftp != null ? `${a.ftp}w` : "N/A",
    secondary: a => `VO2 ${a.vo2Max ?? "N/A"} · Power ${a.powerMax != null ? `${a.powerMax}w` : "N/A"}`,
  },
  {
    key: "highest_vo2",
    label: "Highest VO2 max",
    icon: <Wind size={16} />,
    accentColor: "#06b6d4",
    pick: athletes => [...athletes].filter(a => a.vo2Max != null).sort((a, b) => (b.vo2Max ?? 0) - (a.vo2Max ?? 0))[0],
    value: a => a.vo2Max != null ? `${a.vo2Max}` : "N/A",
    secondary: a => `FTP ${a.ftp != null ? `${a.ftp}w` : "N/A"} · REC ${a.recoveryScore ?? "N/A"}`,
  },
  {
    key: "highest_power",
    label: "Highest Power Max",
    icon: <Zap size={16} />,
    accentColor: "#d97706",
    pick: athletes => [...athletes].filter(a => a.powerMax != null).sort((a, b) => (b.powerMax ?? 0) - (a.powerMax ?? 0))[0],
    value: a => a.powerMax != null ? `${a.powerMax}w` : "N/A",
    secondary: a => `FTP ${a.ftp != null ? `${a.ftp}w` : "N/A"} · VO2 ${a.vo2Max ?? "N/A"}`,
  },
  {
    key: "highest_atl",
    label: "Highest ATL",
    icon: <BarChart2 size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].filter(a => a.atl != null).sort((a, b) => (b.atl ?? 0) - (a.atl ?? 0))[0],
    value: a => a.atl != null ? `${a.atl}` : "N/A",
    secondary: a => `CTL ${a.ctl ?? "N/A"} · TSB ${a.tsb != null ? formatSignedNumber(a.tsb) : "N/A"}`,
  },
];

const DEFAULT_QUICK_KEYS = ["highest_recovery", "highest_tss", "lowest_rhr", "lowest_ctl"];

// ── Attention monitor config ──────────────────────────────────────────────────

type AttentionMetricKey = "recovery" | "hrv" | "rhr" | "sleep" | "spo2" | "fatigue" | "overload" | "ftp_drop";

const ATTENTION_METRIC_OPTIONS: { key: AttentionMetricKey; label: string; description: string }[] = [
  { key: "recovery",  label: "Recovery score", description: "Flag if score < 60"              },
  { key: "hrv",       label: "HRV",            description: "Flag if HRV < 50 ms"             },
  { key: "rhr",       label: "Resting HR",     description: "Flag if RHR > 65 bpm"            },
  { key: "sleep",     label: "Sleep score",    description: "Flag if score < 60"              },
  { key: "spo2",      label: "SpO₂",           description: "Flag if < 95%"                   },
  { key: "fatigue",   label: "High fatigue",   description: "Flag if TSB < −25 (overreaching)" },
  { key: "overload",  label: "Overload risk",  description: "Flag if ATL / CTL > 1.4"         },
  { key: "ftp_drop",  label: "FTP decline",    description: "Flag if FTP trending down"       },
];

const DEFAULT_ATTENTION_METRICS: AttentionMetricKey[] = ["recovery", "fatigue", "overload"];

type AttentionFlag = { key: AttentionMetricKey; label: string; detail: string };

function getAthleteFlags(a: AthleteSummary, metrics: AttentionMetricKey[]): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  for (const m of metrics) {
    if (m === "recovery" && a.recoveryScore != null && a.recoveryScore < 60) {
      flags.push({ key: m, label: "Low recovery", detail: `${a.recoveryScore}%` });
    }
    if (m === "hrv" && a.hrv != null && a.hrv < 50) {
      flags.push({ key: m, label: "Low HRV", detail: `${a.hrv} ms` });
    }
    if (m === "rhr" && a.restHr != null && a.restHr > 65) {
      flags.push({ key: m, label: "Elevated RHR", detail: `${a.restHr} bpm` });
    }
    if (m === "sleep" && a.sleepScore != null && a.sleepScore < 60) {
      flags.push({ key: m, label: "Poor sleep", detail: `${a.sleepScore}` });
    }
    if (m === "spo2" && a.spo2 != null && a.spo2 < 95) {
      flags.push({ key: m, label: "Low SpO₂", detail: `${a.spo2}%` });
    }
    if (m === "fatigue" && a.tsb != null && a.tsb < -25) {
      flags.push({ key: m, label: "Overreaching", detail: `TSB ${a.tsb}` });
    }
    if (m === "overload" && a.atl != null && a.ctl != null && a.ctl > 0 && (a.atl / a.ctl) > 1.4) {
      flags.push({ key: m, label: "Overload risk", detail: `ATL/CTL ${(a.atl / a.ctl).toFixed(1)}` });
    }
    if (m === "ftp_drop" && a.ftpTrend.length >= 14) {
      const recent = a.ftpTrend.slice(-7);
      const prior = a.ftpTrend.slice(-14, -7);
      const avgRecent = recent.reduce((s, p) => s + p.value, 0) / recent.length;
      const avgPrior = prior.reduce((s, p) => s + p.value, 0) / prior.length;
      if (avgPrior > 0 && avgRecent < avgPrior * 0.95) {
        flags.push({ key: m, label: "FTP declining", detail: `${Math.round(avgRecent)}w → ${Math.round(avgPrior)}w` });
      }
    }
  }
  return flags;
}

function athleteNeedsAttention(a: AthleteSummary, metrics: AttentionMetricKey[]): boolean {
  return getAthleteFlags(a, metrics).length > 0;
}

// ── AI summary config ─────────────────────────────────────────────────────────

type SummaryMetricKey = "recovery" | "sleep" | "hrv" | "flagCount" | "atl" | "ctl" | "ftp" | "vo2";

const SUMMARY_METRIC_OPTIONS: { key: SummaryMetricKey; label: string }[] = [
  { key: "recovery",  label: "Team avg recovery"    },
  { key: "sleep",     label: "Team avg sleep"        },
  { key: "hrv",       label: "Team avg HRV"          },
  { key: "flagCount", label: "Flagged athlete count" },
  { key: "atl",       label: "Team avg ATL"          },
  { key: "ctl",       label: "Team avg CTL"          },
  { key: "ftp",       label: "Team avg FTP"          },
  { key: "vo2",       label: "Team avg VO2 max"      },
];

const DEFAULT_SUMMARY_METRICS: SummaryMetricKey[] = ["recovery", "flagCount", "hrv"];

// ── Attention edit modal ──────────────────────────────────────────────────────

function AttentionEditModal({
  allAthletes, excludedIds, onToggleExclude,
  activeMetrics, onToggleMetric, onClose,
}: {
  allAthletes: AthleteSummary[];
  excludedIds: string[];
  onToggleExclude: (id: string) => void;
  activeMetrics: AttentionMetricKey[];
  onToggleMetric: (key: AttentionMetricKey) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"athletes" | "metrics">("metrics");
  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-24" onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl w-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs text-muted mb-0.5">Configure</p>
            <h3 className="text-sm font-semibold text-ink">Attention Monitor</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:text-ink hover:bg-surfaceStrong transition-colors"><X size={15} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-line">
          {(["metrics", "athletes"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn("flex-1 py-2.5 text-sm font-medium transition-colors border-b-2",
                tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}>
              {t === "metrics" ? "Watched metrics" : "Excluded athletes"}
            </button>
          ))}
        </div>
        <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
          {tab === "metrics" && ATTENTION_METRIC_OPTIONS.map(m => {
            const on = activeMetrics.includes(m.key);
            return (
              <button key={m.key} type="button" onClick={() => onToggleMetric(m.key)}
                className={cn("flex w-full items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  on ? "border-brand/25 bg-brandSoft text-ink" : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong")}>
                <div className="text-left">
                  <p className="font-medium">{m.label}</p>
                  <p className="text-xs text-muted mt-0.5">{m.description}</p>
                </div>
                <span className={cn("text-xs font-medium ml-3 shrink-0", on ? "text-brand" : "text-muted/40")}>{on ? "On" : "Off"}</span>
              </button>
            );
          })}
          {tab === "athletes" && allAthletes.map(a => {
            const excluded = excludedIds.includes(a.id);
            return (
              <button key={a.id} type="button" onClick={() => onToggleExclude(a.id)}
                className={cn("flex w-full items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  excluded ? "border-warning/25 bg-warningSoft text-ink" : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong")}>
                <div className="text-left">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted mt-0.5">{a.team}</p>
                </div>
                <span className={cn("text-xs font-medium ml-3 shrink-0", excluded ? "text-warning" : "text-muted/40")}>
                  {excluded ? "Excluded" : "Watching"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5 flex items-center justify-between bg-surface">
          <span className="text-xs text-muted">
            {tab === "metrics" ? `${activeMetrics.length} metrics active` : `${excludedIds.length} athletes excluded`}
          </span>
          <button type="button" onClick={onClose} className="text-sm font-medium text-brand hover:text-brandInk transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── AI summary edit modal ─────────────────────────────────────────────────────

function SummaryEditModal({
  activeMetrics, onToggle, onClose,
}: {
  activeMetrics: SummaryMetricKey[]; onToggle: (key: SummaryMetricKey) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-24" onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs text-muted mb-0.5">Configure</p>
            <h3 className="text-sm font-semibold text-ink">AI Summary metrics</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:text-ink hover:bg-surfaceStrong transition-colors"><X size={15} /></button>
        </div>
        <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
          {SUMMARY_METRIC_OPTIONS.map(m => {
            const on = activeMetrics.includes(m.key);
            return (
              <button key={m.key} type="button" onClick={() => onToggle(m.key)}
                className={cn("flex w-full items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  on ? "border-brand/25 bg-brandSoft text-ink" : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong")}>
                <span className="font-medium">{m.label}</span>
                <span className={cn("text-xs font-medium ml-3 shrink-0", on ? "text-brand" : "text-muted/40")}>{on ? "On" : "Off"}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5 flex items-center justify-between bg-surface">
          <span className="text-xs text-muted">{activeMetrics.length} metrics included</span>
          <button type="button" onClick={onClose} className="text-sm font-medium text-brand hover:text-brandInk transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Quick metrics picker ──────────────────────────────────────────────────────

function QuickMetricsPicker({
  selected, onToggle, onClose
}: {
  selected: string[]; onToggle: (key: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-24"
      onClick={onClose}>
      <div className="bg-canvas border border-line rounded-xl shadow-xl w-[420px] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs text-muted mb-0.5">Select up to 4</p>
            <h3 className="text-sm font-semibold text-ink">Quick view metrics</h3>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-ink hover:bg-surfaceStrong transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
          {QUICK_METRICS.map(m => {
            const active = selected.includes(m.key);
            const disabled = !active && selected.length >= 4;
            return (
              <button key={m.key} type="button"
                disabled={disabled}
                onClick={() => onToggle(m.key)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors duration-100",
                  active
                    ? "border-brand/25 bg-brandSoft text-ink"
                    : disabled
                      ? "border-transparent bg-surface text-muted/40 cursor-not-allowed"
                      : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong"
                )}>
                <span style={{ color: active ? m.accentColor : undefined }}>{m.icon}</span>
                <span className="font-medium">{m.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.accentColor }} />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5 flex items-center justify-between bg-surface">
          <span className="text-xs text-muted">{selected.length} / 4 selected</span>
          <button type="button" onClick={onClose}
            className="text-sm font-medium text-brand hover:text-brandInk transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attention Monitor ─────────────────────────────────────────────────────────

function AttentionMonitor({ athletes, metrics }: { athletes: AthleteSummary[]; metrics: AttentionMetricKey[] }) {
  const count = athletes.length;
  const allClear = count === 0;

  return (
    <div className={cn(
      "border rounded-lg flex flex-col flex-1 overflow-hidden bg-canvas",
      allClear ? "border-success/20" : "border-danger/20"
    )}>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <AlertTriangle size={14} style={{ color: allClear ? "#059669" : "#dc2626" }} className="shrink-0" />
        <span className="text-sm font-medium text-ink flex-1">Attention</span>
        <span className={cn(
          "text-xs font-medium rounded-full px-2.5 py-0.5",
          allClear ? "bg-successSoft text-success" : "bg-dangerSoft text-danger"
        )}>
          {allClear ? "All clear" : `${count} flagged`}
        </span>
      </div>

      <div className="flex items-end gap-3 px-4 pt-4 pb-3 border-b border-line">
        <span className="text-5xl font-semibold tabular tracking-tight leading-none"
          style={{ color: allClear ? "#059669" : "#dc2626" }}>
          {count}
        </span>
        <span className="text-xs text-muted pb-1.5 leading-tight">
          {allClear ? "athletes\nnominal" : "athletes\nneed attention"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allClear ? (
          <div className="flex flex-col items-center justify-center px-4 py-8">
            <p className="text-sm text-success font-medium">Squad Nominal</p>
            <p className="text-xs text-muted mt-1">No flags raised</p>
          </div>
        ) : (
          athletes.map((athlete, i) => {
            const flags = getAthleteFlags(athlete, metrics);
            return (
              <Link
                key={athlete.id}
                href={`/athletes/${athlete.id}`}
                className="group flex items-start gap-3 px-4 py-2.5 border-b border-line last:border-0 hover:bg-surface transition-colors duration-100"
              >
                <span className="text-xs text-muted w-5 tabular shrink-0 pt-0.5">{i + 1}.</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors duration-100">
                      {athlete.name}
                    </span>
                    {athlete.recoveryScore != null && <RecoveryBadge score={athlete.recoveryScore} />}
                  </span>
                  <span className="flex flex-wrap gap-1 mt-1">
                    {flags.map(f => (
                      <span key={f.key} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-dangerSoft text-danger border border-danger/10">
                        {f.label} <span className="text-danger/60">{f.detail}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>

      {!allClear && (
        <div className="border-t border-line px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-muted">Review flagged athletes</span>
          <Link href="/athletes?flagged=1" className="text-xs text-danger hover:text-danger/80 transition-colors duration-100 font-medium">
            View all →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── AI Summary ────────────────────────────────────────────────────────────────

function AiSummaryCard({ data, summaryMetrics, attentionMetrics }: { data: DashboardData; summaryMetrics: SummaryMetricKey[]; attentionMetrics: AttentionMetricKey[] }) {
  const insight = useMemo(() => {
    const athletes = data.athletes;
    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v != null);
      return valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
    };

    const avgRec = avg(athletes.map(a => a.recoveryScore));
    const avgSlp = avg(athletes.map(a => a.sleepScore));
    const avgHrv = avg(athletes.map(a => a.hrv));
    const avgAtl = avg(athletes.map(a => a.atl));
    const avgCtl = avg(athletes.map(a => a.ctl));
    const avgTsb = avg(athletes.map(a => a.tsb));
    const avgFtp = avg(athletes.map(a => a.ftp));

    // Find most concerning and best athletes
    const flagged = athletes.filter(a => athleteNeedsAttention(a, attentionMetrics));
    const greenAthletes = athletes.filter(a => (a.recoveryScore ?? 0) >= 70);
    const worstAthlete = [...athletes].sort((a, b) => (a.recoveryScore ?? 100) - (b.recoveryScore ?? 100))[0];
    const bestAthlete = [...athletes].sort((a, b) => (b.recoveryScore ?? 0) - (a.recoveryScore ?? 0))[0];
    const overreaching = athletes.filter(a => a.tsb != null && a.tsb < -25);
    const freshAthletes = athletes.filter(a => a.tsb != null && a.tsb > 0);

    // ── 1. Current Status ──
    let status = "";
    if (summaryMetrics.includes("recovery") && avgRec != null) {
      if (avgRec >= 75) status = `Team readiness is strong at ${avgRec}% with ${greenAthletes.length} of ${athletes.length} athletes in the green.`;
      else if (avgRec >= 60) status = `Team readiness is moderate at ${avgRec}% — ${greenAthletes.length} athletes in green, ${flagged.length} flagged.`;
      else status = `Team readiness is low at ${avgRec}% — ${flagged.length} of ${athletes.length} athletes need attention.`;
    } else {
      status = `${athletes.length} athletes tracked. ${flagged.length} flagged for attention.`;
    }

    // ── 2. Key Insight ──
    let keyInsight = "";
    // Priority: overreaching > low recovery individual > load imbalance > positive
    if (overreaching.length > 0 && (summaryMetrics.includes("atl") || summaryMetrics.includes("ctl"))) {
      const names = overreaching.map(a => a.name.split(" ")[0]).join(", ");
      keyInsight = `${names} ${overreaching.length > 1 ? "are" : "is"} overreaching (TSB below −25) — fatigue has accumulated beyond safe levels.`;
    } else if (worstAthlete && (worstAthlete.recoveryScore ?? 100) < 40 && summaryMetrics.includes("recovery")) {
      keyInsight = `${worstAthlete.name.split(" ")[0]} is at ${worstAthlete.recoveryScore}% recovery${worstAthlete.sleepScore != null && worstAthlete.sleepScore < 60 ? ` with poor sleep (${worstAthlete.sleepScore})` : ""} — this is the primary concern today.`;
    } else if (avgAtl != null && avgCtl != null && avgCtl > 0 && avgAtl / avgCtl > 1.3 && summaryMetrics.includes("atl")) {
      keyInsight = `Team acute load (${avgAtl}) is running ${Math.round((avgAtl / avgCtl - 1) * 100)}% above chronic load (${avgCtl}) — risk of cumulative overload.`;
    } else if (freshAthletes.length >= athletes.length / 2 && summaryMetrics.includes("recovery")) {
      keyInsight = `${freshAthletes.length} athletes have positive form (TSB > 0) — the squad is fresh and can absorb higher training stress.`;
    } else if (summaryMetrics.includes("hrv") && avgHrv != null) {
      keyInsight = `Team HRV averages ${avgHrv} ms${avgSlp != null ? ` with sleep quality at ${avgSlp}` : ""}.`;
    } else if (summaryMetrics.includes("ftp") && avgFtp != null) {
      keyInsight = `Team FTP averages ${avgFtp}w across the squad.`;
    }

    // ── 3. Suggested Action ──
    let action = "";
    if (overreaching.length > 0) {
      action = `Reduce load for ${overreaching.map(a => a.name.split(" ")[0]).join(" and ")} — consider active recovery or a deload day.`;
    } else if (flagged.length > 0 && worstAthlete && (worstAthlete.recoveryScore ?? 100) < 50) {
      action = `Prioritize recovery check-in with ${worstAthlete.name.split(" ")[0]} before today's session.`;
    } else if (avgAtl != null && avgCtl != null && avgCtl > 0 && avgAtl / avgCtl > 1.3) {
      action = "Consider a lighter session today to let chronic fitness catch up with acute load.";
    } else if (freshAthletes.length >= athletes.length / 2) {
      action = "Good window for a quality session — most athletes have capacity to absorb load.";
    } else if (flagged.length > 0) {
      action = `Monitor ${flagged.map(a => a.name.split(" ")[0]).join(", ")} closely and adjust intensity as needed.`;
    } else {
      action = "Squad is tracking well. Continue current training plan.";
    }

    return { status, keyInsight, action, flaggedCount: flagged.length };
  }, [data, summaryMetrics, attentionMetrics]);

  return (
    <div className="border border-warning/20 rounded-lg flex flex-col flex-1 overflow-hidden bg-canvas">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Sparkles size={14} className="text-warning shrink-0" />
        <span className="text-sm font-medium text-ink flex-1">AI Summary</span>
        <span className="text-xs text-muted bg-surface rounded-full px-2.5 py-0.5">Coach view</span>
      </div>

      <div className="px-4 py-3 flex-1 space-y-2">
        {/* Status */}
        <p className="text-sm text-ink leading-relaxed">{insight.status}</p>
        {/* Key insight */}
        {insight.keyInsight && (
          <p className="text-sm text-ink leading-relaxed">
            <span className="font-semibold text-warning">Insight:</span> {insight.keyInsight}
          </p>
        )}
        {/* Suggested action */}
        {insight.action && (
          <p className="text-sm text-ink leading-relaxed">
            <span className="font-semibold text-brand">Action:</span> {insight.action}
          </p>
        )}
      </div>

      <div className="border-t border-line grid grid-cols-2">
        <Link href="/compare/readiness"
          className="flex items-center justify-between gap-1 px-4 py-2.5 text-xs font-medium text-muted hover:text-brand border-r border-line transition-colors duration-100">
          <span>Readiness</span>
          <span>→</span>
        </Link>
        <Link href="/compare/performance"
          className="flex items-center justify-between gap-1 px-4 py-2.5 text-xs font-medium text-muted hover:text-brand transition-colors duration-100">
          <span>Performance</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}

// ── Column editor panel ───────────────────────────────────────────────────────

type ColGroup = "Athlete" | "Readiness" | "Performance";

const EDITOR_GROUPS: { key: ColGroup; label: string; textClass: string }[] = [
  { key: "Athlete",     label: "Athlete",     textClass: "text-muted"  },
  { key: "Readiness",   label: "Readiness",   textClass: "text-blue"   },
  { key: "Performance", label: "Performance", textClass: "text-brand"  },
];

function EditorPanel({
  title, columnOrder, onReorder, onClose
}: {
  title: string;
  columnOrder: AthleteColumnKey[];
  onReorder: (newOrder: AthleteColumnKey[]) => void;
  onClose: () => void;
}) {
  const dragKey = useRef<AthleteColumnKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<AthleteColumnKey | null>(null);

  // Build a lookup of all column defs from the imported array (at module level we have columnDefinitions already)
  // We reference the same columnDefinitions used in athlete-table.tsx via columnOptions defined in this file
  const colMeta = useMemo(() => {
    const map = new Map<AthleteColumnKey, { label: string; group: ColGroup }>();
    // We use columnOptions (which lists all keys + labels) and infer group from columnDefinitions
    // Since columnDefinitions is not exported, we reconstruct group info here using columnOptions
    const groupMap: Record<AthleteColumnKey, ColGroup> = {
      name: "Athlete", age: "Athlete", weight: "Athlete", team: "Athlete",
      recovery: "Readiness", sleep: "Readiness", sleepEfficiency: "Readiness",
      rhr: "Readiness", hrv: "Readiness", spo2: "Readiness", resp: "Readiness", skinTemp: "Readiness",
      atl: "Performance", ctl: "Performance", tsb: "Performance",
      vo2: "Performance", ftp: "Performance", polarized: "Performance", powerMax: "Performance",
    };
    for (const opt of columnOptions) {
      map.set(opt.key, { label: opt.label, group: groupMap[opt.key] });
    }
    return map;
  }, []);

  const isActive = (key: AthleteColumnKey) => columnOrder.includes(key);

  const toggleKey = (key: AthleteColumnKey) => {
    if (key === "name") return; // locked
    if (columnOrder.includes(key)) {
      onReorder(columnOrder.filter(k => k !== key));
    } else {
      // Insert after the last key of the same group currently in columnOrder
      const group = colMeta.get(key)?.group;
      // All keys (in default order) for this group
      const allGroupKeys = columnOptions.filter(o => colMeta.get(o.key)?.group === group).map(o => o.key);
      // Find the last index in columnOrder that belongs to this group
      let insertIdx = -1;
      for (let i = columnOrder.length - 1; i >= 0; i--) {
        if (allGroupKeys.includes(columnOrder[i])) { insertIdx = i + 1; break; }
      }
      if (insertIdx === -1) {
        // No existing member of group — append at end
        onReorder([...columnOrder, key]);
      } else {
        const next = [...columnOrder];
        next.splice(insertIdx, 0, key);
        onReorder(next);
      }
    }
  };

  const handleDragStart = (key: AthleteColumnKey) => { dragKey.current = key; };
  const handleDrop = (targetKey: AthleteColumnKey) => {
    setDragOverKey(null);
    const src = dragKey.current;
    if (!src || src === targetKey) return;
    // Only reorder within same group
    if (colMeta.get(src)?.group !== colMeta.get(targetKey)?.group) return;
    // Only allow reordering active columns
    if (!columnOrder.includes(src) || !columnOrder.includes(targetKey)) return;
    const next = [...columnOrder];
    const fromIdx = next.indexOf(src);
    const toIdx   = next.indexOf(targetKey);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, src);
    onReorder(next);
    dragKey.current = null;
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-72 border-l border-line bg-canvas shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div>
            <p className="text-xs text-muted mb-0.5">Configure</p>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:text-ink hover:bg-surfaceStrong transition-colors duration-100">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {EDITOR_GROUPS.map(group => {
            const activeItems = columnOrder
              .filter(k => colMeta.get(k)?.group === group.key)
              .map(k => columnOptions.find(c => c.key === k)!)
              .filter(Boolean);
            const inactiveItems = columnOptions.filter(
              o => colMeta.get(o.key)?.group === group.key && !columnOrder.includes(o.key)
            );
            const sortedItems = [...activeItems, ...inactiveItems];
            return (
              <div key={group.key}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 ${group.textClass}`}>{group.label}</p>
                <div className="space-y-0.5">
                  {sortedItems.map(item => {
                    const active = isActive(item.key);
                    const locked = item.key === "name";
                    return (
                      <div
                        key={item.key}
                        draggable={active && !locked}
                        onDragStart={() => handleDragStart(item.key)}
                        onDragEnter={() => setDragOverKey(item.key)}
                        onDragOver={e => { e.preventDefault(); }}
                        onDragEnd={() => { setDragOverKey(null); dragKey.current = null; }}
                        onDrop={() => handleDrop(item.key)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-2 text-left text-sm rounded-md border transition-colors duration-100",
                          dragOverKey === item.key && active && !locked ? "border-t-2 border-t-brand" : "",
                          active
                            ? "border-brand/20 bg-brandSoft text-ink"
                            : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong"
                        )}>
                        {/* Drag handle */}
                        <span
                          className={cn(
                            "text-muted/40 cursor-grab select-none text-base leading-none shrink-0",
                            (!active || locked) && "invisible"
                          )}
                          title="Drag to reorder">
                          ⠿
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {locked ? (
                          <span className="text-xs ml-2 font-medium text-muted/40">Locked</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleKey(item.key)}
                            className="ml-2 shrink-0 w-8 h-[18px] rounded-full transition-colors duration-150 relative"
                            style={{ backgroundColor: active ? "var(--brand, #e16b2b)" : "#d4d4d8" }}
                          >
                            <span
                              className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-150"
                              style={{ left: active ? "calc(100% - 16px)" : "2px" }}
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

// ── DashboardWorkspace ────────────────────────────────────────────────────────

const PREFS_KEY = "everstride-dashboard-prefs";

function loadPrefs() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "null"); } catch { return null; }
}

export function DashboardWorkspace({ dashboard }: { dashboard: DashboardData }) {
  const saved = useRef(loadPrefs());

  const [search, setSearch]               = useState("");
  const [flaggedOnly, setFlaggedOnly]     = useState(false);
  const [showFieldsEditor, setShowFieldsEditor] = useState(false);
  const [columnOrder, setColumnOrder] = useState<AthleteColumnKey[]>(saved.current?.columnOrder ?? defaultAthleteColumns);
  const [quickKeys, setQuickKeys]         = useState<string[]>(saved.current?.quickKeys ?? DEFAULT_QUICK_KEYS);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  // Attention monitor config
  const [attentionExcluded, setAttentionExcluded] = useState<string[]>([]);
  const [attentionMetrics,  setAttentionMetrics]  = useState<AttentionMetricKey[]>(saved.current?.attentionMetrics ?? DEFAULT_ATTENTION_METRICS);
  const [showAttentionEdit, setShowAttentionEdit] = useState(false);

  // AI summary config
  const [summaryMetrics,    setSummaryMetrics]    = useState<SummaryMetricKey[]>(saved.current?.summaryMetrics ?? DEFAULT_SUMMARY_METRICS);
  const [showSummaryEdit,   setShowSummaryEdit]   = useState(false);

  // Persist preferences when they change
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      quickKeys,
      attentionMetrics,
      summaryMetrics,
      columnOrder,
    }));
  }, [quickKeys, attentionMetrics, summaryMetrics, columnOrder]);

  const attentionIds = useMemo(
    () => new Set(dashboard.attentionAthletes.map(a => a.id)),
    [dashboard.attentionAthletes]
  );

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dashboard.athletes.filter(athlete => {
      if (flaggedOnly && !attentionIds.has(athlete.id)) return false;
      if (!query) return true;
      return [athlete.name, athlete.email, athlete.team].some(v => v != null && v.toLowerCase().includes(query));
    });
  }, [attentionIds, dashboard.athletes, flaggedOnly, search]);

  const lowestRecAthlete = useMemo(
    () => [...dashboard.athletes].filter(a => a.recoveryScore != null).sort((a, b) => (a.recoveryScore ?? 0) - (b.recoveryScore ?? 0))[0],
    [dashboard.athletes]
  );

  const configuredAttentionAthletes = useMemo(
    () => dashboard.athletes.filter(a =>
      !attentionExcluded.includes(a.id) && athleteNeedsAttention(a, attentionMetrics)
    ),
    [dashboard.athletes, attentionExcluded, attentionMetrics]
  );

  const toggleAttentionExclude = (id: string) =>
    setAttentionExcluded(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const toggleAttentionMetric = (key: AttentionMetricKey) =>
    setAttentionMetrics(c => c.includes(key) ? c.filter(k => k !== key) : [...c, key]);

  const toggleSummaryMetric = (key: SummaryMetricKey) =>
    setSummaryMetrics(c => c.includes(key) ? c.filter(k => k !== key) : [...c, key]);

  const activeQuickMetrics = useMemo(
    () => quickKeys
      .map(k => QUICK_METRICS.find(m => m.key === k))
      .filter(Boolean) as QuickMetricDef[],
    [quickKeys]
  );

  const toggleQuickKey = (key: string) => {
    setQuickKeys(c =>
      c.includes(key) ? c.filter(k => k !== key) : c.length < 4 ? [...c, key] : c
    );
  };


  return (
    <div>

      {/* ── Page header ── */}
      <div className="border-b border-line bg-canvas px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Readiness Dashboard</h1>
            <p className="text-sm text-muted mt-0.5">
              {dashboard.athletes.length} athletes · Sync live
            </p>
          </div>
          <Link href="/compare"
            className="text-sm font-medium text-brand hover:text-brandInk transition-colors duration-100">
            Compare →
          </Link>
        </div>

        {/* Team stats strip */}
        {(() => {
          const athletes = dashboard.athletes;
          const rhrAthletes = athletes.filter(a => a.restHr != null);
          const vo2Athletes = athletes.filter(a => a.vo2Max != null);
          const hrvAthletes = athletes.filter(a => a.hrv != null);
          const avgRhr = rhrAthletes.length ? Math.round(rhrAthletes.reduce((s, a) => s + (a.restHr ?? 0), 0) / rhrAthletes.length) : 0;
          const avgVo2 = vo2Athletes.length ? Math.round(vo2Athletes.reduce((s, a) => s + (a.vo2Max ?? 0), 0) / vo2Athletes.length) : 0;
          const flagged = dashboard.attentionAthletes.length;
          return (
            <div className="flex flex-wrap mt-4 border border-line rounded-lg overflow-hidden bg-canvas">
              <StatDonut pct={dashboard.teamAverageRecovery} color="#e16b2b"
                value={dashboard.teamAverageRecovery > 0 ? String(dashboard.teamAverageRecovery) : "N/A"} label="Recovery" />
              <StatDonut pct={dashboard.teamAverageSleep} color="#6366f1"
                value={dashboard.teamAverageSleep > 0 ? String(dashboard.teamAverageSleep) : "N/A"} label="Sleep" />
              <StatGradientLine
                values={hrvAthletes.map(a => a.hrv as number)}
                avg={dashboard.teamAverageHrv > 0 ? dashboard.teamAverageHrv : avgRhr} min={20} max={120}
                label="HRV" unit="ms" />
              <StatGradientLine
                values={rhrAthletes.map(a => a.restHr as number)}
                avg={avgRhr} min={35} max={90}
                label="Resting HR" unit="bpm" />
              <StatGradientLine
                values={vo2Athletes.map(a => a.vo2Max as number)}
                avg={avgVo2} min={30} max={80}
                label="VO2 max" unit="" />
              <StatFlagged flagged={flagged} total={athletes.length} />
            </div>
          );
        })()}
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* ── Top section ── */}
        <div className="relative overflow-hidden rounded-2xl">
          <DashboardSectionBg />
          <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-4 p-4">

          {/* 2×2 metric cards */}
          <div className="lg:col-span-2 flex flex-col gap-2 self-start">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white">Quick view</span>
              <button type="button" onClick={() => setShowQuickPicker(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-white border border-white/30 rounded-md px-2 py-1 hover:text-white hover:border-white/60 hover:bg-white/10 transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {activeQuickMetrics.map(m => {
                const athlete = m.pick(dashboard.athletes);
                return (
                  <MetricCard key={m.key}
                    icon={m.icon}
                    label={m.label}
                    value={athlete ? m.value(athlete) : "—"}
                    athleteName={athlete ? athlete.name : "No data yet"}
                    secondary={athlete ? m.secondary(athlete) : "—"}
                    accentColor={m.accentColor}
                  />
                );
              })}
              {/* Empty slot placeholders */}
              {Array.from({ length: Math.max(0, 4 - activeQuickMetrics.length) }).map((_, i) => (
                <button key={`empty-${i}`} type="button" onClick={() => setShowQuickPicker(true)}
                  className="border border-dashed border-line rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted hover:text-ink hover:border-ink/30 transition-colors duration-100 min-h-[100px]">
                  <span className="text-lg leading-none">+</span>
                  <span className="text-xs">Add metric</span>
                </button>
              ))}
            </div>
          </div>

          {/* Attention monitor */}
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white">Attention</span>
              <button type="button" onClick={() => setShowAttentionEdit(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-white border border-white/30 rounded-md px-2 py-1 hover:text-white hover:border-white/60 hover:bg-white/10 transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <AttentionMonitor athletes={configuredAttentionAthletes} metrics={attentionMetrics} />
          </div>

          {/* AI summary */}
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white">AI Summary</span>
              <button type="button" onClick={() => setShowSummaryEdit(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-white border border-white/30 rounded-md px-2 py-1 hover:text-white hover:border-white/60 hover:bg-white/10 transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <AiSummaryCard data={dashboard} summaryMetrics={summaryMetrics} attentionMetrics={attentionMetrics} />
          </div>

          </div>
        </div>

        {/* ── Table controls ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              className="bg-surface border border-line rounded-md text-sm text-ink placeholder:text-muted outline-none px-3 py-1.5 w-52 focus:border-blue/50 focus:ring-2 focus:ring-blue/10 transition-all"
              placeholder="Search by name, team…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="button" onClick={() => setFlaggedOnly(c => !c)}
              className={cn(
                "text-sm rounded-md border px-3 py-1.5 transition-colors duration-100",
                flaggedOnly
                  ? "border-danger/30 bg-dangerSoft text-danger"
                  : "border-line text-muted hover:border-danger/30 hover:text-danger"
              )}>
              {flaggedOnly ? "● " : "○ "}Flagged ({dashboard.attentionAthletes.length})
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{filteredAthletes.length} rows</span>
            <button type="button" onClick={() => setShowFieldsEditor(true)}
              className="flex items-center gap-1.5 text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100">
              <Settings2 size={14} />
              Columns
            </button>
          </div>
        </div>

        {/* ── Roster table ── */}
        <AthleteTable
          athletes={filteredAthletes}
          columnOrder={columnOrder}
          state={filteredAthletes.length ? "default" : "empty"}
        />

        {/* ── Coach note ── */}
        {lowestRecAthlete && (
          <div className="rounded-lg border border-warning/20 bg-warningSoft px-4 py-3 flex items-start gap-2.5">
            <span className="text-warning mt-0.5 shrink-0">▲</span>
            <div>
              <span className="text-sm font-medium text-ink">Coach note — </span>
              <span className="text-sm text-ink">
                {lowestRecAthlete.name} has the lowest readiness
                {lowestRecAthlete.recoveryScore != null ? ` (${lowestRecAthlete.recoveryScore}%)` : ""}
                {" "}— consider reducing load before next session.
              </span>
            </div>
          </div>
        )}

      </div>

      {showFieldsEditor && (
        <EditorPanel
          title="Visible table columns"
          columnOrder={columnOrder}
          onReorder={setColumnOrder}
          onClose={() => setShowFieldsEditor(false)}
        />
      )}
      {showQuickPicker && (
        <QuickMetricsPicker
          selected={quickKeys}
          onToggle={toggleQuickKey}
          onClose={() => setShowQuickPicker(false)}
        />
      )}
      {showAttentionEdit && (
        <AttentionEditModal
          allAthletes={dashboard.athletes}
          excludedIds={attentionExcluded}
          onToggleExclude={toggleAttentionExclude}
          activeMetrics={attentionMetrics}
          onToggleMetric={toggleAttentionMetric}
          onClose={() => setShowAttentionEdit(false)}
        />
      )}
      {showSummaryEdit && (
        <SummaryEditModal
          activeMetrics={summaryMetrics}
          onToggle={toggleSummaryMetric}
          onClose={() => setShowSummaryEdit(false)}
        />
      )}
    </div>
  );
}
