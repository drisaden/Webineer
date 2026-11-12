import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const storage = [
  { name: "Storage provider", value: "S3-compatible object storage" },
  { name: "Objects stored", value: "48.2k" },
  { name: "Used capacity", value: "1.28 TB" },
  { name: "Failed uploads", value: "8" },
];

export default function AdminStoragePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {storage.map((entry) => (
        <Card key={entry.name} className="p-5">
          <p className="text-sm text-secondaryText">{entry.name}</p>
          <div className="mt-3 text-2xl font-semibold text-primaryText">{entry.value}</div>
        </Card>
      ))}
    </div>
  );
}
