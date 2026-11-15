"use client";

import { useCallback, useId, useRef, useState } from "react";
import { CircleAlert, Film, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useViewer } from "@/components/auth/viewer-context";
import { cn } from "@/lib/utils";

type Kind = "image" | "video";

const ACCEPT: Record<Kind, { mime: string; label: string; maxMb: number; extensions: string[] }> = {
  image: { mime: "image/jpeg,image/png,image/webp,image/gif,image/avif", label: "JPG, PNG, WebP, GIF or AVIF", maxMb: 10, extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"] },
  video: { mime: "video/mp4,video/webm,video/quicktime,video/x-m4v", label: "MP4, WebM or MOV", maxMb: 100, extensions: ["mp4", "webm", "mov", "m4v"] },
};

const isHttps = (value: string) => /^https:\/\/\S+$/.test(value);

/** Serve uploaded images in a modern format at a sensible quality without changing the stored file. */
export function optimisedDeliveryUrl(url: string, kind: Kind): string {
  if (kind !== "image") return url;
  return url.replace(/(res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!f_auto)/, "$1f_auto,q_auto/");
}

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: Kind;
  optional?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  /** Tailwind aspect class for the preview, e.g. "aspect-[16/7]" or "aspect-square". */
  previewClassName?: string;
  compact?: boolean;
}

/**
 * A media field with two ways in: paste a link (always available) or drop / pick a file, which is
 * uploaded straight from the browser to Cloudinary and stored as its https link.
 */
export function MediaUploadField({ label, value, onChange, kind = "image", optional, hint, error, placeholder, previewClassName, compact }: Props) {
  const viewer = useViewer();
  const uploadsEnabled = Boolean(viewer?.uploadsEnabled);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const rules = ACCEPT[kind];
  const busy = progress !== null;

  const upload = useCallback(
    async (file: File) => {
      setUploadError(null);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!rules.extensions.includes(ext)) return setUploadError(`Use ${rules.label}.`);
      if (file.size > rules.maxMb * 1024 * 1024) return setUploadError(`That file is larger than ${rules.maxMb} MB.`);
      setProgress(0);
      try {
        const signRes = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
        const signed = await signRes.json().catch(() => ({}));
        if (!signRes.ok) throw new Error(signed.error ?? "Couldn't start the upload.");
        const form = new FormData();
        for (const [key, fieldValue] of Object.entries(signed.fields as Record<string, string>)) form.append(key, fieldValue);
        form.append("file", file);
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", signed.uploadUrl);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () => {
            let body: { secure_url?: string; error?: { message?: string } } = {};
            try {
              body = JSON.parse(xhr.responseText);
            } catch {
              /* handled below */
            }
            if (xhr.status >= 200 && xhr.status < 300 && typeof body.secure_url === "string" && isHttps(body.secure_url)) resolve(body.secure_url);
            else reject(new Error(body.error?.message ?? "The upload was rejected."));
          };
          xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
          xhr.send(form);
        });
        onChange(optimisedDeliveryUrl(url, kind));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setProgress(null);
      }
    },
    [kind, onChange, rules],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!uploadsEnabled || busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const shownError = uploadError ?? error ?? (value && !isHttps(value) ? "Use an https:// link." : undefined);
  const Icon = kind === "video" ? Film : ImagePlus;

  return (
    <div className="min-w-0" data-media-field={kind}>
      <label htmlFor={inputId} className="mb-2 flex items-center gap-2 text-sm font-medium text-primaryText">
        {label}
        {optional && <span className="text-xs font-normal text-secondaryText">Optional</span>}
      </label>

      <div
        onDragOver={(event) => {
          if (!uploadsEnabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border border-dashed p-3 transition-colors",
          dragging ? "border-[#16D6B2] bg-[#EAFBF5]" : "border-[#C9D5E6] bg-[#F7F9FC]",
        )}
      >
        {value && isHttps(value) && (kind === "image" || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(value) || /res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(value)) && (
          <div className={cn("relative mb-3 overflow-hidden rounded-xl border border-border bg-white", compact ? "h-20 w-20" : previewClassName ?? "aspect-[16/7]", !compact && "w-full")}>
            {kind === "video" ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label={`Remove ${kind}`}
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-[#B33A3A] shadow hover:bg-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className={cn("flex gap-2", compact ? "flex-col" : "flex-col sm:flex-row sm:items-center")}>
          <input
            id={inputId}
            className={cn("input-field min-w-0 flex-1", shownError && "border-[#DC5353]")}
            value={value}
            onChange={(event) => {
              setUploadError(null);
              onChange(event.target.value.trim());
            }}
            placeholder={placeholder ?? (kind === "video" ? "https://…/clip.mp4" : "https://…/image.jpg")}
            aria-invalid={Boolean(shownError) || undefined}
            inputMode="url"
          />
          <button
            type="button"
            disabled={!uploadsEnabled || busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-[#17294B] hover:bg-[#EEF5FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
            {busy ? `Uploading ${progress}%` : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={rules.mime}
            className="hidden"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>

        {busy && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#16D6B2] transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}

        <p className="mt-2 flex items-center gap-1.5 text-xs text-secondaryText">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {uploadsEnabled ? `Paste a link, or drop a file here to upload (${rules.label}, up to ${rules.maxMb} MB).` : "Paste a link to a file hosted elsewhere. Uploads aren't set up on this site yet."}
        </p>
      </div>

      {shownError ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B33A3A]">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {shownError}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-secondaryText">{hint}</p>
      ) : null}
    </div>
  );
}
