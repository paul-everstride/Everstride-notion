import { notFound } from "next/navigation";
import { RecoveryBadge } from "@/components/recovery-badge";
import { AthleteDetailPanel } from "@/components/athlete-detail-panel";
import { getAthleteById } from "@/lib/data";
import Link from "next/link";

export default async function AthleteDetailPage({ params }: { params: { id: string } }) {
  const athlete = await getAthleteById(params.id);
  if (!athlete) notFound();

  return (
    <div>
      {/* Header */}
      <div className="border-b border-line bg-canvas px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/athletes"
              className="text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100">
              ← Athletes
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-ink">{athlete.name}</h1>
              <p className="text-sm text-muted mt-0.5">{athlete.email} · {athlete.team}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {athlete.recoveryScore != null && <RecoveryBadge score={athlete.recoveryScore} />}
            <button type="button"
              className="text-sm font-medium text-brand border border-brand/30 rounded-md px-3 py-1.5 hover:bg-brandSoft transition-colors duration-100">
              Export
            </button>
          </div>
        </div>
      </div>

      <AthleteDetailPanel athlete={athlete} />
    </div>
  );
}
