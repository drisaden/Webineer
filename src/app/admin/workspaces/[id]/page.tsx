import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformWorkspaces } from "@/data/mock/admin";

export default function AdminWorkspaceDetailPage({ params }: { params: { id: string } }) {
  const workspace = platformWorkspaces.find((entry) => entry.id === params.id) ?? platformWorkspaces[0];

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
          <h3 className="text-lg font-semibold text-primaryText">Recent activity</h3>
          <div className="mt-4 space-y-2 text-sm text-secondaryText">
            <p>• Last webinar published: 2 days ago</p>
            <p>• Last email campaign: 6 hours ago</p>
            <p>• Last payment: completed</p>
            <p>• Last admin note: Workspace reviewed</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
