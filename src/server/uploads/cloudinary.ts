import { createHash } from "node:crypto";

/**
 * Cloudinary direct uploads. Webineer never receives the file: the browser sends it straight to
 * Cloudinary with a short-lived signature made here, so the API secret stays on the server and
 * uploads can only land in the caller's own workspace folder with the formats we allow.
 */
export type UploadKind = "image" | "video";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  apiBase: string;
}

const NAME_RE = /^[a-zA-Z0-9_-]{1,80}$/;

export function cloudinaryConfig(env: Record<string, string | undefined> = process.env): CloudinaryConfig | null {
  let cloudName = env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  let apiKey = env.CLOUDINARY_API_KEY?.trim() ?? "";
  let apiSecret = env.CLOUDINARY_API_SECRET?.trim() ?? "";
  // Also accept Cloudinary's single-variable form: cloudinary://<api_key>:<api_secret>@<cloud_name>
  const url = env.CLOUDINARY_URL?.trim();
  if ((!cloudName || !apiKey || !apiSecret) && url) {
    const match = /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)$/.exec(url);
    if (match) [, apiKey, apiSecret, cloudName] = match;
  }
  if (!cloudName || !apiKey || !apiSecret || !NAME_RE.test(cloudName)) return null;
  // CLOUDINARY_API_BASE exists for automated tests only; production uses Cloudinary's own API host.
  const apiBase = (env.CLOUDINARY_API_BASE?.trim() || "https://api.cloudinary.com").replace(/\/+$/, "");
  return { cloudName, apiKey, apiSecret, apiBase };
}

export function cloudinaryConfigured(): boolean {
  return cloudinaryConfig() !== null;
}

export const UPLOAD_RULES: Record<UploadKind, { formats: string[]; maxBytes: number }> = {
  image: { formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"], maxBytes: 10 * 1024 * 1024 },
  video: { formats: ["mp4", "webm", "mov", "m4v"], maxBytes: 100 * 1024 * 1024 },
};

/** Cloudinary's signature: SHA-1 of the alphabetically sorted `key=value` pairs joined by `&`, then the secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export interface SignedUpload {
  uploadUrl: string;
  /** Form fields to send with the file, exactly as signed. */
  fields: Record<string, string>;
  maxBytes: number;
  formats: string[];
}

export function createSignedUpload(input: { organizationId: string; kind: UploadKind; now?: Date }): SignedUpload | null {
  const config = cloudinaryConfig();
  if (!config) return null;
  const rules = UPLOAD_RULES[input.kind];
  const params = {
    allowed_formats: rules.formats.join(","),
    // One folder per workspace keeps tenants' files apart and easy to clean up.
    folder: `webineer/${input.organizationId}/${input.kind}s`,
    timestamp: Math.floor((input.now ?? new Date()).getTime() / 1000),
  };
  return {
    uploadUrl: `${config.apiBase}/v1_1/${config.cloudName}/${input.kind}/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: config.apiKey,
      signature: signParams(params, config.apiSecret),
    },
    maxBytes: rules.maxBytes,
    formats: rules.formats,
  };
}
