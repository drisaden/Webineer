import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RegistrationForm } from "@/components/registration/registration-form";
import { TrackingScripts } from "@/components/registration/tracking-scripts";
import { canManageWebinar, getCurrentUser } from "@/lib/auth/demo-session";
import { getStore } from "@/server/repositories";
import { hostAllowed, publicViewFor } from "@/services/registration-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register", robots: { index: false } };

/**
 * Embeddable registration form (inline iframe and popup). Exposes only the
 * public view model; submissions go to the shared registration endpoint.
 */
export default async function EmbedRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ source?: string; preview?: string }>;
}) {
  const { publicId } = await params;
  const query = await searchParams;
  if (!/^[A-Za-z0-9]{6,40}$/.test(publicId)) notFound();
  const webinar = await getStore().getWebinarByPublicId(publicId);
  if (!webinar?.workflow) notFound();

  const isDraft = webinar.status === "draft";
  if (isDraft) {
    const user = await getCurrentUser();
    if (!(query.preview === "1" && user && canManageWebinar(user, webinar))) notFound();
  }

  // Domain allowlist: compare the embedding page (Referer) with the configured domains.
  const h = await headers();
  const ownHost = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const allowed = webinar.workflow.registration.embed.allowedDomains;
  let blocked = false;
  if (allowed.length > 0) {
    const referer = h.get("referer");
    try {
      const refHost = referer ? new URL(referer).host : "";
      const refHostname = referer ? new URL(referer).hostname : "";
      blocked = !(refHost === ownHost || hostAllowed(refHostname, allowed));
    } catch {
      blocked = true;
    }
  }

  const source = query.source === "popup" ? "popup" : "inline";
  const view = await publicViewFor(webinar);

  return (
    <main className="relative z-10 min-h-screen bg-white p-5 text-primaryText sm:p-6">
      {!isDraft && !blocked && <TrackingScripts {...view.tracking} />}
      {blocked ? (
        <div className="rounded-xl border border-[#F5D7D7] bg-[#FFF6F6] p-4 text-sm text-[#B33A3A]">
          Registration for this webinar isn’t enabled on this website. Please register on the{" "}
          <a className="font-medium underline" href={`/w/${view.slug}`} target="_blank" rel="noopener">
            official registration page
          </a>
          .
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-primaryText">{view.headline}</h1>
            {view.showDateTime && <p className="mt-1 text-sm text-secondaryText">{view.dateLabel}</p>}
          </div>
          <RegistrationForm view={view} source={source} embedded preview={isDraft} />
          <p className="mt-4 text-center text-[11px] text-secondaryText">
            Powered by <span className="font-semibold">Webineer</span>
          </p>
        </div>
      )}
    </main>
  );
}
