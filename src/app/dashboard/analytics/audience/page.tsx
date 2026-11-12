import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const audienceGroups = [
  { name: "Registered but never attended", count: 214, metric: "32%" },
  { name: "Attended at least once", count: 438, metric: "66%" },
  { name: "Purchased a ticket", count: 117, metric: "18%" },
  { name: "Clicked a CTA", count: 196, metric: "27%" },
  { name: "Watched replay", count: 284, metric: "41%" },
];

export default function AudienceAnalyticsPage() {
  return (
    <DashboardShell title="Audience Analytics">
      <div className="space-y-6">
        {audienceGroups.map((group) => (
          <Card key={group.name}>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{group.name}</h3>
                <p className="text-sm text-secondaryText">Measured from actual registration and room events</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={`${group.metric} share`} tone="info" />
                <span className="text-2xl font-semibold">{group.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
