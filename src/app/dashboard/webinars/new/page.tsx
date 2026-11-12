import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WebinarCreationForm } from "@/components/webinars/webinar-creation-form";

export default function NewWebinarPage() {
  return (
    <DashboardShell title="Create Webinar">
      <WebinarCreationForm />
    </DashboardShell>
  );
}
