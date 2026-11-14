import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { adminWorkspace } from "@/server/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await adminWorkspace(id);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-secondaryText">Workspace overview</div>
            <h2 className="mt-1 text-2xl font-semibold text-primaryText">{workspace.name}</h2>
          </div>
          <Badge label={workspace.status} tone={workspace.status === "active" ? "success" : "warning"} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Owner</div>
            <div className="mt-2 font-medium text-primaryText">{workspace.owner}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Members</div>
            <div className="mt-2 font-medium text-primaryText">{workspace.members}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Usage</div>
            <div className="mt-2 font-medium text-primaryText">{workspace.usage}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-primaryText">Membership</h3>
          <div className="mt-4 space-y-2 text-sm text-secondaryText">
            <p>• Owner: {workspace.owner}</p>
            <p>• Active members: {workspace.members}</p>
            <p>• Webinar count: {workspace.webinars}</p>
            <p>• Plan: {workspace.plan}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-primaryText">Record</h3>
          <div className="mt-4 space-y-2 text-sm text-secondaryText">
            <p>• Created: {workspace.created}</p>
            <p>• Status: {workspace.status}</p>
            <p>• Webinar quota used: {workspace.usage}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
