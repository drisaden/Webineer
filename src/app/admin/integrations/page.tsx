import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminIntegrations } from "@/server/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const platformIntegrations = await adminIntegrations();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Integrations</h2>
          <p className="text-sm text-secondaryText">Provider configuration and health status</p>
        </div>
        <Badge label={`${platformIntegrations.length} providers`} tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Mode</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last success</th>
            </tr>
          </thead>
          <tbody>
            {platformIntegrations.map((integration) => (
              <tr key={integration.name} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-primaryText">{integration.name}</td>
                <td className="px-5 py-4 text-secondaryText">{integration.category}</td>
                <td className="px-5 py-4 text-secondaryText">{integration.mode}</td>
                <td className="px-5 py-4"><Badge label={integration.status} tone={integration.status === "healthy" ? "success" : "warning"} /></td>
                <td className="px-5 py-4 text-secondaryText">{integration.lastSuccess}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
