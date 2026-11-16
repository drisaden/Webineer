"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/site";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#solutions", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Homepage navbar. Desktop shows the links inline; on phones the links move into a menu so the bar
 * only carries the logo, the main call to action and the menu button, and it stays pinned while scrolling.
 */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-5">
      <nav ref={rootRef} aria-label="Main" className="relative rounded-[1.75rem] border border-white/60 bg-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl md:rounded-full">
        <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3">
          <Link href="/" aria-label={`${APP_NAME} home`} className="flex min-h-11 shrink-0 items-center pl-1">
            <Logo tone="auto" className="h-7 w-auto shrink-0 min-[380px]:h-8 sm:h-9" title={APP_NAME} />
          </Link>

          <div className="hidden items-center gap-8 text-sm text-secondaryText md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primaryText">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden px-2 text-sm font-medium text-primaryText sm:inline">
              Log in
            </Link>
            <Button asChild variant="primary" size="sm" className="max-[359px]:hidden">
              <Link href="/register">Get started</Link>
            </Button>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-primaryText md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              data-testid="mobile-menu-button"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        {open && (
          <div id="mobile-menu" data-testid="mobile-menu" className="border-t border-border px-3 pb-3 pt-2 md:hidden">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-primaryText hover:bg-[#EEF5FF]">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 min-[360px]:hidden">
                <Button asChild variant="primary" size="md" className="w-full">
                  <Link href="/register" onClick={() => setOpen(false)}>Get started</Link>
                </Button>
              </li>
              <li className="sm:hidden">
                <Link href="/login" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-primaryText hover:bg-[#EEF5FF]">
                  Log in
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
