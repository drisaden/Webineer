"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Video, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeVideoSource, videoProviderCatalog } from "@/providers/video";

const initialForm = {
  title: "Creator Growth Blueprint",
  description: "A live session covering positioning, systems, and launch planning for creator-led businesses.",
  provider: "youtube" as const,
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  date: "2026-11-18T18:00",
};

export function WebinarCreationForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);

  const preview = useMemo(() => normalizeVideoSource({
    provider: form.provider,
    url: form.url,
    title: form.title,
    description: form.description,
    isEmbedded: true,
  }), [form.description, form.provider, form.title, form.url]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview.valid) {
      return;
    }

    router.push("/dashboard/webinars/wb_004/landing-page");
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAFBF5] text-[#0F7B52]">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-secondaryText">Setup</p>
            <h2 className="text-xl font-semibold text-primaryText">Create webinar</h2>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-primaryText">Webinar title</label>
            <input
              className="input-field"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primaryText">Description</label>
            <textarea
              className="input-field min-h-[110px]"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-primaryText">Webinar type</label>
              <select className="input-field" defaultValue="live">
                <option value="live">Live</option>
                <option value="automated">Automated</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primaryText">Start date</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primaryText">Video provider</label>
            <select
              className="input-field"
              value={form.provider}
              onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as typeof form.provider }))}
            >
              {videoProviderCatalog.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primaryText">Video source URL</label>
            <input
              className="input-field"
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            />
            <p className="mt-2 text-xs text-secondaryText">
              {videoProviderCatalog.find((provider) => provider.id === form.provider)?.embedHint}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary">Save draft</Button>
          <Button type="submit" disabled={!preview.valid}>
            Continue to landing page
          </Button>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-[2rem] border border-border bg-[#101B35] p-5 text-white shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-[#16D6B2]" />
              <span className="text-sm font-medium">Source preview</span>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#B9F0E7]">{form.provider}</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#17294B] p-3">
            <div className="mb-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-[#16D6B2]/40 bg-[#111C2E]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16D6B2]/20 text-[#16D6B2]">
                <Video className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <div className="flex items-center justify-between"><span>Title</span><span className="font-medium text-white">{form.title}</span></div>
              <div className="flex items-center justify-between"><span>Provider</span><span className="font-medium text-white">{form.provider}</span></div>
              <div className="flex items-center justify-between"><span>Validation</span><span className="font-medium text-[#16D6B2]">{preview.valid ? "Ready" : "Pending"}</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-primaryText">
            <CalendarClock className="h-4 w-4 text-[#16D6B2]" />
            Event summary
          </div>
          <div className="mt-4 space-y-3 text-sm text-secondaryText">
            <div className="flex items-center justify-between">
              <span>Schedule</span>
              <span className="font-medium text-primaryText">{new Date(form.date).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Registrations</span>
              <span className="font-medium text-primaryText">0</span>
            </div>
          </div>

          {!preview.valid && (
            <div className="mt-4 rounded-xl border border-[#F5D7D7] bg-[#FFF6F6] p-3 text-sm text-[#B33A3A]">
              {preview.error}
            </div>
          )}

          {preview.valid && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#D9F5EC] bg-[#EAFBF5] p-3 text-sm text-[#0F7B52]">
              <CheckCircle2 className="h-4 w-4" />
              Video source validated
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}
