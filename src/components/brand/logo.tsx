import { WORDMARK_ASCENT, WORDMARK_DOTS, WORDMARK_LETTERS, WORDMARK_WIDTH } from "./wordmark-paths";

/**
 * Webineer logo: a "W" mark on a rounded tile plus an outlined wordmark.
 *
 * tone="auto"  follows the app theme (navy tile in light mode, teal tile in dark mode) and is for pages that switch theme.
 * tone="onDark" / "onLight" are fixed, for surfaces whose background never changes (e.g. the navy sidebar).
 */
export type LogoTone = "auto" | "onDark" | "onLight";

const TILE = 56;
const FONT = 42;
const SCALE = FONT / 100;
const BASE = TILE / 2 + (WORDMARK_ASCENT * SCALE) / 2;
const TEXT_X = TILE + 16;
const FULL_WIDTH = TEXT_X + WORDMARK_WIDTH * SCALE;

export function LogoMark({ tone = "auto", className, title }: { tone?: LogoTone; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 160 160" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={className} data-logo-tone={tone}>
      <rect className="logo-tile" width="160" height="160" rx="42" />
      <path className="logo-glyph" d="M32 52L60 114L80 72L100 114L128 52" fill="none" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ tone = "auto", className, title }: { tone?: LogoTone; className?: string; title?: string }) {
  const h = WORDMARK_ASCENT * 0.6 + 4;
  return (
    <svg
      viewBox={`0 0 ${WORDMARK_WIDTH * 0.6} ${h}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      data-logo-tone={tone}
    >
      <g transform={`translate(0 ${WORDMARK_ASCENT * 0.6 + 1}) scale(0.6)`}>
        <path className="logo-letters" d={WORDMARK_LETTERS} />
        <path className="logo-dot" d={WORDMARK_DOTS} />
      </g>
    </svg>
  );
}

export function Logo({ tone = "auto", className = "h-9 w-auto", title = "Webineer" }: { tone?: LogoTone; className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${FULL_WIDTH.toFixed(1)} ${TILE}`}
      role="img"
      aria-label={title}
      className={className}
      data-logo-tone={tone}
    >
      <g transform={`scale(${TILE / 160})`}>
        <rect className="logo-tile" width="160" height="160" rx="42" />
        <path className="logo-glyph" d="M32 52L60 114L80 72L100 114L128 52" fill="none" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform={`translate(${TEXT_X} ${BASE.toFixed(2)}) scale(${SCALE})`}>
        <path className="logo-letters" d={WORDMARK_LETTERS} />
        <path className="logo-dot" d={WORDMARK_DOTS} />
      </g>
    </svg>
  );
}
