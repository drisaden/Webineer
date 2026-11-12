import { Mail, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockRegistrations } from "@/data/mock/webinars";

const contacts = mockRegistrations.slice(0, 6).map((registration) => ({
  id: registration.id,
  name: registration.name,
  email: registration.email,
  company: registration.company || "Independent",
  tags: registration.tags || ["registered"],
  status: registration.status,
  spent: registration.paymentStatus === "paid" ? "₦25,000" : "Free",
}));

export default function ContactsPage() {
  return (
    <DashboardShell title="Contacts & Audience Segments">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Total contacts</span><Users className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">{contacts.length + 320}</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Paid buyers</span><Mail className="h-4 w-4 text-[#16D6B2]" /></div><p className="mt-3 text-3xl font-semibold">214</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-secondaryText">Segments</span><Badge label="5 live" tone="info" /></div><p className="mt-3 text-3xl font-semibold">5</p></Card>
        </section>

        <Card>
          <CardContent className="space-y-4">
            {contacts.map((contact) => (
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
