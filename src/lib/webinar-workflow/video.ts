import { getEmbedUrl, validateVideoUrl } from "@/providers/video";
import type { VideoProviderValue } from "@/types";

export interface PlaybackOptions {
  autoplay?: boolean;
  muted?: boolean;
  showControls?: boolean;
}

/**
 * Build a player URL for an external video, applying playback settings where
 * the provider supports them. Webineer never hosts or streams video itself.
 * Returns null for URLs that fail provider validation or aren't https.
 */
export function buildPlayerUrl(provider: VideoProviderValue, url: string, options: PlaybackOptions = {}): string | null {
  const trimmed = url.trim();
  if (!trimmed || !validateVideoUrl(provider, trimmed)) return null;
  const embed = getEmbedUrl(provider, trimmed);
  let parsed: URL;
  try {
    parsed = new URL(embed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (provider === "youtube") {
    if (options.autoplay) parsed.searchParams.set("autoplay", "1");
    if (options.muted || options.autoplay) parsed.searchParams.set("mute", "1");
    if (options.showControls === false) parsed.searchParams.set("controls", "0");
    parsed.searchParams.set("rel", "0");
  } else if (provider === "vimeo") {
    if (options.autoplay) parsed.searchParams.set("autoplay", "1");
    if (options.muted || options.autoplay) parsed.searchParams.set("muted", "1");
    if (options.showControls === false) parsed.searchParams.set("controls", "0");
  } else if (provider === "wistia") {
    if (options.autoplay) parsed.searchParams.set("autoPlay", "true");
    if (options.muted) parsed.searchParams.set("muted", "true");
  }
  return parsed.toString();
}

/** Providers the workflow offers: embeddable external sources only (no uploads). */
export const WORKFLOW_VIDEO_PROVIDERS: VideoProviderValue[] = ["youtube", "vimeo", "wistia", "custom_iframe", "external_live_stream", "custom_url"];
