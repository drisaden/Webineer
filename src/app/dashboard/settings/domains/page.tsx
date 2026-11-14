import { CheckCircle2, Globe2, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { customDomainService } from "@/services/custom-domain-service";
import { getWorkspaceDomains } from "@/server/workspace-pages";

export const dynamic = "force-dynamic";


export default async function DomainsSettingsPage() {
  const { rows: domains, unavailable } = await getWorkspaceDomains(customDomainService.listDomains());
  return (
    <DashboardShell title="Custom Domains & Branding">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Primary domain</span><Globe2 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-2xl font-semibold">{domains[0]?.domain || "Not set"}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Verification</span><ShieldCheck className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-2xl font-semibold">Verified</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">SSL</span><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-2xl font-semibold">Active</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Domain verification flow</h3>
            {unavailable && <p className="text-sm text-secondaryText">Custom domains aren&apos;t available yet. Your registration pages, embeds and webinar rooms are served from the main Webineer domain.</p>}
            {domains.map((domain) => (
              <div key={domain.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{domain.domain}</h4>
                    <p className="text-sm text-secondaryText">CNAME target: {domain.cnameTarget}</p>
                  </div>
                  <Badge label={domain.status} tone={domain.status === "verified" ? "success" : "warning"} />
                </div>
                <div className="mt-3 rounded-xl bg-[#F7F9FC] p-3 text-sm text-secondaryText">
                  DNS TXT record: <span className="font-medium text-primaryText">{domain.verificationToken}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
