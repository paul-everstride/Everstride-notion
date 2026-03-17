import { CompareWorkbench } from "@/components/compare-workbench";
import { getDashboardData } from "@/lib/data";
import Link from "next/link";

export default async function ComparePerformancePage() {
  const dashboard = await getDashboardData();

  return (
    <div>
      {/* Header */}
      <div className="border-b border-line bg-canvas px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Performance Compare</h1>
            <p className="text-sm text-muted mt-0.5">
              Power · FTP · VO2 max · TSS · TSB · Sleep efficiency · multi-week trend &amp; benchmark board
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/compare/readiness"
              className="text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100"
            >
              ← Readiness
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              className="text-sm font-medium text-brand border border-brand/30 rounded-md px-3 py-1.5 hover:bg-brandSoft transition-colors duration-100"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <CompareWorkbench athletes={dashboard.athletes} section="performance" />
      </div>
    </div>
  );
}
