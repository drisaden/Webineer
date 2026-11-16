/** Shapes shared by the live room API and the room UI. */

export const REACTION_EMOJI = ["👏", "❤️", "🔥", "😂", "😮", "🎉"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export const SLOW_MODE_CHOICES = [0, 5, 10, 30, 60] as const;

export const LIMITS = {
  chat: 300,
  question: 500,
  answer: 800,
  announcement: 200,
  pollQuestion: 140,
  pollOption: 60,
  pollOptionsMin: 2,
  pollOptionsMax: 5,
  name: 30,
} as const;

export interface LiveChatMessage {
  id: string;
  seq: number;
  name: string;
  isHost: boolean;
  body: string;
  at: string;
  pinned: boolean;
  /** True for messages sent by this viewer. */
  mine: boolean;
}

export interface LiveQuestion {
  id: string;
  seq: number;
  name: string;
  body: string;
  at: string;
  status: "VISIBLE" | "ANSWERED" | "HIDDEN";
  answer: string | null;
  mine: boolean;
}

export interface LivePollView {
  id: string;
  question: string;
  status: "OPEN" | "CLOSED";
  options: { id: string; label: string; votes: number }[];
  total: number;
  myVote: string | null;
}

export interface LiveFeatureFlags {
  chat: boolean;
  viewerCount: boolean;
  reactions: boolean;
  qa: boolean;
  polls: boolean;
  announcements: boolean;
  moderationTools: boolean;
  transcriptExport: boolean;
}

export interface LiveSyncResponse {
  now: string;
  features: LiveFeatureFlags;
  /** Features the host switched on that the current plan doesn't include (host only). */
  lockedByPlan: string[];
  role: "host" | "attendee";
  viewers: number | null;
  room: { chatLocked: boolean; slowModeSeconds: number; announcement: string | null; announcementAt: string | null };
  messages: LiveChatMessage[];
  /** Messages removed since the last sync. */
  removedIds: string[];
  pinned: LiveChatMessage | null;
  questions: LiveQuestion[];
  poll: LivePollView | null;
  reactions: { seq: number; emoji: string }[];
  cursor: { messages: number; reactions: number };
  /** Next poll interval suggested by the server, in milliseconds. */
  pollEveryMs: number;
}

export type LiveAction =
  | { type: "chat"; text: string }
  | { type: "question"; text: string }
  | { type: "reaction"; emoji: string }
  | { type: "vote"; pollId: string; optionId: string };

export type HostAction =
  | { type: "announce"; text: string | null }
  | { type: "pin"; messageId: string; pinned: boolean }
  | { type: "hide"; messageId: string }
  | { type: "answer"; messageId: string; answer?: string }
  | { type: "mute"; messageId: string }
  | { type: "lock"; locked: boolean }
  | { type: "slow"; seconds: number }
  | { type: "poll_create"; question: string; options: string[] }
  | { type: "poll_close"; pollId: string };
