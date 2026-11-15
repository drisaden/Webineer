"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Code2,
  ExternalLink,
  Eye,
  Globe,
  LayoutTemplate,
  Link2,
  MousePointerClick,
  Plus,
  SquareMousePointer,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { randomId } from "@/lib/webinar-workflow/defaults";
import {
  embedUrl,
  hostedRegistrationUrl,
  inlineEmbedSnippet,
  popupEmbedSnippet,
  registrationButtonSnippet,
} from "@/lib/webinar-workflow/embed";
import { clampPreviewPercent, clipPreviewSupported, DEFAULT_VIDEO_PREVIEW, PREVIEW_PERCENT_MAX, PREVIEW_PERCENT_MIN } from "@/lib/webinar-workflow/preview";
import type { CustomQuestion, CustomQuestionType, VideoPreviewSettings, WebinarWorkflowConfig } from "@/types";
import {
  CopyField,
  errorFor,
  IssueSummary,
  Notice,
  NumberInput,
  SectionCard,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
  UnavailableBadge,
} from "../form-controls";
import { MediaUploadField } from "@/components/uploads/media-upload-field";
import type { SectionProps } from "../section-types";

const TABS = [
  { key: "form", label: "Registration form", icon: ClipboardList },
  { key: "page", label: "Page customization", icon: LayoutTemplate },
  { key: "embed", label: "Embed & Share", icon: Code2 },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function RegistrationSection(props: SectionProps) {
  const [tab, setTab] = useState<TabKey>("form");
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Registration settings" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1 shadow-soft">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            type="button"
            id={`reg-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`reg-panel-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
              tab === key ? "bg-[#041B5E] text-white" : "text-primaryText hover:bg-[#EEF2F7]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`reg-panel-${tab}`} aria-labelledby={`reg-tab-${tab}`} className="space-y-5">
        {tab === "form" && <FormBuilder {...props} />}
        {tab === "page" && <PageCustomization {...props} />}
        {tab === "embed" && <EmbedShare {...props} />}
        {tab === "analytics" && <RegistrationAnalytics {...props} />}
      </div>
      <IssueSummary issues={props.issues} show={props.showErrors} />
    </div>
  );
}

function FormBuilder({ draft, update, issues, showErrors }: SectionProps) {
  const r = draft.registration;
  const set = <K extends keyof typeof r>(key: K, value: (typeof r)[K]) => update("registration", { ...r, [key]: value });
  const setQuestion = (id: string, patch: Partial<CustomQuestion>) => set("customQuestions", r.customQuestions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <>
      <SectionCard title="Form fields" description="Name and email are always required so every registration can receive its join link." icon={<ClipboardList className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-3 text-sm">
            <p className="font-medium text-primaryText">Full name</p>
            <p className="text-xs text-secondaryText">Required</p>
          </div>
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-3 text-sm">
            <p className="font-medium text-primaryText">Email address</p>
            <p className="text-xs text-secondaryText">Required · one registration per email</p>
          </div>
        </div>
        <SelectInput
          label="Phone number"
          value={r.phoneField}
          onChange={(v) => set("phoneField", v)}
          options={[
            { value: "hidden", label: "Don't ask" },
            { value: "optional", label: "Optional" },
            { value: "required", label: "Required" },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Custom questions"
        description="Up to 10 extra questions. Answers are stored with the registration."
        icon={<Plus className="h-4 w-4" />}
        actions={
          r.customQuestions.length < 10 ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => set("customQuestions", [...r.customQuestions, { id: randomId("q", 6), label: "", type: "text", options: [], required: false }])}>
              <Plus className="mr-1.5 h-4 w-4" /> Add question
            </Button>
          ) : null
        }
      >
        {r.customQuestions.length === 0 && <p className="text-sm text-secondaryText">No custom questions. Add one to learn more about your registrants.</p>}
        {r.customQuestions.map((q, i) => (
          <div key={q.id} className="space-y-3 rounded-xl border border-border bg-[#F7F9FC] p-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <TextInput label={`Question ${i + 1}`} value={q.label} onChange={(v) => setQuestion(q.id, { label: v })} placeholder="e.g. What's your role?" maxLength={200} error={errorFor(issues, `customQuestions.${i}`, showErrors)} />
              <SelectInput<CustomQuestionType>
                label="Answer type"
                value={q.type}
                onChange={(v) => setQuestion(q.id, { type: v, options: v === "select" ? (q.options.length ? q.options : ["", ""]) : [] })}
                options={[
                  { value: "text", label: "Short text" },
                  { value: "textarea", label: "Paragraph" },
                  { value: "select", label: "Dropdown" },
                  { value: "checkbox", label: "Checkbox (yes/no)" },
                ]}
              />
            </div>
            {q.type === "select" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-primaryText">Options</p>
                {q.options.map((option, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input aria-label={`Option ${j + 1}`} className="input-field" value={option} maxLength={100} onChange={(e) => setQuestion(q.id, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) })} />
                    <button type="button" className="rounded-lg p-2 text-[#B33A3A] hover:bg-white" aria-label={`Remove option ${j + 1}`} onClick={() => setQuestion(q.id, { options: q.options.filter((_, k) => k !== j) })}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {q.options.length < 20 && (
                  <button type="button" className="text-sm font-medium text-[#17294B] underline" onClick={() => setQuestion(q.id, { options: [...q.options, ""] })}>
                    Add option
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-primaryText">
                <input type="checkbox" className="h-4 w-4 accent-[#041B5E]" checked={q.required} onChange={(e) => setQuestion(q.id, { required: e.target.checked })} />
                Required
              </label>
              <button type="button" className="inline-flex items-center gap-1 text-sm text-[#B33A3A]" onClick={() => set("customQuestions", r.customQuestions.filter((x) => x.id !== q.id))}>
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Capacity & approval" icon={<SquareMousePointer className="h-4 w-4" />}>
        <Toggle label="Limit the number of registrations" description="When full, every registration method shows a 'webinar is full' message." checked={r.capacity !== null} onChange={(v) => set("capacity", v ? 100 : null)} />
        {r.capacity !== null && <NumberInput label="Maximum registrations" value={r.capacity} onChange={(v) => set("capacity", Math.max(1, Math.round(v)))} min={1} />}
        <Toggle label="Manually approve registrations" description="Registrant approval queues are not supported yet. Registrations are confirmed automatically." checked={false} onChange={() => undefined} disabled badge={<UnavailableBadge />} />
      </SectionCard>
    </>
  );
}

function PageCustomization({ draft, update, issues, showErrors, context }: SectionProps) {
  const r = draft.registration;
  const set = <K extends keyof typeof r>(key: K, value: (typeof r)[K]) => update("registration", { ...r, [key]: value });
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Registration page" description="Applies to the hosted page and to embedded forms." icon={<LayoutTemplate className="h-4 w-4" />}>
        <TextInput label="Browser page title" optional value={r.pageTitle} onChange={(v) => set("pageTitle", v)} placeholder={draft.configuration.title || "Defaults to the webinar title"} maxLength={150} />
        <TextInput label="Headline" value={r.headline} onChange={(v) => set("headline", v)} placeholder="e.g. Learn the 5-step launch framework" maxLength={200} error={errorFor(issues, "headline", showErrors)} />
        <TextArea label="Supporting description" optional value={r.description} onChange={(v) => set("description", v)} rows={4} maxLength={3000} placeholder={draft.configuration.description || "Defaults to the webinar description"} />
        <MediaUploadField label="Cover image" optional value={r.coverImageUrl} onChange={(v) => set("coverImageUrl", v)} placeholder="Defaults to the webinar cover image" error={errorFor(issues, "coverImageUrl", showErrors)} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Button text" value={r.buttonText} onChange={(v) => set("buttonText", v)} maxLength={60} error={errorFor(issues, "buttonText", showErrors)} />
          <div>
            <label htmlFor="reg-accent" className="mb-2 block text-sm font-medium text-primaryText">
              Accent colour
            </label>
            <div className="flex items-center gap-2">
              <input id="reg-accent" type="color" value={r.accentColor} onChange={(e) => set("accentColor", e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-white p-1" />
              <input aria-label="Accent colour hex" className="input-field font-mono" value={r.accentColor} maxLength={7} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set("accentColor", e.target.value)} />
            </div>
          </div>
        </div>
        <Toggle label="Show date & time" checked={r.showDateTime} onChange={(v) => set("showDateTime", v)} />
        <Toggle label="Show presenters" checked={r.showPresenters} onChange={(v) => set("showPresenters", v)} />
        <Toggle
          label="Show a video preview on the hosted page"
          description="A short taste of the webinar under the headline. The full video is only ever shown in the room."
          checked={r.showVideoPreview}
          onChange={(v) => set("showVideoPreview", v)}
        />
        {r.showVideoPreview && <VideoPreviewSettingsPanel draft={draft} onChange={(next) => set("videoPreview", next)} error={errorFor(issues, "videoPreview", showErrors)} />}
      </SectionCard>

      <SectionCard title="Preview" description={context.webinarId ? "Live preview of the saved page." : "Save the draft to see a live preview."} icon={<Eye className="h-4 w-4" />}>
        <MiniRegistrationPreview draft={draft} />
        {context.slug && (
          <Button asChild variant="secondary" size="sm">
            <a href={`/w/${context.slug}${context.status === "draft" ? "?preview=1" : ""}`} target="_blank" rel="noopener">
              Open full preview <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-4">
          <p className="text-sm font-medium text-primaryText">{r.page?.enabled ? "This webinar uses a custom page design" : "Want full control of the layout?"}</p>
          <p className="mt-1 text-xs text-secondaryText">
            The page designer lets you drag blocks into place, add images, testimonials, FAQs and a countdown, and set your own colours.
            {r.page?.enabled ? " The mini preview above shows the standard layout, not your design." : ""}
          </p>
          {context.webinarId ? (
            <Button asChild size="sm" className="mt-3">
              <a href={`/dashboard/webinars/${context.webinarId}/landing-page`} data-testid="open-page-designer">
                <LayoutTemplate className="mr-2 h-4 w-4" /> {r.page ? "Edit page design" : "Open page designer"}
              </a>
            </Button>
          ) : (
            <p className="mt-2 text-xs text-secondaryText">Save the draft first to open the designer.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniRegistrationPreview({ draft }: { draft: SectionProps["draft"] }) {
  const r = draft.registration;
  const c = draft.configuration;
  const cover = r.coverImageUrl || c.coverImageUrl;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#F7F9FC]" aria-label="Registration page preview">
      {cover && /^https:\/\//.test(cover) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div className="h-20 bg-gradient-to-br from-[#17294B] via-[#101B35] to-[#16D6B2]/70" />
      )}
      <div className="space-y-3 p-4">
        <p className="text-base font-semibold text-primaryText">{r.headline || c.title || "Your headline"}</p>
        <p className="line-clamp-3 text-xs text-secondaryText">{r.description || c.description || "Your description appears here."}</p>
        <div className="space-y-2">
          <div className="h-9 rounded-lg border border-border bg-white" />
          <div className="h-9 rounded-lg border border-border bg-white" />
          {r.phoneField !== "hidden" && <div className="h-9 rounded-lg border border-border bg-white" />}
          {r.customQuestions.map((q) => (
            <div key={q.id} className="h-9 rounded-lg border border-dashed border-border bg-white px-2 text-[10px] leading-9 text-secondaryText">
              {q.label || "Custom question"}
            </div>
          ))}
        </div>
        <div className="rounded-lg py-2 text-center text-sm font-semibold text-[#101B35]" style={{ background: /^#[0-9a-fA-F]{6}$/.test(r.accentColor) ? r.accentColor : "#16D6B2" }}>
          {r.buttonText || "Register"}
        </div>
      </div>
    </div>
  );
}

function EmbedShare({ draft, update, issues, showErrors, context }: SectionProps) {
  const e = draft.registration.embed;
  const setEmbed = <K extends keyof typeof e>(key: K, value: (typeof e)[K]) => update("registration", { ...draft.registration, embed: { ...e, [key]: value } });
  const [domainsText, setDomainsText] = useState(e.allowedDomains.join("\n"));
  const [popupOpen, setPopupOpen] = useState(false);
  const origin = context.appOrigin;
  const config = { ...draft, publicId: context.publicId } as unknown as WebinarWorkflowConfig;
  const title = draft.configuration.title || "Webinar";
  const ready = Boolean(context.slug && origin);
  const published = context.status !== "draft";
  const previewQuery = published ? "" : "&preview=1";

  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPopupOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupOpen]);

  if (!ready) {
    return (
      <SectionCard title="Embed & Share" icon={<Code2 className="h-4 w-4" />}>
        <Notice>Save this draft (add a title in Configuration) to generate your registration URL and embed codes.</Notice>
      </SectionCard>
    );
  }

  return (
    <>
      {!published && (
        <Notice tone="warning">
          Codes below are final and safe to install now, but forms only accept registrations after you publish. Until then they show a preview notice.
        </Notice>
      )}

      <SectionCard title="1. Hosted registration page" description="A Webineer-hosted page for this webinar." icon={<Link2 className="h-4 w-4" />}>
        <CopyField label="Registration URL" value={hostedRegistrationUrl(origin, context.slug!)} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={`/w/${context.slug}${published ? "" : "?preview=1"}`} target="_blank" rel="noopener">
              {published ? "Open registration page" : "Preview registration page"} <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-secondaryText">Customize the page under the “Page customization” tab.</p>
      </SectionCard>

      <SectionCard title="2. Inline embed" description="Place the registration form directly inside a page on your website." icon={<Code2 className="h-4 w-4" />}>
        <NumberInput label="Iframe height" value={e.inlineHeight} onChange={(v) => setEmbed("inlineHeight", Math.min(2000, Math.max(300, Math.round(v))))} min={300} max={2000} step={10} suffix="px" hint="Width is responsive (100% of its container)." />
        <CopyField label="Embed code" multiline value={inlineEmbedSnippet(origin, config, title)} />
        <ol className="list-decimal space-y-1 pl-5 text-xs text-secondaryText">
          <li>Copy the code above.</li>
          <li>In your website builder, add an “HTML” / “Embed code” block where the form should appear.</li>
          <li>Paste the code and publish your page. Registrations appear in Webineer immediately.</li>
        </ol>
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primaryText">Preview embedded form</summary>
          <div className="border-t border-border bg-[#EEF2F7] p-3">
            <iframe src={`${embedUrl("", context.publicId, "inline")}${previewQuery}`} title="Embedded form preview" className="w-full rounded-xl border border-border bg-white" style={{ height: Math.min(e.inlineHeight, 900) }} loading="lazy" />
            <p className="mt-2 text-xs text-secondaryText">Shows the last saved version.</p>
          </div>
        </details>
      </SectionCard>

      <SectionCard title="3. Popup / modal embed" description="Show a Register button that opens the form in a modal on your site." icon={<MousePointerClick className="h-4 w-4" />}>
        <ButtonStyleFields draft={draft} setEmbed={setEmbed} textKey="popupButtonText" />
        <CopyField label="Installation snippet" multiline value={popupEmbedSnippet(origin, config)} hint="One small script, no SDK. Add the snippet where the button should appear." />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-secondaryText">Button preview:</span>
          <StyledButtonPreview draft={draft} text={e.popupButtonText} onClick={() => setPopupOpen(true)} />
        </div>
        {popupOpen && (
          <div role="dialog" aria-modal="true" aria-label="Registration popup preview" className="fixed inset-0 z-50 flex items-center justify-center bg-[#041B5E]/55 p-3 backdrop-blur-sm" onClick={() => setPopupOpen(false)}>
            <div className="relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
              <button type="button" onClick={() => setPopupOpen(false)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-primaryText shadow hover:bg-white" aria-label="Close popup preview" autoFocus>
                <X className="h-4 w-4" />
              </button>
              <iframe src={`${embedUrl("", context.publicId, "popup")}${previewQuery}`} title="Popup form preview" className="h-[80vh] max-h-[680px] w-full" />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="4. Registration button" description="The simplest option: a plain HTML button linking to your hosted page." icon={<SquareMousePointer className="h-4 w-4" />}>
        <ButtonStyleFields draft={draft} setEmbed={setEmbed} textKey="buttonText" />
        <CopyField label="Button HTML" multiline value={registrationButtonSnippet(origin, config, context.slug!)} />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-secondaryText">Preview:</span>
          <a href={`/w/${context.slug}?source=button${published ? "" : "&preview=1"}`} target="_blank" rel="noopener">
            <StyledButtonPreview draft={draft} text={e.buttonText} />
          </a>
        </div>
      </SectionCard>

      <SectionCard title="Allowed websites" description="Optionally restrict which domains may embed the form (inline and popup)." icon={<Globe className="h-4 w-4" />}>
        <label htmlFor="allowed-domains" className="mb-2 block text-sm font-medium text-primaryText">
          Domains <span className="text-xs font-normal text-secondaryText">One per line · leave empty to allow any website</span>
        </label>
        <textarea
          id="allowed-domains"
          rows={3}
          className="input-field font-mono text-sm"
          placeholder={"example.com\n*.example.com"}
          value={domainsText}
          onChange={(ev) => {
            setDomainsText(ev.target.value);
            setEmbed(
              "allowedDomains",
              ev.target.value
                .split(/[\n,]/)
                .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
                .filter(Boolean)
                .slice(0, 20),
            );
          }}
        />
        {errorFor(issues, "embed.allowedDomains", showErrors) && <Notice tone="error">{errorFor(issues, "embed.allowedDomains", true)}</Notice>}
        <p className="text-xs text-secondaryText">
          Enforced using the embedding page’s origin as reported by the browser. Registrations are always validated server-side, and embed codes never contain credentials.
        </p>
      </SectionCard>
    </>
  );
}

function ButtonStyleFields({
  draft,
  setEmbed,
  textKey,
}: {
  draft: SectionProps["draft"];
  setEmbed: <K extends keyof SectionProps["draft"]["registration"]["embed"]>(key: K, value: SectionProps["draft"]["registration"]["embed"][K]) => void;
  textKey: "popupButtonText" | "buttonText";
}) {
  const e = draft.registration.embed;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <TextInput label="Button text" value={e[textKey]} onChange={(v) => setEmbed(textKey, v)} maxLength={60} className="md:col-span-2" />
      <ColorField label="Background" value={e.buttonBackground} onChange={(v) => setEmbed("buttonBackground", v)} />
      <ColorField label="Text colour" value={e.buttonTextColor} onChange={(v) => setEmbed("buttonTextColor", v)} />
      <NumberInput label="Corner radius" value={e.buttonRadius} onChange={(v) => setEmbed("buttonRadius", Math.min(40, Math.max(0, Math.round(v))))} min={0} max={40} suffix="px" />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-medium text-primaryText">
      <span className="mb-2 block">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-full cursor-pointer rounded-xl border border-border bg-white p-1" />
    </label>
  );
}

function StyledButtonPreview({ draft, text, onClick }: { draft: SectionProps["draft"]; text: string; onClick?: () => void }) {
  const e = draft.registration.embed;
  const style = { background: e.buttonBackground, color: e.buttonTextColor, borderRadius: e.buttonRadius };
  return onClick ? (
    <button type="button" onClick={onClick} style={style} className="px-5 py-3 text-sm font-semibold shadow-sm">
      {text || "Register"}
    </button>
  ) : (
    <span style={style} className="inline-block px-5 py-3 text-sm font-semibold shadow-sm">
      {text || "Register"}
    </span>
  );
}

function RegistrationAnalytics({ context }: SectionProps) {
  const a = context.analytics;
  if (!context.webinarId || !a) {
    return (
      <SectionCard title="Registration analytics" icon={<BarChart3 className="h-4 w-4" />}>
        <Notice>Analytics start once the webinar is saved and published.</Notice>
      </SectionCard>
    );
  }
  const sources = Object.entries(a.bySource).filter(([, v]) => v.views > 0 || v.registrations > 0);
  return (
    <SectionCard title="Registration analytics" description="Measured directly from Webineer registration pages and embeds. All methods feed one attendee list." icon={<BarChart3 className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Page & form views" value={a.pageViews} />
        <Metric label="Form submissions" value={a.submissions} />
        <Metric label="Successful registrations" value={a.successfulRegistrations} />
        <Metric label="Conversion rate" value={a.conversionRate === null ? "—" : `${a.conversionRate}%`} hint={a.conversionRate === null ? "No views recorded yet" : "Registrations ÷ views"} />
      </div>
      {sources.length === 0 ? (
        <p className="text-sm text-secondaryText">No traffic recorded yet. Views are counted when a published registration page or embed loads.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="sr-only">Registrations by publishing method</caption>
            <thead className="text-xs uppercase tracking-[0.1em] text-secondaryText">
              <tr>
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Views</th>
                <th className="py-2 font-medium">Registrations</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(([source, v]) => (
                <tr key={source} className="border-t border-border">
                  <td className="py-2 capitalize text-primaryText">{source === "hosted" ? "Hosted page" : source === "button" ? "Registration button" : source}</td>
                  <td className="py-2">{v.views}</td>
                  <td className="py-2">{v.registrations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-secondaryText">Figures refresh each time this draft is saved or reloaded. Analytics events are kept in memory in demo mode.</p>
    </SectionCard>
  );
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-[#F7F9FC] p-3">
      <p className="text-xs text-secondaryText">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primaryText">{value}</p>
      {hint && <p className="text-[11px] text-secondaryText">{hint}</p>}
    </div>
  );
}

/** Chooses what the registration page previews: the opening part of the webinar video, or a separate short clip. */
function VideoPreviewSettingsPanel({ draft, onChange, error }: { draft: SectionProps["draft"]; onChange: (next: VideoPreviewSettings) => void; error?: string }) {
  const preview = draft.registration.videoPreview ?? DEFAULT_VIDEO_PREVIEW;
  const mainUrl = draft.integrations.video.url.trim();
  const clipWorks = !mainUrl || clipPreviewSupported(mainUrl);
  const option = (value: VideoPreviewSettings["source"], title: string, description: string) => {
    const active = preview.source === value;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange({ ...preview, source: value })}
        className={cn(
          "rounded-2xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
          active ? "border-[#16D6B2] bg-[#EAFBF5]" : "border-border bg-white hover:bg-[#F7F9FC]",
        )}
      >
        <span className="block text-sm font-medium text-primaryText">{title}</span>
        <span className="mt-1 block text-xs text-secondaryText">{description}</span>
      </button>
    );
  };
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-[#F7F9FC] p-4" data-testid="video-preview-settings">
      <div role="radiogroup" aria-label="Video preview source" className="grid gap-3 md:grid-cols-2">
        {option("clip", "Part of the webinar video", "Plays only the opening part, then invites visitors to register.")}
        {option("custom", "A separate short video", "Upload a teaser or paste a link to one.")}
      </div>
      {preview.source === "clip" ? (
        <div>
          <label htmlFor="preview-percent" className="mb-2 flex items-center justify-between text-sm font-medium text-primaryText">
            <span>How much to show</span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#17294B]">First {clampPreviewPercent(preview.clipPercent)}%</span>
          </label>
          <input
            id="preview-percent"
            type="range"
            min={PREVIEW_PERCENT_MIN}
            max={PREVIEW_PERCENT_MAX}
            step={5}
            value={clampPreviewPercent(preview.clipPercent)}
            onChange={(event) => onChange({ ...preview, clipPercent: clampPreviewPercent(Number(event.target.value)) })}
            className="w-full accent-[#16D6B2]"
          />
          <p className="mt-1.5 text-xs text-secondaryText">
            The preview stops at this point and shows a register button. It works with YouTube, Vimeo and direct video links.
          </p>
          {!clipWorks && <Notice tone="warning">Your webinar video can&apos;t be limited to a clip. Use a separate short video instead, or the preview won&apos;t be shown.</Notice>}
        </div>
      ) : (
        <MediaUploadField
          kind="video"
          label="Preview video"
          value={preview.customUrl}
          onChange={(v) => onChange({ ...preview, customUrl: v })}
          placeholder="https://… (YouTube, Vimeo or a video file)"
          previewClassName="aspect-video"
          hint="Keep it short: 30–90 seconds works well."
          error={error}
        />
      )}
      {preview.source === "clip" && error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
