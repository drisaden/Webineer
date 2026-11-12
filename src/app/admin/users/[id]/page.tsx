import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { platformUsers } from "@/data/mock/admin";

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = platformUsers.find((entry) => entry.id === params.id) ?? platformUsers[0];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-secondaryText">User profile</div>
            <h2 className="mt-1 text-2xl font-semibold text-primaryText">{user.name}</h2>
          </div>
          <Badge label={user.status} tone={user.status === "active" ? "success" : "warning"} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Email</div>
            <div className="mt-2 font-medium text-primaryText">{user.email}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Workspace count</div>
            <div className="mt-2 font-medium text-primaryText">{user.workspaceCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Plan</div>
            <div className="mt-2 font-medium text-primaryText">{user.plan}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-primaryText">Workspace activity</h3>
          <div className="mt-4 space-y-3 text-sm text-secondaryText">
            <p>• Created workspaces: {user.workspaceCount}</p>
            <p>• Published webinars: 9</p>
            <p>• Registrations: 2,540</p>
            <p>• Automations: 5</p>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-primaryText">Account activity</h3>
          <div className="mt-4 space-y-3 text-sm text-secondaryText">
            <p>• Registered: {user.registrationDate}</p>
            <p>• Last login: {user.lastActivity}</p>
            <p>• Support notes: 1 recent note</p>
            <p>• Last admin action: User account reviewed</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
