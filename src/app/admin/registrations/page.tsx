import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const registrations = [
  { webinar: "Scaling a Creator Business Without Burnout", email: "amber@northstarstudio.co", status: "confirmed", seat: "VIP" },
  { webinar: "Private Growth Lab", email: "julia@elevatehq.io", status: "waitlist", seat: "General" },
  { webinar: "Product Demo: Launch Workflow Masterclass", email: "leo@mentorloop.ai", status: "confirmed", seat: "Pro" },
];

export default function AdminRegistrationsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Registrations</h2>
          <p className="text-sm text-secondaryText">Cross-workspace attendance and issue review</p>
        </div>
        <Badge label="3 recent" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Webinar</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Seat</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((entry) => (
              <tr key={`${entry.webinar}-${entry.email}`} className="border-t border-border">
                <td className="px-5 py-4 text-primaryText">{entry.webinar}</td>
                <td className="px-5 py-4 text-secondaryText">{entry.email}</td>
                <td className="px-5 py-4 text-secondaryText">{entry.seat}</td>
                <td className="px-5 py-4"><Badge label={entry.status} tone={entry.status === "confirmed" ? "success" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
