import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThankYouPanel } from "@/components/registration/thank-you-panel";
import { TrackingScripts } from "@/components/registration/tracking-scripts";
import { getStore } from "@/server/repositories";
import { publicViewFor, verifyAccess } from "@/services/registration-service";
import { registrationAccessKey } from "@/services/workflow-notifications";

export const dynamic = "force-dynamic";

export default async function WebinarConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; k?: string; payment?: string; tx_ref?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const webinar = await getStore().getWebinarBySlug(slug);

  // Webinars configured with the setup workflow get the configured thank-you page.
  if (webinar?.workflow) {
    if (webinar.status === "draft") notFound();
    const view = await publicViewFor(webinar);
    const registration = await verifyAccess(webinar, query.r, query.k);
    const paymentPending = registration?.paymentStatus === "pending";
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
        <TrackingScripts {...view.tracking} />
        <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
          {query.payment === "pending" ? (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-semibold text-primaryText">Confirming your payment…</h1>
              <p className="text-secondaryText">Your payment is still being processed. This usually takes a few seconds. We’ll email your confirmation as soon as it clears.</p>
              {query.r && query.tx_ref && (
                <Button asChild>
                  <Link href={`/api/public/payments/verify/${encodeURIComponent(query.r)}?tx_ref=${encodeURIComponent(query.tx_ref)}`}>Check again</Link>
                </Button>
              )}
            </div>
          ) : query.payment === "failed" || paymentPending ? (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-semibold text-primaryText">Payment not confirmed</h1>
              <p className="text-secondaryText">We couldn’t verify your payment, so your seat isn’t confirmed yet. No access has been granted.</p>
              <Button asChild>
                <Link href={`/w/${view.slug}`}>Try again</Link>
              </Button>
            </div>
          ) : (
            <ThankYouPanel
              view={view}
              access={registration ? { registrationId: registration.id, accessKey: registrationAccessKey(registration) } : null}
              embedded={false}
              notice={registration ? undefined : "Use the personal join link in your confirmation email to enter the webinar."}
            />
          )}
        </div>
      </main>
    );
  }

  // Unknown webinar: never claim a seat was reserved.
  if (!webinar) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="max-w-xl rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAFBF5] text-[#0F7B52]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-primaryText">You’re on the list.</h1>
        <p className="mt-3 text-secondaryText">
          Your seat for the webinar has been reserved. A confirmation email is on the way with reminders and event access details.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Back to homepage</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
