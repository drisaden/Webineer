import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const emailStatus = [
  { name: "SMTP provider", status: "Healthy" },
  { name: "Delivery queue", status: "Running" },
  { name: "Failed messages", status: "2" },
  { name: "Suppressed recipients", status: "14" },
];

export default function AdminEmailPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {emailStatus.map((item) => (
        <Card key={item.name} className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primaryText">{item.name}</h3>
            <Badge label={item.status} tone={item.status === "Healthy" ? "success" : "info"} />
          </div>
        </Card>
      ))}
    </div>
  );
}
