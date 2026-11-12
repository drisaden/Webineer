import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const settings = [
  { section: "General", value: "Platform name and branding" },
  { section: "Registration", value: "Email verification required" },
  { section: "Email", value: "SMTP and sender defaults enabled" },
  { section: "Payments", value: "Test mode enabled for local development" },
  { section: "Security", value: "Session policy and admin review required" },
  { section: "Maintenance", value: "Maintenance mode disabled" },
];

export default function AdminSettingsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {settings.map((setting) => (
        <Card key={setting.section} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primaryText">{setting.section}</h3>
            <Badge label="Configured" tone="success" />
          </div>
          <p className="mt-4 text-sm text-secondaryText">{setting.value}</p>
        </Card>
      ))}
    </div>
  );
}
