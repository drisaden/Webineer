import { DashboardShell } from "@/components/layout/dashboard-shell";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";
import { Badge } from "@/components/ui/badge";

export default function UpcomingWebinarsPage() {
  const webinars = mockWebinarRepository.listByStatus("scheduled");

  return (
    <DashboardShell title="Upcoming">
      <div className="space-y-4">
        {webinars.map((webinar) => (
          <div key={webinar.id} className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{webinar.title}</h2>
                  <Badge label={webinar.status} tone="info" />
                </div>
                <p className="mt-2 text-sm text-secondaryText">{webinar.description}</p>
              </div>
              <div className="text-sm text-secondaryText">{new Date(webinar.schedule.startsAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
