/**
 * A custom registration ("landing") page design: an ordered list of blocks plus a page theme.
 * Stored inside the webinar's registration settings. Content is plain text only (no HTML),
 * images are https links, colours are #rrggbb, so a design can't inject markup or scripts.
 */
export type PageBlockType =
  | "hero"
  | "text"
  | "image"
  | "media"
  | "video"
  | "countdown"
  | "presenters"
  | "benefits"
  | "faq"
  | "testimonials"
  | "cta"
  | "form"
  | "divider"
  | "heading"
  | "button"
  | "iconbox"
  | "pricing"
  | "stats"
  | "timeline"
  | "gallery"
  | "logos"
  | "tabs"
  | "social"
  | "map"
  | "columns";

/** Icons a block item can show. A fixed list, so a design can never reference anything else. */
export type PageIcon = "check" | "star" | "heart" | "bolt" | "shield" | "clock" | "users" | "calendar" | "gift" | "globe" | "mic" | "book" | "chart" | "rocket" | "mail" | "phone";

export interface PageBlockVisibility {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
}

export interface PageColumn {
  id: string;
  blocks: PageBlock[];
}

export interface PageBlockStyle {
  /** "" = no background (page shows through), otherwise #rrggbb */
  background: string;
  /** "" = theme text colour, otherwise #rrggbb */
  textColor: string;
  align: "left" | "center";
  padding: "none" | "sm" | "md" | "lg";
  width: "narrow" | "normal" | "wide";
  /** Corner radius in px (0–40) */
  radius: number;
  shadow: boolean;
}

export interface PageBlockItem {
  id: string;
  title: string;
  text: string;
  /** Gallery, logos and speaker pictures (https). */
  imageUrl?: string;
  /** Optional https link for the item (logos, social links, pricing buttons). */
  link?: string;
  icon?: PageIcon;
}

export interface PageBlock {
  id: string;
  type: PageBlockType;
  style: PageBlockStyle;
  /** Main heading. Hero: empty = the registration headline. */
  heading: string;
  /** Body text / subheading / quote. Hero: empty = the registration description. */
  text: string;
  /** Image for hero, image and media blocks (https). Hero: empty = the webinar cover image. */
  imageUrl: string;
  imageAlt: string;
  /** Media block: which side the image sits on. */
  imageSide: "left" | "right";
  /** Button label for hero and call-to-action blocks ("" = no button). */
  buttonLabel: string;
  /** Benefits (title/text), FAQ (question/answer), testimonials (name/quote). */
  items: PageBlockItem[];
  /** Hero: show the session date. */
  showDate: boolean;
  /** Divider: height in px (8–160). */
  height: number;
  /** Button and pricing buttons: https link. Empty = the registration form. */
  link?: string;
  /** Devices the block is shown on. Missing = every device. */
  show?: PageBlockVisibility;
  /** Columns block: 1–4 columns, each holding its own elements. */
  columns?: PageColumn[];
}

export interface PageTheme {
  /** Page background */
  background: string;
  /** Default text colour */
  text: string;
  /** Buttons and highlights */
  accent: string;
  /** Text colour on accent-coloured buttons */
  accentText: string;
  headingFont: "brand" | "sans" | "serif";
  /** Content width */
  maxWidth: "md" | "lg" | "xl" | "full";
}

export interface PageDesign {
  /** false = keep the standard registration layout; the design stays saved for later. */
  enabled: boolean;
  /** "sidebar": form in a sticky column beside the content. "stacked": everything in one column. */
  layout: "sidebar" | "stacked";
  theme: PageTheme;
  blocks: PageBlock[];
}
