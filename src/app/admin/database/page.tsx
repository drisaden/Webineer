import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function AdminDatabasePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-secondaryText">Database connectivity</p>
          <div className="mt-3 text-2xl font-semibold text-primaryText">Healthy</div>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-secondaryText">Provider</p>
          <div className="mt-3 text-2xl font-semibold text-primaryText">PostgreSQL</div>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-secondaryText">Migration status</p>
          <div className="mt-3 text-2xl font-semibold text-primaryText">Up to date</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primaryText">Database management</h2>
          <Badge label="Technical admin only" tone="warning" />
        </div>

        <div className="mt-4 space-y-3 text-sm text-secondaryText">
          <p>• Connection target: PostgreSQL via DATABASE_URL.</p>
          <p>• Preferred local development target: postgres://postgres:YOUR_PASSWORD@localhost:5432/Webineer_dev.</p>
          <p>• Migrations and schema validation should be run through a controlled deployment or admin maintenance workflow.</p>
          <p>• Destructive resets and production restores require explicit authorization and complete audit logging.</p>
        </div>
      </Card>
    </div>
  );
}
