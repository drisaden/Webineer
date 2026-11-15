"use client";

import { useEffect, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import type { PreviewSource } from "@/lib/webinar-workflow/preview";

/* Minimal shapes of the two third-party player APIs we use (loaded from their own CDNs on demand). */
interface YouTubePlayer {
  getDuration(): number;
  getCurrentTime(): number;
  pauseVideo(): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    el: HTMLElement,
    options: { videoId: string; host?: string; playerVars?: Record<string, number | string>; events?: { onReady?: () => void; onStateChange?: (event: { data: number }) => void } },
  ) => YouTubePlayer;
}
interface VimeoPlayer {
  getDuration(): Promise<number>;
  pause(): Promise<void>;
  destroy(): Promise<void>;
  on(event: "timeupdate", handler: (data: { seconds: number }) => void): void;
}
interface VimeoApi {
  Player: new (el: HTMLElement, options: { id: number; byline?: boolean; title?: boolean; portrait?: boolean; dnt?: boolean }) => VimeoPlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: VimeoApi;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("load failed")));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("load failed")));
    document.head.appendChild(script);
  });
}

function loadYouTube(): Promise<YouTubeApi> {
  return new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    loadScript("https://www.youtube.com/iframe_api").catch(reject);
  });
}

/**
 * Plays a limited preview on the registration page: either a short clip the host supplied, or only
 * the first N% of the webinar video. When the limit is reached the player is removed and the
 * visitor is pointed at the registration form.
 */
export function PreviewPlayer({ source, title, ctaHref = "#register", ctaLabel = "Register to watch the full session" }: { source: PreviewSource; title: string; ctaHref?: string; ctaLabel?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const limited = source.percent < 100;
  const kind = source.kind;
  const percent = source.percent;
  const videoId = source.kind === "file" ? "" : source.videoId;

  useEffect(() => {
    if (finished || kind === "file") return;
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const holder = document.createElement("div");
    holder.className = "h-full w-full";
    mount.appendChild(holder);

    if (kind === "youtube") {
      loadYouTube()
        .then((YT) => {
          if (cancelled) return;
          let timer: number | undefined;
          const player = new YT.Player(holder, {
            videoId,
            host: "https://www.youtube-nocookie.com",
            playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
            events: {
              onStateChange: (event) => {
                // 0 = ended, 1 = playing
                if (event.data === 0) setFinished(true);
                if (event.data !== 1 || !limited || timer) return;
                timer = window.setInterval(() => {
                  const duration = player.getDuration();
                  if (duration > 0 && player.getCurrentTime() >= (duration * percent) / 100) {
                    player.pauseVideo();
                    setFinished(true);
                  }
                }, 400);
              },
            },
          });
          cleanup = () => {
            if (timer) window.clearInterval(timer);
            try {
              player.destroy();
            } catch {
              /* already gone */
            }
          };
        })
        .catch(() => !cancelled && setFailed(true));
    } else {
      loadScript("https://player.vimeo.com/api/player.js")
        .then(() => {
          if (cancelled || !window.Vimeo) return;
          const player = new window.Vimeo.Player(holder, { id: Number(videoId), byline: false, title: false, portrait: false, dnt: true });
          let duration = 0;
          void player.getDuration().then((d) => (duration = d));
          player.on("timeupdate", ({ seconds }) => {
            if ((limited && duration > 0 && seconds >= (duration * percent) / 100) || (duration > 0 && seconds >= duration - 0.3)) {
              void player.pause();
              setFinished(true);
            }
          });
          cleanup = () => void player.destroy().catch(() => undefined);
        })
        .catch(() => !cancelled && setFailed(true));
    }

    return () => {
      cancelled = true;
      cleanup?.();
      holder.remove();
    };
  }, [finished, limited, kind, percent, videoId]);

  // Direct video files: stop at the limit and don't allow seeking past it.
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !limited || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (video.currentTime >= (video.duration * source.percent) / 100) {
      video.pause();
      setFinished(true);
    }
  };

  return (
    <div className="preview-player relative aspect-video w-full overflow-hidden bg-[#111C2E]" data-preview-kind={source.kind} data-preview-percent={source.percent}>
      {finished ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <PlayCircle className="h-10 w-10 text-[#16D6B2]" aria-hidden />
          <p className="max-w-sm text-base font-medium text-white">That&apos;s the end of the preview.</p>
          <a href={ctaHref} className="rounded-2xl bg-[#16D6B2] px-5 py-3 text-sm font-semibold text-[#101B35]">
            {ctaLabel}
          </a>
          <button type="button" onClick={() => setFinished(false)} className="text-xs text-white/70 underline-offset-2 hover:underline">
            Watch the preview again
          </button>
        </div>
      ) : failed ? (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/70">The preview couldn&apos;t be loaded. You can still register below.</div>
      ) : source.kind === "file" ? (
        <video ref={videoRef} src={source.url} title={title} className="h-full w-full" controls playsInline preload="metadata" controlsList="nodownload" onTimeUpdate={onTimeUpdate} onEnded={() => setFinished(true)} />
      ) : (
        <div ref={mountRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
      )}
      {limited && !finished && !failed && (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">Preview · first {source.percent}%</span>
      )}
    </div>
  );
}
