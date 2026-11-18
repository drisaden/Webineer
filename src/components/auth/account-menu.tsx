"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useViewer } from "./viewer-context";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function AccountMenu() {
  const viewer = useViewer();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!viewer) return null;

  const switchTo = async (organizationId: string) => {
    if (organizationId === viewer.organizationId) return;
    setSwitching(organizationId);
    setError(null);
    const res = await fetch("/api/session/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) }).catch(() => null);
    setSwitching(null);
    if (!res?.ok) {
      setError("Couldn't switch workspace.");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/75 px-2 py-1.5 shadow-[0_10px_20px_rgba(15,23,42,0.03)]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#041B5E] text-xs font-semibold text-white">{initials(viewer.name)}</div>
        <div className="hidden max-w-[11rem] text-left md:block">
          <div className="truncate text-sm font-medium text-primaryText">{viewer.name}</div>
          <div className="truncate text-[11px] text-secondaryText">{viewer.organizationName}</div>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-secondaryText md:block" aria-hidden />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-[1.25rem] border border-white/60 bg-white/95 p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="border-b border-border px-3 pb-3 pt-2">
            <p className="truncate text-sm font-medium text-primaryText">{viewer.name}</p>
            <p className="truncate text-xs text-secondaryText">{viewer.email}</p>
            {viewer.mode === "demo" && <p className="mt-1 text-[11px] text-[#8A5A0E]">Local demo mode</p>}
          </div>
          {viewer.organizations.length > 0 && (
            <div className="border-b border-border py-2">
              <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-secondaryText">Workspaces</p>
              {viewer.organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={org.id === viewer.organizationId}
                  disabled={viewer.mode === "demo" || switching !== null}
                  onClick={() => switchTo(org.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-primaryText hover:bg-[#F7F9FC] disabled:cursor-default"
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === viewer.organizationId && <Check className="h-4 w-4 text-[#16A36A]" aria-hidden />}
                  {switching === org.id && <span className="text-xs text-secondaryText">Switching…</span>}
                </button>
              ))}
              {error && <p className="px-3 pt-1 text-xs text-[#B33A3A]">{error}</p>}
            </div>
          )}
          {viewer.isPlatformAdmin && (
            <Link href="/admin" role="menuitem" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primaryText hover:bg-[#F7F9FC]">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Platform admin
            </Link>
          )}
          {viewer.mode === "supabase" ? (
            <form action="/auth/signout" method="post">
              <button type="submit" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#B33A3A] hover:bg-[#FFF6F6]">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          ) : (
            <p className="px-3 py-2 text-xs text-secondaryText">You are in the demo workspace.</p>
          )}
        </div>
      )}
    </div>
  );
}
