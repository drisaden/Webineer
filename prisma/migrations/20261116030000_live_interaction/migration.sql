-- Live room interaction: chat, Q&A, polls, reactions, presence and host-controlled room state.

CREATE TYPE "LiveMessageKind" AS ENUM ('CHAT', 'QUESTION');
CREATE TYPE "LiveMessageStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'ANSWERED');
CREATE TYPE "LivePollStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "live_messages" (
    "id" UUID NOT NULL,
    "seq" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "kind" "LiveMessageKind" NOT NULL DEFAULT 'CHAT',
    "body" TEXT NOT NULL,
    "status" "LiveMessageStatus" NOT NULL DEFAULT 'VISIBLE',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "answer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "live_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_polls" (
    "id" UUID NOT NULL,
    "seq" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "status" "LivePollStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    CONSTRAINT "live_polls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_poll_votes" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_poll_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_reactions" (
    "seq" SERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_reactions_pkey" PRIMARY KEY ("seq")
);

CREATE TABLE "live_presence" (
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_presence_pkey" PRIMARY KEY ("webinar_id", "viewer_key")
);

CREATE TABLE "live_room_state" (
    "webinar_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "chat_locked" BOOLEAN NOT NULL DEFAULT false,
    "slow_mode_seconds" INTEGER NOT NULL DEFAULT 0,
    "announcement" TEXT,
    "announcement_at" TIMESTAMPTZ(6),
    "muted_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "live_room_state_pkey" PRIMARY KEY ("webinar_id")
);

CREATE UNIQUE INDEX "live_messages_seq_key" ON "live_messages"("seq");
CREATE INDEX "live_messages_webinar_id_seq_idx" ON "live_messages"("webinar_id", "seq");
CREATE INDEX "live_messages_webinar_id_kind_status_idx" ON "live_messages"("webinar_id", "kind", "status");
CREATE UNIQUE INDEX "live_polls_seq_key" ON "live_polls"("seq");
CREATE INDEX "live_polls_webinar_id_seq_idx" ON "live_polls"("webinar_id", "seq");
CREATE UNIQUE INDEX "live_poll_votes_poll_id_viewer_key_key" ON "live_poll_votes"("poll_id", "viewer_key");
CREATE INDEX "live_reactions_webinar_id_seq_idx" ON "live_reactions"("webinar_id", "seq");
CREATE INDEX "live_reactions_created_at_idx" ON "live_reactions"("created_at");
CREATE INDEX "live_presence_webinar_id_last_seen_at_idx" ON "live_presence"("webinar_id", "last_seen_at");

ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_polls" ADD CONSTRAINT "live_polls_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_poll_votes" ADD CONSTRAINT "live_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "live_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_reactions" ADD CONSTRAINT "live_reactions_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_presence" ADD CONSTRAINT "live_presence_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_room_state" ADD CONSTRAINT "live_room_state_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The database is reached only through the server, so keep these tables closed to the public API.
ALTER TABLE "live_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "live_polls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "live_poll_votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "live_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "live_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "live_room_state" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_body_length" CHECK (char_length("body") BETWEEN 1 AND 1000);
CREATE UNIQUE INDEX "live_room_state_webinar_id_organization_id_key" ON "live_room_state"("webinar_id", "organization_id");
