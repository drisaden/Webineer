import type { VideoProvider, VideoProviderValue, VideoSource } from "@/types";

export const videoProviderCatalog: VideoProvider[] = [
  {
    id: "youtube",
    label: "YouTube",
    description: "Embed publicly shared YouTube videos and use native player controls.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: true,
    validationPattern: "^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be)/.+$",
    embedHint: "Use a valid YouTube watch URL or share link.",
    playerCapabilities: ["play", "pause", "seek", "mute", "fullscreen"],
  },
  {
    id: "vimeo",
    label: "Vimeo",
    description: "Embed Vimeo content while keeping the webinar experience configurable.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: true,
    validationPattern: "^(https?:\\/\\/)?(www\\.)?vimeo\\.com/.+$",
    embedHint: "Use a valid Vimeo share URL.",
    playerCapabilities: ["play", "pause", "seek", "fullscreen"],
  },
  {
    id: "wistia",
    label: "Wistia",
    description: "Use Wistia-hosted video content with a clean branded player.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: true,
    validationPattern: "^(https?:\\/\\/)?(www\\.)?wistia\\.com/.+$",
    embedHint: "Use a valid Wistia media URL.",
    playerCapabilities: ["play", "pause", "seek", "volume"],
  },
  {
    id: "custom_iframe",
    label: "Custom iframe",
    description: "Render trusted iframe content with sanitized embed rules and platform controls.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: true,
    canExtractId: false,
    validationPattern: "^https?:\\/\\/.*$",
    embedHint: "Provide a trusted embed URL or iframe source.",
    playerCapabilities: ["iframe", "sandbox", "fullscreen"],
  },
  {
    id: "custom_url",
    label: "Custom URL",
    description: "Reference an external webpage or streaming endpoint without native embedding.",
    supportsEmbed: false,
    supportsUpload: false,
    supportsCustomHtml: false,
    canExtractId: false,
    validationPattern: "^https?:\\/\\/.*$",
    embedHint: "Use a direct URL to a hosted media or landing destination.",
    playerCapabilities: ["redirect"],
  },
  {
    id: "uploaded_video",
    label: "Uploaded video",
    description: "Use a native upload or a browser-hosted file source in an app-managed player.",
    supportsEmbed: true,
    supportsUpload: true,
    supportsCustomHtml: false,
    canExtractId: false,
    validationPattern: "^.+\\.(mp4|webm|mov|m4v)$",
    embedHint: "Upload a supported video file for local playback.",
    playerCapabilities: ["play", "pause", "seek", "volume"],
  },
  {
    id: "external_live_stream",
    label: "External live stream",
    description: "Use a live stream link or a public RTMP-style endpoint with a custom player wrapper.",
    supportsEmbed: true,
    supportsUpload: false,
    supportsCustomHtml: true,
    canExtractId: false,
    validationPattern: "^https?:\\/\\/.*$",
    embedHint: "Provide a direct live stream or embed URL.",
    playerCapabilities: ["live", "chat", "fullscreen"],
  },
];

const PROVIDER_LOOKUP = Object.fromEntries(
  videoProviderCatalog.map((provider) => [provider.id, provider]),
) as Record<VideoProviderValue, VideoProvider>;

export function getVideoProvider(providerId: VideoProviderValue): VideoProvider {
  return PROVIDER_LOOKUP[providerId];
}

export function validateVideoUrl(providerId: VideoProviderValue, url: string): boolean {
  const provider = getVideoProvider(providerId);
  if (!provider.validationPattern) {
    return url.trim().length > 0;
  }

  return new RegExp(provider.validationPattern, "i").test(url.trim());
}

export function extractVideoId(providerId: VideoProviderValue, url: string): string | null {
  const trimmedUrl = url.trim();

  switch (providerId) {
    case "youtube": {
      const match = trimmedUrl.match(/[?&]v=([^&#]+)|youtu\.be\/([^&#]+)/i);
      return match ? (match[1] ?? match[2]) ?? null : null;
    }
    case "vimeo": {
      const match = trimmedUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      return match ? match[1] : null;
    }
    case "wistia": {
      const match = trimmedUrl.match(/wistia\.com\/(?:medias\/)?([A-Za-z0-9]+)/i);
      return match ? match[1] : null;
    }
    default:
      return null;
  }
}

export function getEmbedUrl(providerId: VideoProviderValue, url: string): string {
  const id = extractVideoId(providerId, url);

  switch (providerId) {
    case "youtube":
      return id ? `https://www.youtube.com/embed/${id}` : url;
    case "vimeo":
      return id ? `https://player.vimeo.com/video/${id}` : url;
    case "wistia":
      return id ? `https://fast.wistia.net/embed/iframe/${id}` : url;
    case "custom_iframe":
    case "external_live_stream":
      return url;
    case "uploaded_video":
    case "custom_url":
    default:
      return url;
  }
}

export function normalizeVideoSource(input: Partial<VideoSource>): { valid: boolean; value?: VideoSource; error?: string } {
  const provider = input.provider ?? "youtube";
  const url = (input.url ?? "").trim();

  if (!url) {
    return {
      valid: false,
      error: "Add a valid video URL or embed source.",
    };
  }

  const valid = validateVideoUrl(provider, url);
  if (!valid) {
    return {
      valid: false,
      error: `The URL does not match the ${getVideoProvider(provider).label} source format.`,
    };
  }

  return {
    valid: true,
    value: {
      id: input.id ?? `vs_${Date.now()}`,
      provider,
      url,
      title: input.title ?? "New webinar source",
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      embedCode: input.embedCode,
      isEmbedded: input.isEmbedded ?? true,
    },
  };
}

export function buildRegistrationUrl(webinarSlug: string): string {
  return `/w/${webinarSlug}`;
}
