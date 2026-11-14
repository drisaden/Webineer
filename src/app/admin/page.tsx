import { AdminOverview } from "@/components/admin/admin-overview";
import { adminOverview } from "@/server/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  return <AdminOverview data={await adminOverview()} />;
}
