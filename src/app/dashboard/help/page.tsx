import Link from "next/link";
import { BookOpen, CalendarClock, LayoutTemplate, PlayCircle, Video } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";

const guides = [
  { icon: Video, title: "Create a webinar", body: "Pick a mode, add your video link and schedule, then publish.", href: "/dashboard/webinars/new", cta: "Start a webinar" },
  { icon: LayoutTemplate, title: "Design the registration page", body: "Arrange blocks, upload images and match your brand.", href: "/dashboard/landing-pages", cta: "Open landing pages" },
  { icon: CalendarClock, title: "Reminders and follow-ups", body: "See which emails are queued for each webinar.", href: "/dashboard/automations", cta: "View automations" },
];

export default function HelpPage() {
  return (
    <DashboardShell title="Help & Support">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-white p-6 shadow-soft md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAFBF5] text-[#0F7B52]">
              <PlayCircle className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl text-primaryText">Take the guided tour</h2>
              <p className="mt-1 text-sm text-secondaryText">A one-minute walkthrough of where everything lives in your workspace.</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard?tour=1">Replay the tour</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {guides.map(({ icon: Icon, title, body, href, cta }) => (
            <div key={title} className="flex flex-col rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#17294B]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-primaryText">{title}</h3>
              <p className="mt-1 flex-1 text-sm text-secondaryText">{body}</p>
              <Link href={href} className="mt-4 text-sm font-medium text-[#17294B]">
                {cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-[1.5rem] border border-dashed border-border bg-[#F7F9FC] p-5 text-sm text-secondaryText">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#17294B]" aria-hidden />
          <p>Need a hand with something else? Reply to any email from Webineer and it reaches the team that runs this site.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
