import { getDashboardData } from "@/lib/data";
import { AthleteTableControls } from "@/components/athlete-table-controls";

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: { flagged?: string };
}) {
  const dashboard = await getDashboardData();
  const attentionIdList = dashboard.attentionAthletes.map(a => a.id);
  const initialFlagged = searchParams.flagged === "1";

  return (
    <div>
      <div className="border-b border-line bg-canvas px-6 py-5">
        <h1 className="text-xl font-semibold text-ink">Athletes</h1>
        <p className="text-sm text-muted mt-0.5">
          Latest wearable sync · recovery, HRV, sleep, and performance
        </p>
      </div>
      <div className="px-6 py-5">
        <AthleteTableControls
          athletes={dashboard.athletes}
          attentionIdList={attentionIdList}
          attentionCount={dashboard.attentionAthletes.length}
          initialFlagged={initialFlagged}
        />
      </div>
    </div>
  );
}
