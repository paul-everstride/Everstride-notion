"use client";

import { useMemo, useState } from "react";
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

// ── Column config ──────────────────────────────────────────────────────────────

const columnOptions: Array<{ key: AthleteColumnKey; label: string }> = [
  { key: "name",      label: "Name"       },
  { key: "age",       label: "Age"        },
  { key: "weight",    label: "Weight"     },
  { key: "team",      label: "Team"       },
  { key: "recovery",  label: "Recovery"   },
  { key: "sleep",     label: "Sleep"      },
  { key: "rhr",       label: "RHR"        },
  { key: "hrv",       label: "HRV"        },
  { key: "atl",       label: "ATL"        },
  { key: "ctl",       label: "CTL"        },
  { key: "tsb",       label: "TSB"        },
  { key: "vo2",       label: "VO2 max"    },
  { key: "ftp",       label: "FTP"        },
  { key: "polarized", label: "Polarized"  },
  { key: "powerMax",  label: "Power max"  }
];

// ── Stat strip cell ───────────────────────────────────────────────────────────

function StatCell({ label, value, valueClass = "text-ink" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="px-4 py-3 border-r border-line last:border-r-0">
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular ${valueClass}`}>{value}</p>
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
    <div className="border border-line bg-canvas rounded-lg flex flex-col h-full overflow-hidden">
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
    pick: athletes => [...athletes].sort((a, b) => b.recoveryScore - a.recoveryScore)[0],
    value: a => `${a.recoveryScore}`,
    secondary: a => `HRV ${a.hrv} ms · RHR ${a.restHr}`,
  },
  {
    key: "lowest_recovery",
    label: "Lowest Recovery",
    icon: <TrendingDown size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].sort((a, b) => a.recoveryScore - b.recoveryScore)[0],
    value: a => `${a.recoveryScore}`,
    secondary: a => `HRV ${a.hrv} ms · RHR ${a.restHr}`,
  },
  {
    key: "highest_tss",
    label: "Highest TSS",
    icon: <Zap size={16} />,
    accentColor: "#d97706",
    pick: athletes => [...athletes].sort((a, b) => b.tss - a.tss)[0],
    value: a => `${a.tss}`,
    secondary: a => `ATL ${a.atl} · CTL ${a.ctl}`,
  },
  {
    key: "lowest_rhr",
    label: "Lowest RHR",
    icon: <Heart size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].sort((a, b) => a.restHr - b.restHr)[0],
    value: a => `${a.restHr} bpm`,
    secondary: a => `REC ${a.recoveryScore} · HRV ${a.hrv} ms`,
  },
  {
    key: "highest_hrv",
    label: "Highest HRV",
    icon: <Activity size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].sort((a, b) => b.hrv - a.hrv)[0],
    value: a => `${a.hrv} ms`,
    secondary: a => `REC ${a.recoveryScore} · RHR ${a.restHr}`,
  },
  {
    key: "lowest_hrv",
    label: "Lowest HRV",
    icon: <TrendingDown size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].sort((a, b) => a.hrv - b.hrv)[0],
    value: a => `${a.hrv} ms`,
    secondary: a => `REC ${a.recoveryScore} · RHR ${a.restHr}`,
  },
  {
    key: "highest_sleep",
    label: "Highest Sleep",
    icon: <Moon size={16} />,
    accentColor: "#8b5cf6",
    pick: athletes => [...athletes].sort((a, b) => b.sleepScore - a.sleepScore)[0],
    value: a => `${a.sleepScore}`,
    secondary: a => `Eff ${a.sleepEfficiency}% · HRV ${a.hrv} ms`,
  },
  {
    key: "lowest_sleep",
    label: "Lowest Sleep",
    icon: <Moon size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].sort((a, b) => a.sleepScore - b.sleepScore)[0],
    value: a => `${a.sleepScore}`,
    secondary: a => `Eff ${a.sleepEfficiency}% · HRV ${a.hrv} ms`,
  },
  {
    key: "highest_ctl",
    label: "Highest CTL",
    icon: <TrendingUp size={16} />,
    accentColor: "#3b82f6",
    pick: athletes => [...athletes].sort((a, b) => b.ctl - a.ctl)[0],
    value: a => `${a.ctl}`,
    secondary: a => `ATL ${a.atl} · TSB ${formatSignedNumber(a.tsb)}`,
  },
  {
    key: "lowest_ctl",
    label: "Lowest CTL",
    icon: <TrendingDown size={16} />,
    accentColor: "#e16b2b",
    pick: athletes => [...athletes].sort((a, b) => a.ctl - b.ctl)[0],
    value: a => `${a.ctl}`,
    secondary: a => `ATL ${a.atl} · TSB ${formatSignedNumber(a.tsb)}`,
  },
  {
    key: "freshest_tsb",
    label: "Freshest (TSB)",
    icon: <Flame size={16} />,
    accentColor: "#059669",
    pick: athletes => [...athletes].sort((a, b) => b.tsb - a.tsb)[0],
    value: a => formatSignedNumber(a.tsb),
    secondary: a => `ATL ${a.atl} · CTL ${a.ctl}`,
  },
  {
    key: "most_fatigued_tsb",
    label: "Most Fatigued (TSB)",
    icon: <Flame size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].sort((a, b) => a.tsb - b.tsb)[0],
    value: a => formatSignedNumber(a.tsb),
    secondary: a => `ATL ${a.atl} · CTL ${a.ctl}`,
  },
  {
    key: "highest_ftp",
    label: "Highest FTP",
    icon: <Dumbbell size={16} />,
    accentColor: "#e16b2b",
    pick: athletes => [...athletes].sort((a, b) => b.ftp - a.ftp)[0],
    value: a => `${a.ftp}w`,
    secondary: a => `VO2 ${a.vo2Max} · Power ${a.powerMax}w`,
  },
  {
    key: "highest_vo2",
    label: "Highest VO2 max",
    icon: <Wind size={16} />,
    accentColor: "#06b6d4",
    pick: athletes => [...athletes].sort((a, b) => b.vo2Max - a.vo2Max)[0],
    value: a => `${a.vo2Max}`,
    secondary: a => `FTP ${a.ftp}w · REC ${a.recoveryScore}`,
  },
  {
    key: "highest_power",
    label: "Highest Power Max",
    icon: <Zap size={16} />,
    accentColor: "#d97706",
    pick: athletes => [...athletes].sort((a, b) => b.powerMax - a.powerMax)[0],
    value: a => `${a.powerMax}w`,
    secondary: a => `FTP ${a.ftp}w · VO2 ${a.vo2Max}`,
  },
  {
    key: "highest_atl",
    label: "Highest ATL",
    icon: <BarChart2 size={16} />,
    accentColor: "#dc2626",
    pick: athletes => [...athletes].sort((a, b) => b.atl - a.atl)[0],
    value: a => `${a.atl}`,
    secondary: a => `CTL ${a.ctl} · TSB ${formatSignedNumber(a.tsb)}`,
  },
];

const DEFAULT_QUICK_KEYS = ["highest_recovery", "highest_tss", "lowest_rhr", "lowest_ctl"];

// ── Attention monitor config ──────────────────────────────────────────────────

type AttentionMetricKey = "recovery" | "tsb" | "hrv" | "rhr" | "sleep" | "spo2" | "atl";

const ATTENTION_METRIC_OPTIONS: { key: AttentionMetricKey; label: string; description: string }[] = [
  { key: "recovery", label: "Recovery score", description: "Flag if score < 60"   },
  { key: "tsb",      label: "TSB (Form)",     description: "Flag if TSB < −10"    },
  { key: "hrv",      label: "HRV",            description: "Flag if HRV < 50 ms"  },
  { key: "rhr",      label: "Resting HR",     description: "Flag if RHR > 65 bpm" },
  { key: "sleep",    label: "Sleep score",    description: "Flag if score < 60"   },
  { key: "spo2",     label: "SpO₂",           description: "Flag if < 95%"        },
  { key: "atl",      label: "ATL",            description: "Flag if ATL > 100"    },
];

const DEFAULT_ATTENTION_METRICS: AttentionMetricKey[] = ["recovery", "tsb"];

function athleteNeedsAttention(a: AthleteSummary, metrics: AttentionMetricKey[]): boolean {
  return metrics.some(m => {
    if (m === "recovery") return a.recoveryScore < 60;
    if (m === "tsb")      return a.tsb < -10;
    if (m === "hrv")      return a.hrv < 50;
    if (m === "rhr")      return a.restHr > 65;
    if (m === "sleep")    return a.sleepScore < 60;
    if (m === "spo2")     return a.spo2 < 95;
    if (m === "atl")      return a.atl > 100;
    return false;
  });
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

function AttentionMonitor({ athletes }: { athletes: AthleteSummary[] }) {
  const count = athletes.length;
  const allClear = count === 0;

  return (
    <div className={cn(
      "border rounded-lg flex flex-col flex-1 overflow-hidden",
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
          athletes.map((athlete, i) => (
            <Link
              key={athlete.id}
              href={`/athletes/${athlete.id}`}
              className="group flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 hover:bg-surface transition-colors duration-100"
            >
              <span className="text-xs text-muted w-5 tabular shrink-0">{i + 1}.</span>
              <span className="flex-1 text-sm font-medium text-ink group-hover:text-brand transition-colors duration-100">
                {athlete.name}
              </span>
              <span className="text-xs tabular text-muted mr-2">
                TSB {formatSignedNumber(athlete.tsb)}
              </span>
              <RecoveryBadge score={athlete.recoveryScore} />
            </Link>
          ))
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

function AiSummaryCard({ data, summaryMetrics }: { data: DashboardData; summaryMetrics: SummaryMetricKey[] }) {
  const flagCount = data.attentionAthletes.length;
  const avgAtl = Math.round(data.athletes.reduce((s, a) => s + a.atl, 0) / (data.athletes.length || 1));
  const avgCtl = Math.round(data.athletes.reduce((s, a) => s + a.ctl, 0) / (data.athletes.length || 1));
  const avgFtp = Math.round(data.athletes.reduce((s, a) => s + a.ftp, 0) / (data.athletes.length || 1));
  const avgVo2 = Math.round(data.athletes.reduce((s, a) => s + a.vo2Max, 0) / (data.athletes.length || 1));

  const sentences: string[] = [];
  if (summaryMetrics.includes("recovery")) {
    const ok = data.teamAverageRecovery >= 70;
    sentences.push(ok
      ? `Team recovery is strong at ${data.teamAverageRecovery}.`
      : `Team recovery is below target at ${data.teamAverageRecovery} — consider reducing load.`);
  }
  if (summaryMetrics.includes("flagCount")) {
    sentences.push(flagCount > 0
      ? `${flagCount} athlete${flagCount > 1 ? "s" : ""} flagged for attention.`
      : "No athletes flagged.");
  }
  if (summaryMetrics.includes("hrv"))  sentences.push(`Team HRV avg ${data.teamAverageHrv} ms.`);
  if (summaryMetrics.includes("sleep")) sentences.push(`Team sleep avg ${data.teamAverageSleep}.`);
  if (summaryMetrics.includes("atl"))  sentences.push(`Team ATL avg ${avgAtl}.`);
  if (summaryMetrics.includes("ctl"))  sentences.push(`Team CTL avg ${avgCtl}.`);
  if (summaryMetrics.includes("ftp"))  sentences.push(`Team FTP avg ${avgFtp}w.`);
  if (summaryMetrics.includes("vo2"))  sentences.push(`Team VO2 avg ${avgVo2}.`);

  return (
    <div className="border border-warning/20 rounded-lg flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Sparkles size={14} className="text-warning shrink-0" />
        <span className="text-sm font-medium text-ink flex-1">AI Summary</span>
        <span className="text-xs text-muted bg-surface rounded-full px-2.5 py-0.5">Coach view</span>
      </div>

      <div className="px-4 py-3 flex-1">
        {sentences.length > 0 ? (
          <p className="text-sm text-ink leading-6">{sentences.join(" ")}</p>
        ) : (
          <p className="text-sm text-muted italic">No metrics selected.</p>
        )}
        <p className="text-xs text-muted leading-5 mt-2">
          Squad split between green athletes and reduced-load candidates.
          Filters and compare active.
        </p>
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

function EditorPanel({
  title, items, selected, onToggle, onClose
}: {
  title: string;
  items: Array<{ key: string; label: string }>;
  selected: string[];
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
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
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const active = selected.includes(item.key);
            return (
              <button key={item.key} type="button" onClick={() => onToggle(item.key)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm rounded-md border transition-colors duration-100",
                  active
                    ? "border-brand/20 bg-brandSoft text-ink"
                    : "border-transparent bg-surface text-muted hover:text-ink hover:bg-surfaceStrong"
                )}>
                <span>{item.label}</span>
                <span className={cn("text-xs ml-2 font-medium", active ? "text-brand" : "text-muted/50")}>
                  {active ? "On" : "Off"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── DashboardWorkspace ────────────────────────────────────────────────────────

export function DashboardWorkspace({ dashboard }: { dashboard: DashboardData }) {
  const [search, setSearch]               = useState("");
  const [flaggedOnly, setFlaggedOnly]     = useState(false);
  const [showFieldsEditor, setShowFieldsEditor] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<AthleteColumnKey[]>(defaultAthleteColumns);
  const [quickKeys, setQuickKeys]         = useState<string[]>(DEFAULT_QUICK_KEYS);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  // Attention monitor config
  const [attentionExcluded, setAttentionExcluded] = useState<string[]>([]);
  const [attentionMetrics,  setAttentionMetrics]  = useState<AttentionMetricKey[]>(DEFAULT_ATTENTION_METRICS);
  const [showAttentionEdit, setShowAttentionEdit] = useState(false);

  // AI summary config
  const [summaryMetrics,    setSummaryMetrics]    = useState<SummaryMetricKey[]>(DEFAULT_SUMMARY_METRICS);
  const [showSummaryEdit,   setShowSummaryEdit]   = useState(false);

  const attentionIds = useMemo(
    () => new Set(dashboard.attentionAthletes.map(a => a.id)),
    [dashboard.attentionAthletes]
  );

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dashboard.athletes.filter(athlete => {
      if (flaggedOnly && !attentionIds.has(athlete.id)) return false;
      if (!query) return true;
      return [athlete.name, athlete.email, athlete.team].some(v => v.toLowerCase().includes(query));
    });
  }, [attentionIds, dashboard.athletes, flaggedOnly, search]);

  const lowestRecAthlete = useMemo(
    () => [...dashboard.athletes].sort((a, b) => a.recoveryScore - b.recoveryScore)[0],
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

  const toggleColumn = (key: string) => {
    setVisibleColumns(c =>
      c.includes(key as AthleteColumnKey) ? c.filter(v => v !== key) : [...c, key as AthleteColumnKey]
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              Next event: <span className="text-ink font-medium">Apr 18, 2026 · Girona Camp</span>
            </span>
            <Link href="/compare"
              className="text-sm font-medium text-brand hover:text-brandInk transition-colors duration-100">
              Compare →
            </Link>
          </div>
        </div>

        {/* Team stats strip */}
        <div className="flex flex-wrap gap-0 mt-4 border border-line rounded-lg overflow-hidden">
          <StatCell label="Team avg recovery"
            value={`${dashboard.teamAverageRecovery}`}
            valueClass={dashboard.teamAverageRecovery >= 70 ? "text-success" : dashboard.teamAverageRecovery >= 40 ? "text-warning" : "text-danger"} />
          <StatCell label="Team avg sleep" value={`${dashboard.teamAverageSleep}`} />
          <StatCell label="Team avg HRV" value={`${dashboard.teamAverageHrv} ms`} />
          <StatCell label="Flagged"
            value={`${dashboard.attentionAthletes.length}`}
            valueClass={dashboard.attentionAthletes.length > 0 ? "text-danger" : "text-success"} />
          <StatCell label="Athletes" value={`${dashboard.athletes.length}`} />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* ── Top section ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">

          {/* 2×2 metric cards */}
          <div className="lg:col-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Quick view</span>
              <button type="button" onClick={() => setShowQuickPicker(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted border border-line rounded-md px-2 py-1 hover:text-ink hover:border-ink/30 hover:bg-surfaceStrong transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {activeQuickMetrics.map(m => {
                const athlete = m.pick(dashboard.athletes);
                return athlete ? (
                  <MetricCard key={m.key}
                    icon={m.icon}
                    label={m.label}
                    value={m.value(athlete)}
                    athleteName={athlete.name}
                    secondary={m.secondary(athlete)}
                    accentColor={m.accentColor}
                  />
                ) : null;
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
              <span className="text-xs text-muted">Attention</span>
              <button type="button" onClick={() => setShowAttentionEdit(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted border border-line rounded-md px-2 py-1 hover:text-ink hover:border-ink/30 hover:bg-surfaceStrong transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <AttentionMonitor athletes={configuredAttentionAthletes} />
          </div>

          {/* AI summary */}
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">AI Summary</span>
              <button type="button" onClick={() => setShowSummaryEdit(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted border border-line rounded-md px-2 py-1 hover:text-ink hover:border-ink/30 hover:bg-surfaceStrong transition-colors duration-100">
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <AiSummaryCard data={dashboard} summaryMetrics={summaryMetrics} />
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
          visibleColumns={visibleColumns}
          state={filteredAthletes.length ? "default" : "empty"}
        />

        {/* ── Coach note ── */}
        {lowestRecAthlete && (
          <div className="rounded-lg border border-warning/20 bg-warningSoft px-4 py-3 flex items-start gap-2.5">
            <span className="text-warning mt-0.5 shrink-0">▲</span>
            <div>
              <span className="text-sm font-medium text-ink">Coach note — </span>
              <span className="text-sm text-ink">
                {lowestRecAthlete.name} has the lowest readiness. TSS {lowestRecAthlete.tss} · TSB {formatSignedNumber(lowestRecAthlete.tsb)} — consider reducing load before next session.
              </span>
            </div>
          </div>
        )}

      </div>

      {showFieldsEditor && (
        <EditorPanel
          title="Visible table columns"
          items={columnOptions}
          selected={visibleColumns}
          onToggle={toggleColumn}
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
