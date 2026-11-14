import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { formatInZone } from "@/lib/webinar-workflow/time";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

export default async function WebinarAnalyticsPage() {
  const store = getStore();
  const user = await getCurrentUser();
  const webinars = user ? await store.listWebinars(user.workspaceId) : [];
  const rows = await Promise.all(
    webinars.map(async (webinar) => {
      const [funnel, registrations] = await Promise.all([store.getRegistrationFunnel(webinar.id), store.listRegistrations(webinar.id)]);
      const active = registrations.filter((r) => r.status !== "cancelled");
      const attended = active.filter((r) => r.status === "attended" || r.status === "converted").length;
      return { webinar, funnel, active: active.length, attended, paid: active.filter((r) => r.paymentStatus === "paid").length };
    }),
  );

  return (
    <DashboardShell title="Webinar Analytics">
      <div className="space-y-6">
        {rows.length === 0 && (
          <Card><CardContent><p className="text-sm text-secondaryText">No webinars yet. Analytics appear once you publish a webinar and people register.</p></CardContent></Card>
        )}
        {rows.map(({ webinar, funnel, active, attended, paid }) => (
          <Card key={webinar.id}>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{webinar.title}</h3>
                    <Badge label={webinar.type} tone="info" />
                  </div>
                  <p className="mt-1 text-sm text-secondaryText">{formatInZone(webinar.schedule.startsAt, webinar.schedule.timezone)} · {webinar.videoSource.provider}</p>
                </div>
                <div className="text-sm text-secondaryText">{active} registrations · {attended} attendees</div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-sm text-secondaryText">Page views</p><p className="text-2xl font-semibold">{funnel.pageViews}</p></div>
                <div><p className="text-sm text-secondaryText">Conversion rate</p><p className="text-2xl font-semibold">{funnel.conversionRate === null ? "—" : `${funnel.conversionRate}%`}</p></div>
                <div><p className="text-sm text-secondaryText">Attendance rate</p><p className="text-2xl font-semibold">{active ? `${Math.round((attended / active) * 100)}%` : "—"}</p></div>
                <div><p className="text-sm text-secondaryText">Paid registrations</p><p className="text-2xl font-semibold">{paid}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
