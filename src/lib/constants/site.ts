export const APP_NAME = "Webineer";
export const APP_TAGLINE = "Your webinars. Your stage. Your rules.";
export const APP_SUPPORTING_MESSAGE =
  "Everything you need to create, automate and grow your webinar experience.";

export const BRAND_COLORS = {
  midnight: "#041B5E",
  deep: "#0A1E6A",
  teal: "#0AEBCB",
  brightTeal: "#64F5DE",
  background: "#F7F9FC",
  surface: "#FFFFFF",
  mutedSurface: "#EEF5FF",
  border: "#D8E5FF",
  primaryText: "#041B5E",
  secondaryText: "#4D5C8A",
  success: "#16A36A",
  warning: "#E7A23B",
  error: "#DC5353",
  info: "#3985DB",
};

export const dashboardNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: "layout" },
  { label: "All Webinars", href: "/dashboard/webinars", icon: "video" },
  { label: "Upcoming", href: "/dashboard/webinars/upcoming", icon: "calendar" },
  { label: "Past Webinars", href: "/dashboard/webinars/past", icon: "archive" },
  { label: "Automated Webinars", href: "/dashboard/webinars/automated", icon: "sparkles" },
  { label: "Automations", href: "/dashboard/automations", icon: "workflow" },
  { label: "Registrants", href: "/dashboard/registrants", icon: "users" },
  { label: "Contacts", href: "/dashboard/contacts", icon: "contacts" },
  { label: "Landing Pages", href: "/dashboard/landing-pages", icon: "page" },
  { label: "Emails", href: "/dashboard/emails", icon: "mail" },
  { label: "Email Campaigns", href: "/dashboard/email-campaigns", icon: "mail" },
  { label: "Integrations", href: "/dashboard/integrations", icon: "plug" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
  { label: "Billing", href: "/dashboard/billing", icon: "credit" },
  { label: "Help & Support", href: "/dashboard/help", icon: "help" },
];

export const providerCatalog = [
  { id: "youtube", label: "YouTube", supportsEmbed: true, canExtractId: true },
  { id: "vimeo", label: "Vimeo", supportsEmbed: true, canExtractId: true },
  { id: "wistia", label: "Wistia", supportsEmbed: true, canExtractId: true },
  { id: "custom_iframe", label: "Custom iframe", supportsEmbed: true, canExtractId: false },
  { id: "custom_url", label: "Custom URL", supportsEmbed: false, canExtractId: false },
  { id: "uploaded_video", label: "Uploaded video", supportsEmbed: true, canExtractId: false },
  { id: "external_live_stream", label: "External live stream", supportsEmbed: true, canExtractId: false },
];
