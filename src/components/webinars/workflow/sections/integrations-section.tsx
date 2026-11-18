"use client";

import { BarChart3, CreditCard, Megaphone, PlayCircle, Webhook } from "lucide-react";
import { getVideoProvider } from "@/providers/video";
import { buildPlayerUrl, WORKFLOW_VIDEO_PROVIDERS } from "@/lib/webinar-workflow/video";
import { TicketOptionsEditor } from "./ticket-options-editor";
import { CopyField, errorFor, IssueSummary, Notice, NumberInput, SectionCard, SelectInput, TextInput, Toggle, UnavailableBadge } from "../form-controls";
import type { SectionProps } from "../section-types";

export function IntegrationsSection({ draft, update, issues, showErrors, context }: SectionProps) {
  const i = draft.integrations;
  const set = <K extends keyof typeof i>(key: K, value: (typeof i)[K]) => update("integrations", { ...i, [key]: value });
  const provider = getVideoProvider(i.video.provider);
  const playerUrl = buildPlayerUrl(i.video.provider, i.video.url, i.video);
  const canEmbed = provider.supportsEmbed;

  return (
    <div className="space-y-5">
      <SectionCard title="Video" description="Use a video hosted elsewhere. Webineer embeds it; it doesn't host or stream video files." icon={<PlayCircle className="h-4 w-4" />}>
        <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <SelectInput
            label="Provider"
            value={i.video.provider}
            onChange={(v) => set("video", { ...i.video, provider: v })}
            options={WORKFLOW_VIDEO_PROVIDERS.map((id) => ({ value: id, label: getVideoProvider(id).label }))}
          />
          <TextInput label="Video URL" value={i.video.url} onChange={(v) => set("video", { ...i.video, url: v.trim() })} placeholder="https://www.youtube.com/watch?v=…" hint={provider.embedHint} error={errorFor(issues, "video.url", showErrors)} />
        </div>
        {(i.video.provider === "youtube" || i.video.provider === "vimeo" || i.video.provider === "wistia") && (
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle label="Autoplay" description="Browsers require autoplay to start muted." checked={i.video.autoplay} onChange={(v) => set("video", { ...i.video, autoplay: v })} />
            <Toggle label="Start muted" checked={i.video.muted || i.video.autoplay} disabled={i.video.autoplay} onChange={(v) => set("video", { ...i.video, muted: v })} />
            <Toggle label="Show player controls" checked={i.video.showControls} disabled={i.video.provider === "wistia"} onChange={(v) => set("video", { ...i.video, showControls: v })} />
          </div>
        )}
        {i.video.url && !canEmbed && <Notice>This provider opens the video as a link instead of embedding it in the room.</Notice>}
        {playerUrl && canEmbed ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-[#101B35]">
            <div className="aspect-video w-full">
              <iframe
                src={playerUrl}
                title="Video preview"
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox={i.video.provider === "custom_iframe" || i.video.provider === "external_live_stream" ? "allow-scripts allow-same-origin allow-presentation allow-popups" : undefined}
              />
            </div>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[#9FB3D1] bg-[#F7F9FC] p-6 text-center text-sm text-secondaryText">
            {i.video.url ? "The preview appears once the URL matches the selected provider." : "Paste a video URL to preview it here."}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Paid registration" description="Charge for seats. Payments are collected securely, and you can withdraw your earnings from the Earnings page." icon={<CreditCard className="h-4 w-4" />}>
        <Notice tone={context.payment.live ? "success" : "warning"}>
          {context.payment.live
            ? "Payments are verified automatically before anyone gets access. Your earnings appear on the Earnings page."
            : context.payment.unavailable
              ? "Online payments are temporarily unavailable, so a paid webinar can’t be published right now. Contact support if this continues."
              : context.payment.provider === "flutterwave"
                ? "Payments are in test mode: checkout works with test cards, but no real money is collected."
                : "Demo workspace: paid registrations are simulated and no real money is collected."}
        </Notice>
        <Toggle label="Require payment to register" checked={i.payment.enabled} onChange={(v) => set("payment", { ...i.payment, enabled: v })} />
        {i.payment.enabled && (
          <>
          <div className="grid gap-5 md:grid-cols-2">
            <NumberInput label={i.payment.tiers?.length ? "Price (not used while ticket options exist)" : "Price"} value={i.payment.price} onChange={(v) => set("payment", { ...i.payment, price: Math.max(0, Math.round(v * 100) / 100) })} min={0} step={100} error={errorFor(issues, "payment.price", showErrors)} />
            <SelectInput
              label="Currency"
              value={i.payment.currency}
              onChange={(v) => set("payment", { ...i.payment, currency: v })}
              options={[
                { value: "NGN", label: "NGN — Nigerian naira" },
                { value: "USD", label: "USD — US dollar" },
                { value: "GBP", label: "GBP — British pound" },
                { value: "EUR", label: "EUR — Euro" },
              ]}
            />
          </div>
          <TicketOptionsEditor payment={i.payment} onChange={(p) => set("payment", p)} />
          </>
        )}
      </SectionCard>

      <SectionCard title="Tracking" description="Loaded on the hosted registration page, embedded forms and the thank-you page." icon={<BarChart3 className="h-4 w-4" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Google Analytics 4 measurement ID" optional value={i.analytics.googleAnalyticsId} onChange={(v) => set("analytics", { ...i.analytics, googleAnalyticsId: v.trim().toUpperCase() })} placeholder="G-XXXXXXXXXX" error={errorFor(issues, "analytics.googleAnalyticsId", showErrors)} />
          <TextInput label="Meta Pixel ID" optional value={i.analytics.metaPixelId} onChange={(v) => set("analytics", { ...i.analytics, metaPixelId: v.trim() })} placeholder="123456789012345" error={errorFor(issues, "analytics.metaPixelId", showErrors)} />
        </div>
        <p className="text-xs text-secondaryText">Only validated IDs are injected, never custom scripts. Remember to update your privacy/cookie notice.</p>
      </SectionCard>

      <SectionCard title="Webhook" description="POST a signed JSON event to your endpoint for every confirmed registration." icon={<Webhook className="h-4 w-4" />}>
        <Toggle label="Send registration webhooks" checked={i.webhook.enabled} onChange={(v) => set("webhook", { ...i.webhook, enabled: v })} />
        {i.webhook.enabled && (
          <>
            <TextInput label="Endpoint URL" value={i.webhook.url} onChange={(v) => set("webhook", { ...i.webhook, url: v.trim() })} placeholder="https://hooks.example.com/webineer" hint="Private network and localhost addresses are blocked." error={errorFor(issues, "webhook.url", showErrors)} />
            {context.webhookSecret ? (
              <CopyField label="Signing secret" value={context.webhookSecret} hint="Sent as X-Webineer-Signature. Keep it private." />
            ) : (
              <p className="text-xs text-secondaryText">A signing secret is generated when you save.</p>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Marketing integrations" icon={<Megaphone className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-secondaryText">
          Mailchimp, HubSpot and other CRM connectors <UnavailableBadge />
        </div>
        <p className="text-xs text-secondaryText">Use the webhook above with a tool such as Zapier or Make to sync registrants to your other apps.</p>
      </SectionCard>

      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}
