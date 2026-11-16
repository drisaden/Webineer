import { livePlanHighlights } from "@/lib/live/features";
import { SAAS_PLANS } from "@/services/billing-entitlements";

/** One block of article content. Plain data so articles render the same on the server and are easy to test. */
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "plans"; kind: "limits" | "live" };

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategoryId;
  /** Extra words people might search for. */
  keywords: string[];
  updated: string;
  related: string[];
  body: ArticleBlock[];
}

export const HELP_CATEGORIES = [
  { id: "start", title: "Getting started", blurb: "Set up your workspace and run your first webinar." },
  { id: "webinars", title: "Webinars and pages", blurb: "Modes, registration pages, the live room and replays." },
  { id: "email", title: "Emails and reminders", blurb: "What gets sent, when, and what to check if it doesn't arrive." },
  { id: "billing", title: "Plans and billing", blurb: "What each plan includes and how payment works." },
  { id: "account", title: "Account and troubleshooting", blurb: "Sign-in, passwords and common fixes." },
] as const;
export type HelpCategoryId = (typeof HELP_CATEGORIES)[number]["id"];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "create-your-first-webinar",
    title: "Create and publish your first webinar",
    summary: "From a blank workspace to a live registration link in a few minutes.",
    category: "start",
    keywords: ["new", "publish", "schedule", "setup", "start"],
    updated: "2026-11-16",
    related: ["choose-a-webinar-mode", "design-your-registration-page", "share-your-registration-link"],
    body: [
      { type: "p", text: "A webinar in Webineer is a registration page, a live room and the emails that connect them. You set all of it up in one place and publish when you're ready." },
      { type: "steps", items: ["Open All Webinars from the sidebar and choose to start a new webinar.", "Pick how it runs: right now, scheduled for later, or always on. See “Choose a webinar mode” if you're unsure.", "Add your video link and, for scheduled webinars, the date, time and time zone.", "Fill in the basic information and host details, then check the registration form and the confirmation email.", "Choose Publish. Webineer checks the setup and tells you exactly what's missing if something isn't ready."] },
      { type: "tip", text: "You can save as you go. A webinar stays a draft, and nobody can register, until you publish it." },
      { type: "h", text: "After you publish" },
      { type: "p", text: "Your webinar gets a registration link. Share it anywhere, or embed the form on your own website. Registrants receive a confirmation email with their personal join link, and reminder emails go out automatically before the session." },
    ],
  },
  {
    slug: "choose-a-webinar-mode",
    title: "Choose a webinar mode",
    summary: "Right now, scheduled for later, or always on: which one fits?",
    category: "webinars",
    keywords: ["automated", "evergreen", "live", "on demand", "right now"],
    updated: "2026-11-16",
    related: ["create-your-first-webinar", "plans-and-limits"],
    body: [
      { type: "list", items: ["Right now: starts straight away. Good for an impromptu session or when you're testing.", "Schedule for later: you pick a date, time and time zone. Registrants get reminders before it starts.", "Always on (automated): an evergreen webinar that runs on a rhythm you set, so people can register any time and join the next session."] },
      { type: "p", text: "Always-on webinars are available on paid plans. Your plan's limits are listed in “Plans, limits and what each one includes”." },
      { type: "tip", text: "Not sure? Start with a scheduled webinar. You can duplicate its setup into an always-on webinar later." },
    ],
  },
  {
    slug: "design-your-registration-page",
    title: "Design your registration page",
    summary: "Arrange blocks, upload images and match your brand.",
    category: "webinars",
    keywords: ["landing page", "designer", "blocks", "images", "branding", "logo"],
    updated: "2026-11-16",
    related: ["share-your-registration-link", "create-your-first-webinar"],
    body: [
      { type: "p", text: "Each webinar has a hosted registration page. You can use the standard layout or design your own." },
      { type: "steps", items: ["Open Landing Pages from the sidebar.", "Choose Design page on the webinar you want to change.", "Add, reorder and edit blocks. Upload your own images from your computer.", "Use the preview to check how the page looks, then save."] },
      { type: "p", text: "Your workspace branding lives in Settings, in the Branding tab." },
    ],
  },
  {
    slug: "share-your-registration-link",
    title: "Share your registration link or embed the form",
    summary: "Hosted page, inline embed, popup or a simple button.",
    category: "webinars",
    keywords: ["embed", "iframe", "popup", "website", "link", "share"],
    updated: "2026-11-16",
    related: ["design-your-registration-page", "attendee-join-problems"],
    body: [
      { type: "p", text: "In the webinar's Embed & Share section you can use any of four options:" },
      { type: "list", items: ["Hosted registration page: share the link in emails, social posts or messages.", "Inline embed: place the form inside a page on your own website.", "Popup: open the form in a modal from a button on your site.", "Registration button: a button that sends people to the hosted page."] },
      { type: "tip", text: "If you use an embed, add your website to the allowed websites list so the form is permitted to load there." },
    ],
  },
  {
    slug: "live-room-chat-polls-and-reactions",
    title: "Chat, Q&A, polls and reactions in the live room",
    summary: "What attendees can do during a session and how to moderate it.",
    category: "webinars",
    keywords: ["chat", "poll", "reactions", "questions", "moderation", "announcement", "mute", "slow mode", "viewers"],
    updated: "2026-11-16",
    related: ["plans-and-limits", "attendee-join-problems"],
    body: [
      { type: "p", text: "The live room lets attendees chat, send reactions, ask questions and vote in polls while they watch. Switch each feature on or off in the webinar's Attendee interaction section." },
      { type: "h", text: "Hosting a session" },
      { type: "list", items: ["Open the room as host from the webinar. The Host tab holds your controls.", "Answer a question by typing a reply and marking it answered. Everyone sees the answer.", "Start a poll with two to five options. Starting a new poll closes the previous one.", "Pin an important message or post an announcement above the video.", "Pause chat, turn on slow mode, remove a message or mute someone who is disrupting the session."] },
      { type: "h", text: "What each plan includes" },
      { type: "plans", kind: "live" },
      { type: "p", text: "Chat updates every few seconds rather than instantly, which keeps the room reliable for large audiences." },
    ],
  },
  {
    slug: "replays-and-recordings",
    title: "Offer a replay",
    summary: "Let registrants watch again after the session.",
    category: "webinars",
    keywords: ["recording", "replay", "on demand", "after"],
    updated: "2026-11-16",
    related: ["create-your-first-webinar"],
    body: [
      { type: "p", text: "In the webinar's Recording section, add the link to your recording and choose who can watch, when it becomes available and when it expires. Webineer shows the replay page to the people you allow." },
      { type: "tip", text: "Webineer doesn't record your video for you. Record in the tool you stream from and add the link afterwards." },
    ],
  },
  {
    slug: "reminders-and-follow-up-emails",
    title: "Confirmation, reminder and follow-up emails",
    summary: "What your registrants receive, and when.",
    category: "email",
    keywords: ["reminder", "confirmation", "follow-up", "thank you", "schedule", "email"],
    updated: "2026-11-16",
    related: ["emails-not-arriving", "attendee-join-problems"],
    body: [
      { type: "p", text: "Every registrant receives a confirmation email straight away with their personal join link. Reminders are sent automatically before the session, by default one day before, one hour before and 15 minutes before." },
      { type: "list", items: ["Someone who registers after a reminder was due doesn't receive that reminder.", "You can edit the confirmation, reminder, follow-up and thank-you emails in the webinar setup.", "Open Emails in the sidebar to see what was sent, what is waiting, and anything that failed."] },
    ],
  },
  {
    slug: "emails-not-arriving",
    title: "Emails aren't arriving",
    summary: "Checks to make when you or your registrants can't find an email.",
    category: "email",
    keywords: ["spam", "junk", "not received", "missing", "confirmation", "delivery", "failed"],
    updated: "2026-11-16",
    related: ["reminders-and-follow-up-emails", "sign-in-and-confirmation"],
    body: [
      { type: "steps", items: ["Check the spam or junk folder, and any promotions tab. Mark the email as not spam so future ones arrive normally.", "Check the address for typos. Open Emails in the sidebar and look at the status next to the message.", "A status of failed shows the reason. If the address was mistyped, ask the person to register again with the correct one.", "If a message to your own address never arrives, try a different address. Some mailboxes quietly drop mail that appears to come from themselves."] },
      { type: "tip", text: "Still stuck? Contact support with the webinar name and the email address that's missing the message." },
    ],
  },
  {
    slug: "attendee-join-problems",
    title: "An attendee can't join the room",
    summary: "The usual reasons and how to fix them.",
    category: "email",
    keywords: ["join", "link", "room", "too early", "closed", "can't enter", "access"],
    updated: "2026-11-16",
    related: ["reminders-and-follow-up-emails", "live-room-chat-polls-and-reactions"],
    body: [
      { type: "list", items: ["Too early: the room opens a set number of minutes before the start. Attendees who arrive sooner see a countdown.", "Too late: late joining can be switched off or limited in Access & availability.", "Wrong link: each registrant has a personal join link in their confirmation email. Links that have been cut short or edited won't work.", "Not registered: rooms set to registered-only need the personal link. Rooms set to anyone-with-the-link accept visitors who open the room address."] },
      { type: "p", text: "You can open the room yourself as host at any time to check how it looks to attendees." },
    ],
  },
  {
    slug: "plans-and-limits",
    title: "Plans, limits and what each one includes",
    summary: "Webinars, registrants, team members and live room features by plan.",
    category: "billing",
    keywords: ["pricing", "upgrade", "limits", "free", "starter", "professional", "business", "plan"],
    updated: "2026-11-16",
    related: ["pay-for-a-plan", "live-room-chat-polls-and-reactions"],
    body: [
      { type: "plans", kind: "limits" },
      { type: "p", text: "Upgrade or change plans any time from Billing in the sidebar. Features outside your plan are labelled in the webinar setup so you can see what an upgrade would unlock." },
    ],
  },
  {
    slug: "pay-for-a-plan",
    title: "Pay for a plan",
    summary: "How subscription payments work.",
    category: "billing",
    keywords: ["payment", "flutterwave", "card", "invoice", "subscription", "renew", "billing"],
    updated: "2026-11-16",
    related: ["plans-and-limits"],
    body: [
      { type: "p", text: "Plans are prepaid in 30-day periods and paid securely through Flutterwave. Open Billing, choose a plan and complete the payment. Your plan activates once the payment is confirmed." },
      { type: "list", items: ["Buying the same plan again extends it by another 30 days.", "When a paid period ends, the workspace returns to the free plan and features outside it stop being available.", "Only people who have billing permission in the workspace can change the plan."] },
      { type: "tip", text: "If you paid and your plan hasn't changed after a few minutes, contact support with the payment reference from your receipt." },
    ],
  },
  {
    slug: "sign-in-and-confirmation",
    title: "Sign-in and email confirmation",
    summary: "Confirm your address, reset a password and fix sign-in trouble.",
    category: "account",
    keywords: ["login", "password", "reset", "forgot", "confirm", "verify", "locked"],
    updated: "2026-11-16",
    related: ["emails-not-arriving"],
    body: [
      { type: "steps", items: ["After you register, open the confirmation email and select the link to activate your account.", "If it doesn't arrive, check spam, then register again or contact support.", "To reset a password, choose Forgot password on the sign-in page and follow the link in the email.", "Confirmation and reset links expire after a short time. Request a new one if yours has."] },
      { type: "p", text: "You can change your password and review your security settings under Settings, in the Security tab." },
    ],
  },
  {
    slug: "workspace-and-team",
    title: "Workspace, branding and team",
    summary: "Where to change your workspace name, branding and notifications.",
    category: "account",
    keywords: ["team", "members", "invite", "roles", "branding", "workspace", "notifications"],
    updated: "2026-11-16",
    related: ["plans-and-limits"],
    body: [
      { type: "p", text: "Open Settings from the sidebar. The Profile tab is about you. The Workspace tab covers your workspace details, Branding holds your workspace branding, Notifications controls what Webineer tells you about, and Security holds your password." },
      { type: "p", text: "The number of team members depends on your plan. See “Plans, limits and what each one includes”." },
    ],
  },
  {
    slug: "contact-support",
    title: "How to contact support",
    summary: "Chat with an agent, request a call, or send an email.",
    category: "account",
    keywords: ["help", "support", "agent", "call", "phone", "chat", "email", "ticket"],
    updated: "2026-11-16",
    related: ["emails-not-arriving", "attendee-join-problems"],
    body: [
      { type: "p", text: "Open Help & Support in your dashboard to reach us three ways:" },
      { type: "list", items: ["Live chat: start a conversation with an agent. When nobody is online, your message is saved and we reply by email.", "Call: tap the support number during opening hours, or request a callback and tell us when suits you.", "Email: send us the details and we reply to the address on your account. Every request gets a reference such as SUP-1042."] },
      { type: "p", text: "Your open conversations, and any replies you haven't read yet, are listed on the same page." },
      { type: "tip", text: "Tell us the webinar name, what you expected and what happened instead. It gets you an answer faster." },
    ],
  },
];

export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function articlesIn(category: HelpCategoryId): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}

/** Plan table rows, generated from the real plan definitions so the docs can't drift from the product. */
export function planLimitRows(): { plan: string; price: string; webinars: string; registrants: string; team: string; extras: string }[] {
  return (Object.keys(SAAS_PLANS) as (keyof typeof SAAS_PLANS)[]).map((key) => {
    const p = SAAS_PLANS[key];
    const e = p.entitlements;
    const extras = [e.allowEvergreenAutomated && "Always-on webinars", e.allowPaidWebinars && "Paid webinars", e.allowCustomDomains && "Custom domains", e.allowAdvancedAutomations && "Advanced automations"].filter(Boolean).join(", ");
    return {
      plan: p.name,
      price: p.priceMonthly === 0 ? "Free" : `$${p.priceMonthly}/month`,
      webinars: e.maxWebinars >= 9999 ? "Unlimited" : String(e.maxWebinars),
      registrants: e.maxRegistrantsPerWebinar.toLocaleString("en-US"),
      team: String(e.maxTeamMembers),
      extras: extras || "None",
    };
  });
}

export function liveFeatureRows(): { plan: string; features: string[] }[] {
  return (Object.keys(SAAS_PLANS) as (keyof typeof SAAS_PLANS)[]).map((key) => ({ plan: SAAS_PLANS[key].name, features: livePlanHighlights(key) }));
}

/** Plain-text search over titles, summaries, keywords and body text. Every word must match somewhere. */
export function searchArticles(query: string, articles: HelpArticle[] = HELP_ARTICLES): HelpArticle[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return articles;
  const scored = articles.flatMap((a) => {
    const title = a.title.toLowerCase();
    const summary = a.summary.toLowerCase();
    const keywords = a.keywords.join(" ").toLowerCase();
    const body = a.body.map((b) => ("text" in b ? b.text : "items" in b ? b.items.join(" ") : "")).join(" ").toLowerCase();
    let score = 0;
    for (const w of words) {
      const s = (title.includes(w) ? 8 : 0) + (keywords.includes(w) ? 5 : 0) + (summary.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0);
      if (!s) return [];
      score += s;
    }
    return [{ a, score }];
  });
  return scored.sort((x, y) => y.score - x.score).map((x) => x.a);
}
