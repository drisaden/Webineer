import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockWebinars } from "@/data/mock/webinars";

export default function WebinarAnalyticsPage() {
  return (
    <DashboardShell title="Webinar Analytics">
      <div className="space-y-6">
        {mockWebinars.map((webinar) => {
          const registrationRate = Math.round((webinar.registrationCount / Math.max(webinar.attendeeCount, 1)) * 100);
          return (
            <Card key={webinar.id}>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{webinar.title}</h3>
                      <Badge label={webinar.type} tone="info" />
                    </div>
                    <p className="mt-1 text-sm text-secondaryText">{new Date(webinar.schedule.startsAt).toLocaleString()} · {webinar.videoSource.provider}</p>
                  </div>
                  <div className="text-sm text-secondaryText">{webinar.registrationCount} registrations · {webinar.attendeeCount} attendees</div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div><p className="text-sm text-secondaryText">Registration rate</p><p className="text-2xl font-semibold">{registrationRate}%</p></div>
                  <div><p className="text-sm text-secondaryText">CTA clicks</p><p className="text-2xl font-semibold">{Math.round(webinar.registrationCount * 0.15)}</p></div>
                  <div><p className="text-sm text-secondaryText">Replay views</p><p className="text-2xl font-semibold">{Math.round(webinar.attendeeCount * 0.62)}</p></div>
                  <div><p className="text-sm text-secondaryText">Revenue</p><p className="text-2xl font-semibold">₦{Math.round(webinar.registrationCount * 1800).toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
