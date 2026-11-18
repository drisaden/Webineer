import { formatDateTime } from "@/lib/datetime";
import { DISPLAY_TZ } from "@/lib/display-timezone";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = { hosted: "Hosted page", inline: "Inline embed", popup: "Popup embed", button: "Button", direct: "Direct", import: "Import" };

/** All registrations in the active workspace, from every publishing method. */
export default async function RegistrantsPage() {
  const user = await getCurrentUser();
  const registrations = user ? await getStore().listWorkspaceRegistrations(user.workspaceId, 500) : [];
  return (
    <DashboardShell title="Registrants">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-secondaryText">{registrations.length === 500 ? "Showing the latest 500 registrations" : `${registrations.length} registration${registrations.length === 1 ? "" : "s"}`}</p>
          </div>
          {registrations.length === 0 ? (
            <p className="text-sm text-secondaryText">
              No registrations yet. Share a webinar&apos;s registration page or embed code to start collecting registrants.{" "}
              <Link href="/dashboard/webinars" className="font-medium text-[#17294B] underline">Go to webinars</Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.1em] text-secondaryText">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Webinar</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Payment</th>
                    <th className="py-2 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-primaryText">{r.name}</p>
                        <p className="text-xs text-secondaryText">{r.email}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <Link href={`/dashboard/webinars/${r.webinarId}`} className="text-[#17294B] hover:underline">{r.webinarTitle}</Link>
                      </td>
                      <td className="py-3 pr-3 text-secondaryText">{SOURCE_LABEL[r.source] ?? r.source}</td>
                      <td className="py-3 pr-3"><Badge label={r.status} tone={r.status === "attended" || r.status === "converted" ? "success" : r.status === "cancelled" ? "warning" : "info"} /></td>
                      <td className="py-3 pr-3 capitalize text-secondaryText">{r.paymentStatus ?? "free"}</td>
                      <td className="py-3 text-secondaryText">{formatDateTime(r.registeredAt, DISPLAY_TZ)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
