import { escapeHtml } from "@/lib/webinar-workflow/email-render";

/** Absolute URL of the PNG logo for the email header (email clients can't render SVG or load relative paths). */
function logoUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/brand/email-logo.png`;
}

/** Branded, table-based wrapper that renders consistently in common email clients. */
const plain = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, " ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * The hidden preheader is read by mail apps as the inbox/notification preview, and the visible body follows it.
 * When the preheader just repeats the opening of the body, the preview reads the same line twice, so it is dropped.
 */
export function usefulPreheader(preheader: string | undefined, contentHtml: string): string | undefined {
  const text = preheader?.trim();
  if (!text) return undefined;
  const wanted = plain(text);
  return wanted && plain(contentHtml).slice(0, 600).includes(wanted) ? undefined : text;
}

export function renderLayout(opts: { contentHtml: string; preheader?: string; footer?: string; footerHtml?: string }): string {
  const preheader = usefulPreheader(opts.preheader, opts.contentHtml);
  const footer = opts.footer ?? "You’re receiving this email because of activity on Webineer.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Webineer</title></head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:Arial,Helvetica,sans-serif;color:#17294B;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #E4E9F1;border-radius:14px;">
<tr><td style="background:#101B35;border-radius:14px 14px 0 0;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;"><img src="${logoUrl()}" alt="Webineer" width="140" height="28" style="display:block;border:0;outline:none;height:28px;width:auto;color:#ffffff;font-size:18px;font-weight:bold;"></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#17294B;">${opts.contentHtml}</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #E4E9F1;font-size:12px;line-height:1.5;color:#64748B;">${escapeHtml(footer)}${opts.footerHtml ? `<br><br>${opts.footerHtml}` : ""}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:28px 0;text-align:center;"><a href="${escapeHtml(href)}" style="background:#16D6B2;color:#101B35;padding:12px 28px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

export function fallbackLink(href: string): string {
  return `<p style="font-size:13px;color:#64748B;word-break:break-all;">If the button doesn’t work, copy this link into your browser:<br><a href="${escapeHtml(href)}" style="color:#17294B;">${escapeHtml(href)}</a></p>`;
}
