import type { PageIcon } from "@/types";

export const PAGE_ICONS = ["check", "star", "heart", "bolt", "shield", "clock", "users", "calendar", "gift", "globe", "mic", "book", "chart", "rocket", "mail", "phone"] as const satisfies readonly PageIcon[];

export const ICON_LABEL: Record<PageIcon, string> = {
  check: "Tick", star: "Star", heart: "Heart", bolt: "Lightning", shield: "Shield", clock: "Clock", users: "People", calendar: "Calendar",
  gift: "Gift", globe: "Globe", mic: "Microphone", book: "Book", chart: "Chart", rocket: "Rocket", mail: "Email", phone: "Phone",
};
