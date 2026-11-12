import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const tickets = [
  { id: "SUP-914", customer: "Maya Haddad", topic: "Ticket generation bug", priority: "High", status: "In progress" },
  { id: "SUP-915", customer: "Aisha Bello", topic: "Email campaign failure", priority: "Medium", status: "Waiting for customer" },
];

export default function AdminSupportPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Support</h2>
          <p className="text-sm text-secondaryText">Customer support records and operational issue tracking</p>
        </div>
        <Badge label="2 tickets" tone="info" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Ticket</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Topic</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-border">
                <td className="px-5 py-4 text-primaryText">{ticket.id}</td>
                <td className="px-5 py-4 text-secondaryText">{ticket.customer}</td>
                <td className="px-5 py-4 text-secondaryText">{ticket.topic}</td>
                <td className="px-5 py-4 text-secondaryText">{ticket.priority}</td>
                <td className="px-5 py-4"><Badge label={ticket.status} tone={ticket.status === "In progress" ? "success" : "warning"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
