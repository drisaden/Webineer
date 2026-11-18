-- One short link per webinar. The code is public, the table is only ever read through the server.
CREATE TABLE "short_links" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "webinar_id" UUID NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "last_clicked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "short_links_code_key" ON "short_links"("code");
CREATE UNIQUE INDEX "short_links_webinar_id_key" ON "short_links"("webinar_id");
CREATE UNIQUE INDEX "short_links_webinar_id_organization_id_key" ON "short_links"("webinar_id", "organization_id");

ALTER TABLE "short_links" ADD CONSTRAINT "short_links_webinar_id_organization_id_fkey" FOREIGN KEY ("webinar_id", "organization_id") REFERENCES "webinars"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_code_format" CHECK ("code" ~ '^[a-z0-9]{4,16}$');
ALTER TABLE "short_links" ENABLE ROW LEVEL SECURITY;
