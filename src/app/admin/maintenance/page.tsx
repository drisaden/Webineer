import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function AdminMaintenancePage() {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primaryText">Maintenance</h2>
          <Badge label="Authorized only" tone="warning" />
        </div>
        <div className="mt-4 space-y-3 text-sm text-secondaryText">
          <p>• Safe maintenance mode should be enabled through a controlled deployment or maintenance workflow.</p>
          <p>• Database schema changes and destructive operations require explicit technical admin approval and a recorded reason.</p>
          <p>• No arbitrary client-side migration execution is allowed.</p>
        </div>
      </Card>
    </div>
  );
}
