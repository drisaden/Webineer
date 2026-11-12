import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformUsers } from "@/data/mock/admin";

export default function AdminUsersPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Users</h2>
          <p className="text-sm text-secondaryText">Platform-wide user records and workspace access</p>
        </div>
        <Badge label="12 search results" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Workspaces</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {platformUsers.map((user) => (
              <tr key={user.id} className="border-t border-border">
                <td className="px-5 py-4">
                  <div className="font-medium text-primaryText">{user.name}</div>
                  <div className="text-xs text-secondaryText">{user.role}</div>
                </td>
                <td className="px-5 py-4 text-secondaryText">{user.email}</td>
                <td className="px-5 py-4"><Badge label={user.status} tone={user.status === "active" ? "success" : "warning"} /></td>
                <td className="px-5 py-4 text-secondaryText">{user.workspaceCount}</td>
                <td className="px-5 py-4 text-secondaryText">{user.plan}</td>
                <td className="px-5 py-4 text-secondaryText">{user.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
