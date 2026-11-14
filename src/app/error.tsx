"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level error boundary: never shows internal error details, only a reference. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-primaryText">Something went wrong</h1>
        <p className="mt-3 text-sm text-secondaryText">We couldn&apos;t load this page. Please try again in a moment.</p>
        {error.digest && <p className="mt-2 text-xs text-secondaryText">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-2xl bg-[#16D6B2] px-4 py-2 text-sm font-medium text-[#101B35]">
            Try again
          </button>
          <Link href="/" className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-primaryText">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
