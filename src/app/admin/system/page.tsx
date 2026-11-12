import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { systemHealth } from "@/data/mock/admin";

export default function AdminSystemPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {systemHealth.map((item) => (
        <Card key={item.name} className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primaryText">{item.name}</h3>
            <Badge label={item.status} tone={item.status === "Healthy" ? "success" : "warning"} />
          </div>
          <p className="mt-4 text-sm text-secondaryText">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}
