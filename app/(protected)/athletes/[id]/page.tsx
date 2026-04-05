import { notFound } from "next/navigation";
import { RecoveryBadge } from "@/components/recovery-badge";
import { AthleteDetailPanel } from "@/components/athlete-detail-panel";
import { getAthleteById } from "@/lib/data";
import Link from "next/link";
import { AthleteHeaderClient } from "./athlete-header-client";
import { getSeasonPlan } from "./season-plan-actions";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AthleteDetailPage({ params }: { params: { id: string } }) {
  const [athlete, user] = await Promise.all([getAthleteById(params.id), requireAuthenticatedUser()]);
  if (!athlete) notFound();
  const seasonPlan = await getSeasonPlan(athlete.userId);

  return (
    <div>
      {/* Header */}
      <div className="border-b border-line bg-canvas px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href="/athletes"
              className="text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100 shrink-0">
              ← Athletes
            </Link>
            <AthleteHeaderClient
              athleteId={athlete.userId}
              initialName={athlete.name}
              initialAvatarUrl={athlete.avatarUrl}
              email={athlete.email}
              team={athlete.team}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {athlete.recoveryScore != null && <RecoveryBadge score={athlete.recoveryScore} />}
            <button type="button"
              className="text-sm font-medium text-brand border border-brand/30 rounded-md px-3 py-1.5 hover:bg-brandSoft transition-colors duration-100">
              Export
            </button>
          </div>
        </div>
      </div>

      <AthleteDetailPanel athlete={athlete} seasonPlan={seasonPlan} coachId={user.id} />
    </div>
  );
}
