import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { APP_NAME } from "@/lib/constants/site";
import { unsubscribeTokenMatches } from "@/lib/compliance";

export const metadata: Metadata = { title: `Unsubscribe · ${APP_NAME}`, robots: { index: false } };

type Params = Promise<{ r?: string; t?: string; state?: string }>;

export default async function UnsubscribePage({ searchParams }: { searchParams: Params }) {
  const { r = "", t = "", state } = await searchParams;
  const valid = Boolean(r) && unsubscribeTokenMatches(r, t);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Logo tone="auto" className="mb-8 h-9 w-auto self-start" title={APP_NAME} />
      {state === "done" ? (
        <>
          <h1 className="text-2xl font-semibold text-primaryText">You&apos;re unsubscribed</h1>
          <p className="mt-3 text-secondaryText">You won&apos;t get any more reminders or follow-up emails from this host through {APP_NAME}. You&apos;ll still get receipts and confirmations for things you do.</p>
        </>
      ) : !valid || state === "invalid" ? (
        <>
          <h1 className="text-2xl font-semibold text-primaryText">This link isn&apos;t valid</h1>
          <p className="mt-3 text-secondaryText">The unsubscribe link may be incomplete or out of date. Use the link in the most recent email you received, or contact us from the <Link href="/help" className="font-medium text-[#17294B] underline">help centre</Link>.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-primaryText">Unsubscribe from these emails?</h1>
          <p className="mt-3 text-secondaryText">You&apos;ll stop receiving reminders and follow-up emails from this host. Receipts and confirmations for things you do will still be sent.</p>
          {state === "busy" && <p role="alert" className="mt-3 text-sm text-[#B33A3A]">Too many attempts. Please try again in a little while.</p>}
          <form method="post" action="/api/public/unsubscribe" className="mt-6">
            <input type="hidden" name="r" value={r} />
            <input type="hidden" name="t" value={t} />
            <Button type="submit" className="w-full">Yes, unsubscribe me</Button>
          </form>
        </>
      )}
    </main>
  );
}
