import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminLandingPages } from "@/server/admin/data";

export const dynamic = "force-dynamic";

const demoLandingPages = [
  { title: "Creator Growth Blueprint", workspace: "Northstar Studio", status: "published" },
  { title: "Launch Workflow Masterclass", workspace: "MentorLoop AI", status: "draft" },
  { title: "Growth Lab Conversion Page", workspace: "ElevateHQ", status: "published" },
];

export default async function AdminLandingPagesPage() {
  const landingPages = await adminLandingPages(demoLandingPages);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Landing pages</h2>
          <p className="text-sm text-secondaryText">Published and draft conversion pages across all workspaces</p>
        </div>
        <Badge label={`${landingPages.length} pages`} tone="info" />
      </div>

      <div className="divide-y divide-border">
        {landingPages.map((page) => (
          <div key={page.title} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{page.title}</div>
              <div className="text-sm text-secondaryText">{page.workspace}</div>
            </div>
            <Badge label={page.status} tone={page.status === "published" ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </Card>
  );
}
