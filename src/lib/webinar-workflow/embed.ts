import type { WebinarWorkflowConfig } from "@/types";

/**
 * Embed snippet generators. Snippets only ever contain the webinar's public
 * identifier and the public app origin: no credentials, API keys or internal
 * ids. All submissions go through the Webineer-hosted form, so the customer's
 * site never talks to the API directly.
 */

export function resolveAppOrigin(fallback?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return (fallback ?? "").replace(/\/+$/, "");
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function hostedRegistrationUrl(origin: string, slug: string, source?: string) {
  return `${origin}/w/${slug}${source ? `?source=${source}` : ""}`;
}

export function embedUrl(origin: string, publicId: string, source: "inline" | "popup" = "inline") {
  return `${origin}/embed/${publicId}?source=${source}`;
}

export function inlineEmbedSnippet(origin: string, config: WebinarWorkflowConfig, title: string) {
  return `<iframe src="${escapeAttr(embedUrl(origin, config.publicId, "inline"))}" width="100%" height="${config.registration.embed.inlineHeight}" frameborder="0" loading="lazy" title="${escapeAttr(`Register: ${title}`)}" style="border:0;max-width:100%;"></iframe>`;
}

function buttonStyle(config: WebinarWorkflowConfig) {
  const e = config.registration.embed;
  return `display:inline-block;padding:12px 22px;background:${e.buttonBackground};color:${e.buttonTextColor};border:0;border-radius:${e.buttonRadius}px;font:600 15px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;text-decoration:none;cursor:pointer;`;
}

export function popupEmbedSnippet(origin: string, config: WebinarWorkflowConfig) {
  const e = config.registration.embed;
  return [
    `<button type="button" data-webineer-register="${escapeAttr(config.publicId)}" data-webineer-origin="${escapeAttr(origin)}" style="${buttonStyle(config)}">${escapeAttr(e.popupButtonText)}</button>`,
    `<script src="${escapeAttr(origin)}/webineer-popup.js" async></script>`,
  ].join("\n");
}

export function registrationButtonSnippet(origin: string, config: WebinarWorkflowConfig, slug: string) {
  const e = config.registration.embed;
  return `<a href="${escapeAttr(hostedRegistrationUrl(origin, slug, "button"))}" target="_blank" rel="noopener" style="${buttonStyle(config)}">${escapeAttr(e.buttonText)}</a>`;
}
