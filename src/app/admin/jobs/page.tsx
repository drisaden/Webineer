import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { jobQueue } from "@/data/mock/admin";

export default function AdminJobsPage() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primaryText">Background jobs</h2>
          <p className="text-sm text-secondaryText">Automation, queue, and retry monitoring</p>
        </div>
        <Badge label="Queue healthy" tone="success" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F7F9FC] text-secondaryText">
            <tr>
              <th className="px-5 py-3 font-medium">Job</th>
              <th className="px-5 py-3 font-medium">Queue</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Scheduled</th>
              <th className="px-5 py-3 font-medium">Retries</th>
            </tr>
          </thead>
          <tbody>
            {jobQueue.map((job) => (
              <tr key={job.name} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-primaryText">{job.name}</td>
                <td className="px-5 py-4 text-secondaryText">{job.queue}</td>
                <td className="px-5 py-4"><Badge label={job.status} tone={job.status === "running" ? "success" : job.status === "failed" ? "warning" : "info"} /></td>
                <td className="px-5 py-4 text-secondaryText">{job.scheduled}</td>
                <td className="px-5 py-4 text-secondaryText">{job.retries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
