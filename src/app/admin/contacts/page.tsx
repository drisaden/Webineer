import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const contacts = [
  { name: "Aisha Bello", email: "aisha@northstarstudio.co", source: "Newsletter", status: "active" },
  { name: "Oluwaseun Dada", email: "oluwa@mentorloop.ai", source: "Landing page", status: "active" },
  { name: "Maya Haddad", email: "maya@launchroom.co", source: "Manual import", status: "paused" },
];

export default function AdminContactsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Contacts</h2>
          <p className="text-sm text-secondaryText">Audience and workspace contacts</p>
        </div>
        <Badge label="3 records" tone="info" />
      </div>

      <div className="divide-y divide-border">
        {contacts.map((contact) => (
          <div key={contact.email} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-primaryText">{contact.name}</div>
              <div className="text-sm text-secondaryText">{contact.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-secondaryText">{contact.source}</span>
              <Badge label={contact.status} tone={contact.status === "active" ? "success" : "warning"} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
