import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/brand/webineer-logo.svg" alt="Webineer logo" className="h-9 w-auto" />
          </Link>
          <Link href="/" className="text-sm font-medium text-secondaryText">Back to homepage</Link>
        </header>
        {children}
      </div>
    </div>
  );
}
