import Link from "next/link";
import { Clock, Lock } from "lucide-react";
import { formatInZone } from "@/lib/webinar-workflow/time";

export function AccessGate({ title, reason, at, timezone, registerHref, replayHref }: { title: string; reason: string; at?: Date; timezone: string; registerHref?: string; replayHref?: string }) {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-[#17294B]">
          {at ? <Clock className="h-6 w-6" aria-hidden /> : <Lock className="h-6 w-6" aria-hidden />}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-secondaryText">{title}</p>
        <h1 className="mt-2 text-xl text-primaryText">{reason}</h1>
        {at && <p className="mt-2 text-sm text-secondaryText">Opens {formatInZone(at, timezone)}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {registerHref && (
            <Link href={registerHref} className="rounded-2xl bg-[#041B5E] px-5 py-2.5 text-sm font-medium text-white">
              Go to registration
            </Link>
          )}
          {replayHref && (
            <Link href={replayHref} className="rounded-2xl border border-border px-5 py-2.5 text-sm font-medium text-primaryText">
              Watch the replay
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
