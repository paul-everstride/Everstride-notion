import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { getDashboardData, IS_DEMO_DATA, loadTeamState } from "@/lib/data";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (IS_DEMO_DATA) {
    loadTeamState(cookies().get("demo_teams")?.value);
  }
  const dashboard = await getDashboardData();

  return <DashboardWorkspace dashboard={dashboard} />;
}
