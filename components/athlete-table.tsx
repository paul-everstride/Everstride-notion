import Link from "next/link";
import type { AthleteSummary } from "@/lib/types";
import { PolarizedBar } from "@/components/polarized-bar";
import { formatSignedNumber, formatWeight, getRecoveryTone } from "@/lib/utils";

export type AthleteColumnKey =
  | "name"
  | "age"
  | "weight"
  | "team"
  | "recovery"
  | "sleep"
  | "rhr"
  | "hrv"
  | "atl"
  | "ctl"
  | "tsb"
  | "vo2"
  | "ftp"
  | "polarized"
  | "powerMax";

type AthleteTableProps = {
  athletes: AthleteSummary[];
  visibleColumns?: AthleteColumnKey[];
  columnOrder?: AthleteColumnKey[];
  state?: "default" | "loading" | "empty" | "error";
};

type ColumnDefinition = {
  key: AthleteColumnKey;
  group: "Athlete" | "Readiness" | "Performance";
  label: string;
  align?: "right";
  render: (athlete: AthleteSummary) => React.ReactNode;
};

export const defaultAthleteColumns: AthleteColumnKey[] = [
  "name",
  "age",
  "weight",
  "team",
  "recovery",
  "sleep",
  "rhr",
  "hrv",
  "atl",
  "ctl",
  "tsb",
  "vo2",
  "ftp",
  "polarized",
  "powerMax"
];

function RecoveryCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted tabular">—</span>;
  const tone = getRecoveryTone(score);
  const colorMap = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  };
  return <span className={`font-semibold tabular ${colorMap[tone]}`}>{score}</span>;
}

function TsbCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted tabular">—</span>;
  if (value > 0) return <span className="text-success tabular font-medium">+{value}</span>;
  if (value < 0) return <span className="text-danger tabular font-medium">{value}</span>;
  return <span className="text-muted tabular">0</span>;
}

const columnDefinitions: ColumnDefinition[] = [
  {
    key: "name",
    group: "Athlete",
    label: "Name",
    render: (athlete) => {
      const initials = athlete.name.split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
      return (
        <div className="flex items-center justify-between gap-3 min-w-[180px]">
          <div className="flex items-center gap-2.5">
            {athlete.avatarUrl ? (
              <img src={athlete.avatarUrl} alt={athlete.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-line" loading="eager" fetchPriority="high" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surfaceStrong border border-line flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-muted">{initials}</span>
              </div>
            )}
            <div>
              <p className="m-0 font-medium text-ink text-sm">{athlete.name}</p>
              <p className="mt-0.5 text-xs text-muted truncate max-w-[120px]">{athlete.email ?? "—"}</p>
            </div>
          </div>
          <Link
            href={`/athletes/${athlete.id}`}
            className="shrink-0 text-xs text-blue hover:text-blue/80 transition-colors duration-100"
          >
            ↗
          </Link>
        </div>
      );
    }
  },
  { key: "age",      group: "Athlete",      label: "Age",     align: "right", render: (a) => <span className="tabular">{a.age ?? "—"}</span> },
  { key: "weight",   group: "Athlete",      label: "Wt (kg)", align: "right", render: (a) => <span className="tabular">{formatWeight(a.weightKg)}</span> },
  { key: "team",     group: "Athlete",      label: "Team",    render: (a) => <span className="text-muted text-xs">{a.team}</span> },
  { key: "recovery", group: "Readiness",    label: "REC",     render: (a) => <RecoveryCell score={a.recoveryScore} /> },
  { key: "sleep",    group: "Readiness",    label: "SLP",     align: "right", render: (a) => <span className="tabular">{a.sleepScore != null ? a.sleepScore : "—"}</span> },
  { key: "rhr",      group: "Readiness",    label: "RHR",     align: "right", render: (a) => <span className="tabular">{a.restHr != null ? a.restHr : "—"}</span> },
  { key: "hrv",      group: "Readiness",    label: "HRV",     align: "right", render: (a) => <span className="tabular">{a.hrv != null ? a.hrv : "—"}</span> },
  { key: "atl",      group: "Performance",  label: "ATL",     render: (a) => <span className="tabular">{a.atl != null ? a.atl : "—"}</span> },
  { key: "ctl",      group: "Performance",  label: "CTL",     align: "right", render: (a) => <span className="tabular">{a.ctl != null ? a.ctl : "—"}</span> },
  { key: "tsb",      group: "Performance",  label: "TSB",     align: "right", render: (a) => <TsbCell value={a.tsb} /> },
  { key: "vo2",      group: "Performance",  label: "VO2",     align: "right", render: (a) => <span className="tabular">{a.vo2Max != null ? a.vo2Max : "—"}</span> },
  { key: "ftp",      group: "Performance",  label: "FTP",     align: "right", render: (a) => <span className="tabular">{a.ftp != null ? `${a.ftp}w` : "—"}</span> },
  { key: "polarized",group: "Performance",  label: "Zones",   render: (a) => <PolarizedBar zones={a.polarizedZones} compact /> },
  { key: "powerMax", group: "Performance",  label: "Pwr Max", align: "right", render: (a) => <span className="tabular">{a.powerMax != null ? `${a.powerMax}w` : "—"}</span> }
];

const groupMeta = {
  Athlete:     { textClass: "text-muted",  bgClass: "" },
  Readiness:   { textClass: "text-blue",   bgClass: "bg-blue-50/50" },
  Performance: { textClass: "text-brand",  bgClass: "bg-orange-50/50" },
} as const;

export function AthleteTable({ athletes, visibleColumns = defaultAthleteColumns, columnOrder, state = "default" }: AthleteTableProps) {
  if (state === "loading") {
    return (
      <div className="border border-line rounded-xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0">
            <div className="w-8 h-8 skeleton skeleton-round" />
            <div className="h-3 w-32 skeleton" />
            <div className="h-3 w-10 skeleton ml-auto" />
            <div className="h-3 w-10 skeleton" />
            <div className="h-3 w-10 skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-40 items-center justify-center border border-line rounded-lg text-sm text-muted">
        Failed to load athletes
      </div>
    );
  }

  if (state === "empty" || athletes.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center border border-line rounded-lg">
        <p className="text-sm text-muted">No athletes match the current filters</p>
      </div>
    );
  }

  const orderedKeys = columnOrder ?? visibleColumns ?? defaultAthleteColumns;
  const keyToCol = new Map(columnDefinitions.map(c => [c.key, c]));
  const activeColumns = orderedKeys.map(key => keyToCol.get(key)).filter((c): c is ColumnDefinition => c !== undefined);
  const groups = ["Athlete", "Readiness", "Performance"] as const;

  return (
    <div className="overflow-x-auto border border-line rounded-lg">
      <table className="min-w-full w-max divide-y divide-line text-sm">
        {/* Group header row */}
        <thead>
          <tr className="bg-surface">
            {groups.map((group) => {
              const count = activeColumns.filter((col) => col.group === group).length;
              if (!count) return null;
              const meta = groupMeta[group];
              return (
                <th
                  key={group}
                  colSpan={count}
                  className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-line ${meta.textClass} ${meta.bgClass}`}
                >
                  {group}
                </th>
              );
            })}
          </tr>
          {/* Column label row */}
          <tr className="bg-surface border-b border-line">
            {activeColumns.map((col) => {
              const meta = groupMeta[col.group];
              return (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium text-xs text-muted whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"} ${meta.bgClass}`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-canvas">
          {athletes.map((athlete) => (
            <tr
              key={athlete.id}
              className="transition-colors duration-75 hover:bg-surface"
            >
              {activeColumns.map((col) => (
                <td
                  key={`${athlete.id}-${col.key}`}
                  className={`px-4 py-2.5 text-ink whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.render(athlete)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
