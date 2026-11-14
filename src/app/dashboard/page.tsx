import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getDashboardOverview } from "@/server/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return <DashboardOverview data={await getDashboardOverview()} />;
}
