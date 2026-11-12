import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const admins = [
  { name: "Alyssa Jordan", role: "Super Admin", email: "alyssa@webineer.app", status: "active" },
  { name: "Nathan Obi", role: "Platform Admin", email: "nathan@webineer.app", status: "active" },
  { name: "Fola Adeyemi", role: "Technical Admin", email: "fola@webineer.app", status: "review" },
];

export default function AdminAdministratorsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Administrators</h2>
          <p className="text-sm text-secondaryText">Platform staff and access control</p>
        </div>
        <Badge label="3 accounts" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {admins.map((admin) => (
          <div key={admin.email} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{admin.name}</div>
              <div className="text-sm text-secondaryText">{admin.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={admin.role} tone="info" />
              <Badge label={admin.status} tone={admin.status === "active" ? "success" : "warning"} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
