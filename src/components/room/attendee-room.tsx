import { MessageSquareText, SendHorizonal, Users, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmbedUrl } from "@/providers/video";
import type { Webinar } from "@/types";

export function AttendeeRoom({ webinar }: { webinar: Webinar }) {
  const embedUrl = getEmbedUrl(webinar.videoSource.provider, webinar.videoSource.url);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-3 shadow-soft">
          <div className="mb-4 flex items-center justify-between px-3 pt-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-secondaryText">Live room</p>
              <h2 className="mt-1 text-xl font-semibold text-primaryText">{webinar.title}</h2>
            </div>
            <span className="rounded-full bg-[#EAFBF5] px-2.5 py-1 text-xs font-medium text-[#0F7B52]">Live</span>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
            <div className="aspect-video w-full bg-[#111C2E]">
              <iframe src={embedUrl} title={webinar.title} className="h-full w-full" allowFullScreen />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primaryText">Ask a question</h3>
            <span className="text-sm text-secondaryText">12 attendees</span>
          </div>

          <div className="flex gap-3">
            <input className="input-field flex-1" placeholder="Type your question..." />
            <Button type="button">
              <SendHorizonal className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-primaryText">
            <Users className="h-4 w-4 text-[#16D6B2]" />
            Audience panel
          </div>
          <div className="mt-4 space-y-3 text-sm text-secondaryText">
            {[
              "Jordan Lee",
              "Priya Shah",
              "Marcus Hall",
              "Alicia Gomez",
            ].map((person) => (
              <div key={person} className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-2.5">
                <span>{person}</span>
                <span className="text-[#16A36A]">Watching</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-primaryText">
            <Vote className="h-4 w-4 text-[#16D6B2]" />
            Live poll
          </div>
          <div className="mt-4 space-y-2 text-sm text-secondaryText">
            <p className="font-medium text-primaryText">Which workflow do you want to see next?</p>
            {[
              "Customer onboarding paths",
              "Automated reminders",
              "Landing page optimization",
            ].map((option) => (
              <button key={option} className="w-full rounded-xl border border-border bg-[#F7F9FC] px-3 py-2 text-left hover:bg-[#EEF2F7]">
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-primaryText">
            <MessageSquareText className="h-4 w-4 text-[#16D6B2]" />
            Chat feed
          </div>
          <div className="mt-4 space-y-3 text-sm text-secondaryText">
            <div className="rounded-xl border border-border bg-[#F7F9FC] p-3">“The systems framework was the most useful part.”</div>
            <div className="rounded-xl border border-border bg-[#F7F9FC] p-3">“Can you share the exact launch checklist?”</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
