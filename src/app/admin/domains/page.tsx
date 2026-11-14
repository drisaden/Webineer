import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminDomains } from "@/server/admin/data";

export const dynamic = "force-dynamic";

const demoDomains = [
  { domain: "app.webineer.com", status: "verified" },
  { domain: "events.northstarstudio.co", status: "pending" },
  { domain: "webinars.mentorloop.ai", status: "verified" },
];

export default async function AdminDomainsPage() {
  const domains = await adminDomains(demoDomains);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Domains</h2>
          <p className="text-sm text-secondaryText">Custom domain status and verification records</p>
        </div>
        <Badge label={`${domains.length} domains`} tone="info" />
      </div>

      <div className="divide-y divide-border">
        {domains.map((item) => (
          <div key={item.domain} className="flex items-center justify-between px-5 py-4">
            <div className="font-medium text-primaryText">{item.domain}</div>
            <Badge label={item.status} tone={item.status === "verified" ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
