import type { VideoPreviewSettings, WebinarWorkflowConfig } from "@/types";

/**
 * Registration-page video preview. The page never embeds the whole webinar: it either plays only
 * the opening part of the webinar video, or a separate short clip the host provides.
 */
export const PREVIEW_PERCENT_MIN = 5;
export const PREVIEW_PERCENT_MAX = 50;
export const DEFAULT_VIDEO_PREVIEW: VideoPreviewSettings = { source: "clip", clipPercent: 10, customUrl: "" };

export type PreviewSource =
  | { kind: "youtube"; videoId: string; percent: number }
  | { kind: "vimeo"; videoId: string; percent: number }
  | { kind: "file"; url: string; percent: number };

const YT_ID = "[A-Za-z0-9_-]{6,20}";

export function youtubeVideoId(url: string): string | null {
  const match =
    new RegExp(`(?:youtube\\.com|youtube-nocookie\\.com)/(?:watch\\?(?:.*&)?v=|embed/|shorts/|live/)(${YT_ID})`, "i").exec(url) ??
    new RegExp(`youtu\\.be/(${YT_ID})`, "i").exec(url);
  return match ? match[1] : null;
}

export function vimeoVideoId(url: string): string | null {
  const match = /vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d{5,12})/i.exec(url);
  return match ? match[1] : null;
}

/** A link the browser can play in a plain <video> element. */
export function isDirectVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return /\.(mp4|webm|mov|m4v)$/i.test(parsed.pathname) || /^res\.cloudinary\.com$/i.test(parsed.hostname) && /\/video\/upload\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function playable(url: string, percent: number): PreviewSource | null {
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return null;
  const yt = youtubeVideoId(trimmed);
  if (yt) return { kind: "youtube", videoId: yt, percent };
  const vimeo = vimeoVideoId(trimmed);
  if (vimeo) return { kind: "vimeo", videoId: vimeo, percent };
  if (isDirectVideoUrl(trimmed)) return { kind: "file", url: trimmed, percent };
  return null;
}

export function clampPreviewPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VIDEO_PREVIEW.clipPercent;
  return Math.min(PREVIEW_PERCENT_MAX, Math.max(PREVIEW_PERCENT_MIN, Math.round(value)));
}

/** Whether "play the first N%" can work for the webinar's own video (it needs a player we can stop). */
export function clipPreviewSupported(videoUrl: string): boolean {
  return playable(videoUrl, 10) !== null;
}

/** What the public page should play, or null when the preview is off or can't be limited safely. */
export function resolveVideoPreview(config: WebinarWorkflowConfig): PreviewSource | null {
  const r = config.registration;
  if (!r.showVideoPreview) return null;
  const settings = r.videoPreview ?? DEFAULT_VIDEO_PREVIEW;
  if (settings.source === "custom") return playable(settings.customUrl, 100);
  return playable(config.integrations.video.url, clampPreviewPercent(settings.clipPercent));
}
