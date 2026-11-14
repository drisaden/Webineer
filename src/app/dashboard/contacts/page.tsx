import { Mail, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { getStore } from "@/server/repositories";

export const dynamic = "force-dynamic";

function formatPaid(metadata: Record<string, unknown> | undefined) {
  const amount = Number(metadata?.paymentAmount ?? 0);
  const currency = String(metadata?.paymentCurrency ?? "NGN");
  return amount > 0 ? new Intl.NumberFormat("en", { style: "currency", currency }).format(amount) : "Paid";
}

/** Contacts = unique registrants across the active workspace's webinars. */
export default async function ContactsPage() {
  const user = await getCurrentUser();
  const registrations = user ? await getStore().listWorkspaceRegistrations(user.workspaceId, 1000) : [];
  const byEmail = new Map<string, (typeof registrations)[number][]>();
  for (const r of registrations) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r]);
  const contacts = [...byEmail.entries()].map(([email, regs]) => {
    const latest = regs[0];
    const paid = regs.find((r) => r.paymentStatus === "paid");
    return {
      id: latest.id,
      name: latest.name,
      email,
      company: latest.company || "Independent",
      tags: [...new Set(regs.map((r) => r.webinarTitle))].slice(0, 3),
      status: regs.some((r) => r.status === "attended" || r.status === "converted") ? "attended" : latest.status,
      spent: paid ? formatPaid(paid.metadata) : "Free",
      isPaid: Boolean(paid),
    };
  });
  const paidCount = contacts.filter((c) => c.isPaid).length;
  const attendedCount = contacts.filter((c) => c.status === "attended").length;

  return (
    <DashboardShell title="Contacts & Audience Segments">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Total contacts</span><Users className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{contacts.length}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Paid buyers</span><Mail className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{paidCount}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Attended a webinar</span><Badge label="Engaged" tone="info" /></div><p className="mt-3 text-3xl font-semibold">{attendedCount}</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {contacts.length === 0 && <p className="text-sm text-secondaryText">No contacts yet. People who register for your webinars appear here.</p>}
            {contacts.slice(0, 100).map((contact) => (
              <div key={contact.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-medium">{contact.name}</h3>
                  <p className="text-sm text-secondaryText">{contact.email} · {contact.company}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {contact.tags.map((tag) => <Badge key={tag} label={tag} tone="default" />)}
                  <Badge label={contact.status} tone={contact.status === "attended" ? "success" : "info"} />
                </div>
                <div className="text-sm text-secondaryText">{contact.spent}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
