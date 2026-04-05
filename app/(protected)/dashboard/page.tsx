import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return <DashboardWorkspace dashboard={dashboard} />;
}
