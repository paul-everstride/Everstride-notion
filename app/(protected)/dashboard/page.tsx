import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { getDashboardData } from "@/lib/data";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return <DashboardWorkspace dashboard={dashboard} />;
}
