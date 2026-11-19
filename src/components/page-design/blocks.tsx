import type { CSSProperties, ReactNode } from "react";
import { BarChart3, BookOpen, CalendarClock, CalendarDays, Check, CheckCircle2, Clock, Gift, Globe, Heart, ImageIcon, Mail, MapPin, Mic, Phone, Quote, Rocket, ShieldCheck, Star, UserRound, Users, Video, Zap, type LucideIcon } from "lucide-react";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import { PreviewPlayer } from "@/components/registration/preview-player";
import { RegistrationForm } from "@/components/registration/registration-form";
import { cn } from "@/lib/utils";
import type { PageBlock, PageDesign, PageIcon, PageTheme, RegistrationSource } from "@/types";
import { Countdown } from "./countdown";
import { TabsElement } from "./tabs-element";

const isHttps = (value: string | undefined): value is string => !!value && /^https:\/\/\S+$/.test(value);

const ICONS: Record<PageIcon, LucideIcon> = { check: Check, star: Star, heart: Heart, bolt: Zap, shield: ShieldCheck, clock: Clock, users: Users, calendar: CalendarDays, gift: Gift, globe: Globe, mic: Mic, book: BookOpen, chart: BarChart3, rocket: Rocket, mail: Mail, phone: Phone };

export type PreviewDevice = "desktop" | "tablet" | "mobile";

/** Tailwind classes that hide a block on the devices it is turned off for (public pages use real screen size). */
export function visibilityClasses(show: PageBlock["show"]): string {
  if (!show) return "";
  return cn(!show.mobile && "max-sm:hidden", !show.tablet && "sm:max-lg:hidden", !show.desktop && "lg:hidden");
}

const PADDING: Record<PageBlock["style"]["padding"], string> = { none: "p-0", sm: "p-3 md:p-4", md: "p-6 md:p-7", lg: "p-8 md:p-12" };
const WIDTH: Record<PageBlock["style"]["width"], string> = { narrow: "max-w-2xl", normal: "max-w-none", wide: "max-w-none" };

export interface BlockContext {
  view: PublicRegistrationView;
  theme: PageTheme;
  /** "builder" shows placeholders for empty blocks and never submits the form. */
  mode: "public" | "builder";
  preview: boolean;
  source: RegistrationSource;
  /** The builder's device preview. Public pages use the real screen size instead. */
  device?: PreviewDevice;
}

/** True when a block has nothing to show to visitors (the builder still shows a placeholder). */
export function isBlockEmpty(block: PageBlock, view: PublicRegistrationView): boolean {
  switch (block.type) {
    case "image":
      return !isHttps(block.imageUrl);
    case "video":
      return !view.videoPreview;
    case "countdown":
      return view.mode !== "schedule_later" || !view.sessions.length;
    case "presenters":
      return view.presenters.length === 0 && !view.hostName;
    case "benefits":
    case "faq":
    case "testimonials":
      return block.items.filter((i) => i.title.trim() || i.text.trim()).length === 0;
    case "text":
    case "heading":
      return !block.heading.trim() && !block.text.trim();
    case "button":
      return !block.buttonLabel.trim();
    case "iconbox":
    case "pricing":
    case "stats":
    case "timeline":
    case "tabs":
      return block.items.filter((i) => i.title.trim() || i.text.trim()).length === 0;
    case "gallery":
    case "logos":
      return block.items.filter((i) => isHttps(i.imageUrl)).length === 0;
    case "social":
      return block.items.filter((i) => isHttps(i.link)).length === 0;
    case "map":
      return !block.text.trim() && !isHttps(block.link);
    case "columns":
      return !block.columns?.some((c) => c.blocks.some((b) => !isBlockEmpty(b, view)));
    case "cta":
      return !block.heading.trim() && !block.text.trim() && !block.buttonLabel.trim();
    default:
      return false;
  }
}

function Placeholder({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed tint-border px-4 py-8 text-center text-sm opacity-70">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function RegisterButton({ label, theme, link, flush }: { label: string; theme: PageTheme; link?: string; flush?: boolean }) {
  if (!label.trim()) return null;
  const external = isHttps(link);
  return (
    <a
      href={external ? link : "#register"}
      {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
      className={cn("inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5", !flush && "mt-5")}
      style={{ background: theme.accent, color: theme.accentText }}
    >
      {label}
    </a>
  );
}

function BlockBody({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const { view, theme, mode } = ctx;
  const builder = mode === "builder";
  const centered = block.style.align === "center";
  const items = block.items.filter((i) => i.title.trim() || i.text.trim());

  switch (block.type) {
    case "hero": {
      const image = isHttps(block.imageUrl) ? block.imageUrl : view.coverImageUrl;
      return (
        <div>
          {image && (
            <img src={image} alt={block.imageAlt} className="mb-6 aspect-[16/7] w-full rounded-2xl object-cover" />
          )}
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]" style={{ background: `${theme.accent}26`, color: block.style.textColor || theme.text }}>
            {view.mode === "always_on" ? "On-demand webinar" : "Webinar registration"}
          </span>
          <h1 className="mt-4 text-3xl leading-tight md:text-4xl">{block.heading.trim() || view.headline}</h1>
          {(block.text.trim() || view.description) && <p className={cn("mt-3 whitespace-pre-line text-base opacity-80", centered ? "mx-auto max-w-2xl" : "max-w-2xl")}>{block.text.trim() || view.description}</p>}
          {block.showDate && view.dateLabel && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl tint-soft px-3 py-2 text-sm">
              <CalendarClock className="h-4 w-4" style={{ color: theme.accent }} aria-hidden /> {view.dateLabel}
            </p>
          )}
          <div>
            <RegisterButton label={block.buttonLabel} theme={theme} />
          </div>
        </div>
      );
    }
    case "text":
      if (!block.heading.trim() && !block.text.trim()) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add a heading or some text.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          {block.text.trim() && <p className={cn("whitespace-pre-line text-base opacity-80", block.heading.trim() && "mt-3")}>{block.text}</p>}
        </div>
      );
    case "image":
      if (!isHttps(block.imageUrl)) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add an image in the block settings.</Placeholder> : null;
      return <img src={block.imageUrl} alt={block.imageAlt} className="w-full object-cover" style={{ borderRadius: block.style.radius }} />;
    case "media": {
      const hasImage = isHttps(block.imageUrl);
      return (
        <div className={cn("grid items-center gap-6", (hasImage || builder) && "md:grid-cols-2")}>
          <div className={cn(block.imageSide === "left" && "md:order-2")}>
            {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
            {block.text.trim() && <p className="mt-3 whitespace-pre-line text-base opacity-80">{block.text}</p>}
            <RegisterButton label={block.buttonLabel} theme={theme} />
          </div>
          {hasImage ? (
            <img src={block.imageUrl} alt={block.imageAlt} className="aspect-[4/3] w-full rounded-2xl object-cover" />
          ) : builder ? (
            <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add an image in the block settings.</Placeholder>
          ) : null}
        </div>
      );
    }
    case "video":
      if (!view.videoPreview) return builder ? <Placeholder icon={<Video className="h-5 w-5" />}>Turn on the video preview in the webinar&apos;s Registration settings to show it here.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-4 text-2xl">{block.heading}</h2>}
          <div className="overflow-hidden rounded-2xl bg-[#101B35]">
            <PreviewPlayer source={view.videoPreview} title={view.title} />
          </div>
        </div>
      );
    case "countdown":
      if (view.mode !== "schedule_later" || !view.sessions.length) {
        return builder ? <Placeholder icon={<CalendarClock className="h-5 w-5" />}>The countdown appears for scheduled webinars with an upcoming session.</Placeholder> : null;
      }
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-4 text-xl">{block.heading}</h2>}
          <Countdown startsAt={view.calendar.startsAt} accent={theme.accent} />
          <p className="mt-3 text-sm opacity-70">{view.dateLabel}</p>
        </div>
      );
    case "presenters": {
      const people = view.presenters.length ? view.presenters : view.hostName ? [{ name: view.hostName, title: "Host", bio: "", avatarUrl: "" }] : [];
      if (!people.length) return builder ? <Placeholder icon={<UserRound className="h-5 w-5" />}>Add a host or presenters in the webinar&apos;s Configuration.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-xl">{block.heading}</h2>}
          <ul className={cn("mt-4 grid gap-4 sm:grid-cols-2", centered && "justify-items-center")}>
            {people.map((p) => (
              <li key={p.name} className={cn("flex items-start gap-3 text-left")}>
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full tint-soft">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  {p.title && <p className="text-sm opacity-70">{p.title}</p>}
                  {p.bio && <p className="mt-1 text-sm opacity-70">{p.bio}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "benefits":
      if (!items.length) return builder ? <Placeholder icon={<CheckCircle2 className="h-5 w-5" />}>Add points in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <ul className={cn("mt-5 grid gap-4 text-left", items.length > 1 && "sm:grid-cols-2", items.length > 2 && "lg:grid-cols-3")}>
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} aria-hidden />
                <div>
                  {item.title.trim() && <p className="font-medium">{item.title}</p>}
                  {item.text.trim() && <p className="mt-0.5 text-sm opacity-75">{item.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    case "testimonials":
      if (!items.length) return builder ? <Placeholder icon={<Quote className="h-5 w-5" />}>Add testimonials in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <div className={cn("mt-5 grid gap-4 text-left", items.length > 1 && "md:grid-cols-2")}>
            {items.map((item) => (
              <figure key={item.id} className="rounded-2xl border tint-border tint-soft p-5">
                <Quote className="h-5 w-5" style={{ color: theme.accent }} aria-hidden />
                <blockquote className="mt-2 whitespace-pre-line text-sm opacity-85">{item.text}</blockquote>
                {item.title.trim() && <figcaption className="mt-3 text-sm font-medium">{item.title}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      );
    case "faq":
      if (!items.length) return builder ? <Placeholder icon={<CheckCircle2 className="h-5 w-5" />}>Add questions in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <div className="mt-4 text-left">
            {items.map((item) => (
              <details key={item.id} className="group border-t py-3 tint-border first:border-t-0">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.title}
                    <span className="text-lg opacity-60 transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm opacity-75">{item.text}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl md:text-3xl">{block.heading}</h2>}
          {block.text.trim() && <p className="mt-2 whitespace-pre-line text-base opacity-80">{block.text}</p>}
          <RegisterButton label={block.buttonLabel} theme={theme} />
        </div>
      );
    case "form":
      return (
        <div className="text-left">
          <h2 className={cn("text-2xl", centered && "text-center")}>{block.heading.trim() || "Reserve your seat"}</h2>
          <p className={cn("mb-5 mt-2 text-sm opacity-70", centered && "text-center")}>{block.text.trim() || view.title}</p>
          {/* The form keeps its own readable colours whatever the block's text colour is. */}
          <div className="text-primaryText">
            <RegistrationForm view={view} source={ctx.source} embedded={false} preview={ctx.preview || builder} />
          </div>
        </div>
      );
    case "heading":
      if (!block.heading.trim() && !block.text.trim()) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add a headline.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-3xl leading-tight md:text-4xl">{block.heading}</h2>}
          {block.text.trim() && <p className={cn("mt-3 whitespace-pre-line text-lg opacity-80", centered && "mx-auto max-w-2xl")}>{block.text}</p>}
        </div>
      );
    case "button":
      if (!block.buttonLabel.trim()) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add a button label.</Placeholder> : null;
      return <RegisterButton label={block.buttonLabel} theme={theme} link={block.link} flush />;
    case "iconbox":
      if (!items.length) return builder ? <Placeholder icon={<Star className="h-5 w-5" />}>Add boxes in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <ul className={cn("grid gap-4 text-left", block.heading.trim() && "mt-5", items.length > 1 && "sm:grid-cols-2", items.length > 2 && "lg:grid-cols-3")}>
            {items.map((item) => {
              const Icon = ICONS[item.icon ?? "check"] ?? Check;
              return (
                <li key={item.id} className="rounded-2xl border p-5 tint-border tint-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${theme.accent}33`, color: theme.accent }}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {item.title.trim() && <p className="mt-3 font-semibold">{item.title}</p>}
                  {item.text.trim() && <p className="mt-1 text-sm opacity-75">{item.text}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "pricing":
      if (!items.length) return builder ? <Placeholder icon={<Gift className="h-5 w-5" />}>Add ticket options in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <div className={cn("grid gap-4 text-left", block.heading.trim() && "mt-5", items.length > 1 && "md:grid-cols-2", items.length > 2 && "lg:grid-cols-3")}>
            {items.map((item) => (
              <div key={item.id} className="flex flex-col rounded-2xl border p-6 tint-border tint-soft">
                <p className="text-xl font-semibold">{item.title}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {item.text.split("\n").filter((l) => l.trim()).map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.accent }} aria-hidden />
                      <span className="opacity-85">{line}</span>
                    </li>
                  ))}
                </ul>
                <RegisterButton label={block.buttonLabel} theme={theme} link={item.link} />
              </div>
            ))}
          </div>
        </div>
      );
    case "stats":
      if (!items.length) return builder ? <Placeholder icon={<BarChart3 className="h-5 w-5" />}>Add figures in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-5 text-2xl">{block.heading}</h2>}
          <ul className={cn("grid gap-6 text-center", items.length > 1 && "grid-cols-2", items.length > 2 && "md:grid-cols-3", items.length > 3 && "lg:grid-cols-4")}>
            {items.map((item) => (
              <li key={item.id}>
                <p className="text-4xl font-bold leading-none" style={{ color: theme.accent }}>{item.title}</p>
                <p className="mt-2 text-sm opacity-75">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "timeline":
      if (!items.length) return builder ? <Placeholder icon={<Clock className="h-5 w-5" />}>Add steps in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="text-2xl">{block.heading}</h2>}
          <ol className={cn("space-y-5 border-l-2 pl-6 text-left", block.heading.trim() && "mt-5")} style={{ borderColor: `${theme.accent}66` }}>
            {items.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full" style={{ background: theme.accent }} aria-hidden />
                <p className="text-sm font-semibold uppercase tracking-wide opacity-70">{item.title}</p>
                {item.text.trim() && <p className="mt-0.5 text-base">{item.text}</p>}
              </li>
            ))}
          </ol>
        </div>
      );
    case "gallery": {
      const pics = block.items.filter((i) => isHttps(i.imageUrl));
      if (!pics.length) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add photos in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-5 text-2xl">{block.heading}</h2>}
          <ul className={cn("grid gap-3", pics.length > 1 && "grid-cols-2", pics.length > 2 && "md:grid-cols-3")}>
            {pics.map((pic) => (
              <li key={pic.id}>
                <img src={pic.imageUrl} alt={pic.text} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                {pic.title.trim() && <p className="mt-1 text-xs opacity-70">{pic.title}</p>}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "logos": {
      const logos = block.items.filter((i) => isHttps(i.imageUrl));
      if (!logos.length) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add logos in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <p className="mb-4 text-sm font-medium uppercase tracking-[0.15em] opacity-70">{block.heading}</p>}
          <ul className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", centered && "justify-center")}>
            {logos.map((logo) => {
              const img = <img src={logo.imageUrl} alt={logo.text || logo.title} loading="lazy" className="h-9 w-auto max-w-[8rem] object-contain opacity-80 md:h-10" />;
              return <li key={logo.id}>{isHttps(logo.link) ? <a href={logo.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[44px] items-center">{img}</a> : img}</li>;
            })}
          </ul>
        </div>
      );
    }
    case "tabs":
      if (!items.length) return builder ? <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Add tabs in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-3 text-2xl">{block.heading}</h2>}
          <TabsElement items={items} theme={theme} />
        </div>
      );
    case "social": {
      const links = block.items.filter((i) => isHttps(i.link));
      if (!links.length) return builder ? <Placeholder icon={<Globe className="h-5 w-5" />}>Add links in the block settings.</Placeholder> : null;
      return (
        <div>
          {block.heading.trim() && <h2 className="mb-4 text-xl">{block.heading}</h2>}
          <ul className={cn("flex flex-wrap gap-2", centered && "justify-center")}>
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium tint-border tint-soft">
                  <Globe className="h-4 w-4" style={{ color: theme.accent }} aria-hidden />
                  {l.title}{l.text.trim() ? ` · ${l.text}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "map":
      if (!block.text.trim() && !isHttps(block.link)) return builder ? <Placeholder icon={<MapPin className="h-5 w-5" />}>Add an address.</Placeholder> : null;
      {
        const address = block.text.trim().slice(0, 300);
        const mapsLink = isHttps(block.link) ? block.link : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
        return (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${theme.accent}33`, color: theme.accent }}>
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                {block.heading.trim() && <h2 className="text-xl">{block.heading}</h2>}
                {block.text.trim() && <p className="mt-1 whitespace-pre-line opacity-80">{block.text}</p>}
                {mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold underline">Open in maps</a>
                )}
              </div>
            </div>
            {block.embed && address && (
              <iframe
                title={`Map: ${address}`}
                data-map-embed
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-64 w-full rounded-2xl border-0"
                allowFullScreen
              />
            )}
          </div>
        );
      }
    case "columns": {
      const cols = block.columns ?? [];
      const n = cols.length;
      const stacked = ctx.device === "mobile";
      const grid = stacked ? "grid-cols-1" : ctx.device ? { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: ctx.device === "tablet" ? "grid-cols-2" : "grid-cols-4" }[n] : { 1: "grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[n];
      return (
        <div className={cn("grid items-start gap-5", grid)}>
          {cols.map((col) => (
            <div key={col.id} className="min-w-0 space-y-4">
              {col.blocks.length === 0 && builder && <Placeholder icon={<ImageIcon className="h-5 w-5" />}>Empty column</Placeholder>}
              {col.blocks.map((child) => <PageBlockView key={child.id} block={child} ctx={ctx} />)}
            </div>
          ))}
        </div>
      );
    }
    case "divider":
      return <div style={{ height: block.height }} aria-hidden />;
    default:
      return null;
  }
}

export function blockFrameStyle(block: PageBlock, theme: PageTheme): CSSProperties {
  return {
    background: block.style.background || undefined,
    color: block.style.textColor || theme.text,
    borderRadius: block.type === "image" ? undefined : block.style.radius,
    boxShadow: block.style.shadow && block.style.background ? "0 12px 30px rgba(16, 27, 53, 0.08)" : undefined,
  };
}

/** In the builder a block hidden on the previewed device is shown faded instead of disappearing, so it can still be edited. */
function builderHidden(block: PageBlock, ctx: BlockContext): boolean {
  return ctx.mode === "builder" && !!ctx.device && !!block.show && !block.show[ctx.device];
}

/** One block with its frame (background, padding, width, alignment). */
export function PageBlockView({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  if (ctx.mode === "public" && isBlockEmpty(block, ctx.view)) return null;
  const plain = block.type === "image" || block.type === "divider" || block.type === "columns";
  return (
    <section
      id={block.type === "form" ? "register" : undefined}
      data-block-type={block.type}
      className={cn("min-w-0 scroll-mt-6", ctx.mode === "public" && visibilityClasses(block.show), builderHidden(block, ctx) && "opacity-35", WIDTH[block.style.width], block.style.width === "narrow" && "mx-auto w-full", !plain && PADDING[block.style.padding], block.style.align === "center" && "text-center")}
      style={blockFrameStyle(block, ctx.theme)}
    >
      <BlockBody block={block} ctx={ctx} />
    </section>
  );
}

const MAX_WIDTH: Record<PageTheme["maxWidth"], string> = { md: "max-w-3xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-none" };

export function pageThemeStyle(theme: PageTheme): CSSProperties {
  const headingFont = theme.headingFont === "serif" ? 'Georgia, "Times New Roman", serif' : theme.headingFont === "sans" ? "var(--font-body)" : undefined;
  return { background: theme.background, color: theme.text, ...(headingFont ? ({ "--font-display": headingFont } as CSSProperties) : {}) };
}

/**
 * The arrangement of blocks for a design. `renderBlock` lets the builder wrap each block with its
 * editing chrome while the public page renders them plainly, so both always look the same.
 */
export function PageBlocksLayout({ design, renderBlock }: { design: PageDesign; renderBlock: (block: PageBlock) => ReactNode }) {
  const form = design.blocks.find((b) => b.type === "form");
  if (design.layout === "sidebar" && form) {
    return (
      <div className={cn("mx-auto grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]", MAX_WIDTH[design.theme.maxWidth === "md" ? "lg" : design.theme.maxWidth])}>
        <div className="min-w-0 space-y-5">{design.blocks.filter((b) => b.type !== "form").map(renderBlock)}</div>
        <aside className="h-fit min-w-0 lg:sticky lg:top-6">{renderBlock(form)}</aside>
      </div>
    );
  }
  return <div className={cn("mx-auto w-full space-y-5", MAX_WIDTH[design.theme.maxWidth])}>{design.blocks.map(renderBlock)}</div>;
}
