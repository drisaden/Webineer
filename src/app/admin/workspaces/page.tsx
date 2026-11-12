import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformWorkspaces } from "@/data/mock/admin";

export default function AdminWorkspacesPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Workspaces</h2>
          <p className="text-sm text-secondaryText">Customer workspaces and their active usage</p>
        </div>
        <Badge label="4 total" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Workspace</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Members</th>
              <th className="px-5 py-3 font-medium">Webinars</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {platformWorkspaces.map((workspace) => (
              <tr key={workspace.id} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-primaryText">{workspace.name}</td>
                <td className="px-5 py-4 text-secondaryText">{workspace.owner}</td>
                <td className="px-5 py-4 text-secondaryText">{workspace.members}</td>
                <td className="px-5 py-4 text-secondaryText">{workspace.webinars}</td>
                <td className="px-5 py-4 text-secondaryText">{workspace.plan}</td>
                <td className="px-5 py-4"><Badge label={workspace.status} tone={workspace.status === "active" ? "success" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
