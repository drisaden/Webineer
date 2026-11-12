import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformWebinars } from "@/data/mock/admin";

export default function AdminWebinarsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Webinars</h2>
          <p className="text-sm text-secondaryText">Platform-wide publish and moderation status</p>
        </div>
        <Badge label="3 monitored" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Workspace</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Registrations</th>
              <th className="px-5 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {platformWebinars.map((webinar) => (
              <tr key={webinar.id} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-primaryText">{webinar.title}</td>
                <td className="px-5 py-4 text-secondaryText">{webinar.workspace}</td>
                <td className="px-5 py-4 text-secondaryText">{webinar.type}</td>
                <td className="px-5 py-4"><Badge label={webinar.status} tone={webinar.status === "published" ? "success" : "warning"} /></td>
                <td className="px-5 py-4 text-secondaryText">{webinar.registrations}</td>
                <td className="px-5 py-4 text-secondaryText">{webinar.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
