import Link from "next/link";
import { CheckCircle2, LayoutTemplate, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmbedUrl } from "@/providers/video";
import type { Webinar } from "@/types";

export function LandingPageBuilder({ webinar }: { webinar: Webinar }) {
  const embedUrl = getEmbedUrl(webinar.videoSource.provider, webinar.videoSource.url);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAFBF5] px-2.5 py-1 text-xs font-medium text-[#0F7B52]">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Builder
            </div>
            <div className="text-xs uppercase tracking-[0.12em] text-secondaryText">Draft</div>
          </div>

          <h2 className="mt-5 text-2xl font-semibold text-primaryText">{webinar.title}</h2>
          <p className="mt-2 text-sm text-secondaryText">{webinar.description}</p>

          <div className="mt-6 rounded-[1.5rem] border border-border bg-[#F7F9FC] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primaryText">
              <Sparkles className="h-4 w-4 text-[#16D6B2]" />
              Hero section
            </div>
            <h3 className="text-3xl font-semibold text-primaryText">Join our live session and learn what actually grows a modern business.</h3>
            <p className="mt-3 text-sm text-secondaryText">Turn your audience into action-takers with a clean, conversion-focused webinar page.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={webinar.slug ? `/w/${webinar.slug}` : `/w/${webinar.id}`}>Preview page</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/dashboard/landing-pages">Save draft</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primaryText">Page blocks</h3>
            <span className="text-xs uppercase tracking-[0.12em] text-secondaryText">4 active</span>
          </div>

          <div className="grid gap-3">
            {[
              { title: "Hero", text: "Primary headline and CTA" },
              { title: "Features", text: "Three value props for the session" },
              { title: "Video", text: "Embedded source preview" },
              { title: "CTA", text: "Final conversion prompt" },
            ].map((block) => (
              <div key={block.title} className="flex items-center justify-between rounded-xl border border-border bg-[#F7F9FC] p-3">
                <div>
                  <div className="font-medium text-primaryText">{block.title}</div>
                  <div className="text-xs text-secondaryText">{block.text}</div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-[#16A36A]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-primaryText">Live preview</h3>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35] p-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.14em] text-[#B9F0E7]">Webinar</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em]">{webinar.status}</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#17294B]">
            <div className="aspect-video w-full bg-[#111C2E]">
              <iframe src={embedUrl} title={webinar.title} className="h-full w-full" allowFullScreen />
            </div>
          </div>

          <div className="mt-5">
            <h4 className="text-xl font-semibold">{webinar.title}</h4>
            <p className="mt-2 text-sm text-white/80">{webinar.description}</p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button className="bg-[#16D6B2] text-[#101B35] hover:bg-[#0FC7A6]">Reserve seat</Button>
            <Button variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Learn more</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
