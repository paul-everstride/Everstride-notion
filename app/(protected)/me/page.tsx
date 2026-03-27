import { getDashboardData } from "@/lib/data";
import { requireAuthenticatedUser } from "@/lib/auth";
import { MetricCard } from "@/components/metric-card";
import { TrendChart } from "@/components/trend-chart";
import { RecoveryBadge } from "@/components/recovery-badge";
import { formatSleepDuration } from "@/lib/utils";

export default async function MePage() {
  await requireAuthenticatedUser();
  const { athletes } = await getDashboardData();

  if (!athletes.length) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-muted text-sm">No wearable data found. Connect a device to get started.</p>
      </div>
    );
  }

  // Show the first athlete (most relevant by recovery score)
  const athlete = athletes[0];

  return (
    <div>
      {/* Header */}
      <div className="border-b border-line bg-canvas px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">My Metrics</h1>
            <p className="text-sm text-muted mt-0.5">Athlete view · Latest wearable sync</p>
          </div>
          {athlete.recoveryScore != null && <RecoveryBadge score={athlete.recoveryScore} />}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard title="Recovery" value={athlete.recoveryScore != null ? `${athlete.recoveryScore}` : "N/A"} detail={athlete.statusNote} accent />
          <MetricCard title="HRV" value={athlete.hrv != null ? `${athlete.hrv} ms` : "N/A"} detail="Latest sync" />
          <MetricCard title="Sleep score" value={athlete.sleepScore != null ? `${athlete.sleepScore}` : "N/A"} detail={athlete.sleepEfficiency != null ? `Efficiency ${athlete.sleepEfficiency}%` : "No recent data"} />
          <MetricCard title="Time in bed" value={formatSleepDuration(athlete.totalBedMs)} detail={`RHR ${athlete.restHr != null ? `${athlete.restHr} bpm` : "N/A"}`} />
        </div>

        {/* Readiness summary row */}
        <div className="border border-line rounded-lg overflow-hidden flex flex-wrap divide-x divide-line">
          {[
            { label: "SpO2",      value: athlete.spo2 != null ? `${athlete.spo2}%` : "N/A" },
            { label: "Resp rate", value: athlete.respirationRate != null ? `${athlete.respirationRate} rpm` : "N/A" },
            { label: "Sleep eff",   value: athlete.sleepEfficiency != null ? `${athlete.sleepEfficiency}%` : "N/A" },
            { label: "Consistency", value: athlete.sleepConsistency != null ? `${athlete.sleepConsistency}%` : "N/A" },
            { label: "REM",       value: formatSleepDuration(athlete.totalRemMs) },
            { label: "Deep",      value: formatSleepDuration(athlete.totalSlowWaveMs) },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-xs text-muted mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold tabular text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { label: "Recovery trend — 7 day", data: athlete.readinessTrend, color: "#e16b2b" },
            { label: "Sleep trend — 7 day",    data: athlete.sleepTrend,     color: "#3b82f6" },
          ].map(({ label, data, color }) => (
            <div key={label} className="border border-line rounded-lg overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <p className="text-sm font-medium text-ink">{label}</p>
              </div>
              <TrendChart data={data} color={color} />
            </div>
          ))}
        </div>

        {/* Training load table */}
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-ink">Training load</p>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-line">
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">TSS</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">ATL</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">CTL</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">TSB</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">VO2 max</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted font-medium">FTP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 tabular text-ink border-r border-line">{athlete.tss ?? "N/A"}</td>
                <td className="px-4 py-3 tabular text-ink border-r border-line">{athlete.atl ?? "N/A"}</td>
                <td className="px-4 py-3 tabular text-ink border-r border-line">{athlete.ctl ?? "N/A"}</td>
                <td className={`px-4 py-3 tabular font-semibold border-r border-line ${athlete.tsb != null ? (athlete.tsb >= 0 ? "text-success" : "text-danger") : "text-muted"}`}>
                  {athlete.tsb != null ? `${athlete.tsb >= 0 ? "+" : ""}${athlete.tsb}` : "N/A"}
                </td>
                <td className="px-4 py-3 tabular text-ink border-r border-line">{athlete.vo2Max ?? "N/A"}</td>
                <td className="px-4 py-3 tabular text-ink">{athlete.ftp != null ? `${athlete.ftp}w` : "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
