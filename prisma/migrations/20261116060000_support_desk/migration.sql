-- Support desk: tickets for chat, email and callback requests, their messages, and agent availability.

CREATE TYPE "SupportChannel" AS ENUM ('CHAT', 'EMAIL', 'CALLBACK');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'PENDING', 'SOLVED');
CREATE TYPE "SupportAuthorType" AS ENUM ('CUSTOMER', 'AGENT', 'SYSTEM');

CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "organization_id" UUID,
    "requester_id" UUID,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "channel" "SupportChannel" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignee_id" UUID,
    "phone" TEXT,
    "callback_window" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_seen_at" TIMESTAMPTZ(6),
    "solved_at" TIMESTAMPTZ(6),
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "seq" SERIAL NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_type" "SupportAuthorType" NOT NULL,
    "author_user_id" UUID,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_agents" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "support_agents_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "support_tickets_number_key" ON "support_tickets"("number");
CREATE INDEX "support_tickets_status_last_message_at_idx" ON "support_tickets"("status", "last_message_at");
CREATE INDEX "support_tickets_requester_id_last_message_at_idx" ON "support_tickets"("requester_id", "last_message_at");
CREATE INDEX "support_tickets_assignee_id_status_idx" ON "support_tickets"("assignee_id", "status");
CREATE UNIQUE INDEX "support_messages_seq_key" ON "support_messages"("seq");
CREATE INDEX "support_messages_ticket_id_seq_idx" ON "support_messages"("ticket_id", "seq");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_agents" ADD CONSTRAINT "support_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_body_length" CHECK (char_length("body") BETWEEN 1 AND 4000);

-- The database is reached only through the server, so keep these tables closed to the public API.
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_agents" ENABLE ROW LEVEL SECURITY;
