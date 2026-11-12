import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const roles = [
  { name: "Super Admin", scope: "Full platform access" },
  { name: "Platform Admin", scope: "Workspace and webinar management" },
  { name: "Support Admin", scope: "Customer support and account review" },
  { name: "Finance Admin", scope: "Transactions and subscription review" },
  { name: "Technical Admin", scope: "Infrastructure and database health" },
];

export default function AdminRolesPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Roles & Permissions</h2>
          <p className="text-sm text-secondaryText">Permission-based authorization model</p>
        </div>
        <Badge label="5 roles" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {roles.map((role) => (
          <div key={role.name} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{role.name}</div>
              <div className="text-sm text-secondaryText">{role.scope}</div>
            </div>
            <Badge label="Permission set" tone="success" />
          </div>
        ))}
      </div>
    </Card>
  );
}
