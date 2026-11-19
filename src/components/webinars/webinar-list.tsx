"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, MoreVertical, Search, SlidersHorizontal, Plus, Trash2, Settings2, Eye, ExternalLink } from "lucide-react";
import type { Webinar } from "@/types";
import { formatDateTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WebinarListProps {
  webinars: Webinar[];
  canDelete: boolean;
}

export function WebinarList({ webinars, canDelete }: WebinarListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webinar | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null);
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setFiltersOpen(false);
        setDeleteTarget(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const filtered = webinars.filter((webinar) => {
    const term = query.trim().toLowerCase();
    const matchesSearch = !term || webinar.title.toLowerCase().includes(term) || webinar.description.toLowerCase().includes(term);
    return matchesSearch && (status === "all" || webinar.status === status) && (type === "all" || webinar.type === type);
  });

  const activeFilters = (status !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0);
  const hasCriteria = activeFilters > 0 || query.trim() !== "";

  const removeWebinar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/webinars/${deleteTarget.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setError(body.error ?? "Couldn't delete the webinar.");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setDeleteTarget(null);
    router.refresh();
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex flex-1 cursor-text items-center gap-3 rounded-xl border border-border bg-white px-3 py-0 md:py-2.5">
            <Search className="h-4 w-4 text-secondaryText" />
            <input aria-label="Search webinars" placeholder="Search webinars..." value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full bg-transparent text-sm outline-none md:min-h-0" />
          </label>
          <div className="flex items-center gap-3">
            <div className="relative" ref={filterRef}>
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} className="tap inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-primaryText">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeFilters > 0 && <span data-testid="filter-count" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#041B5E] px-1 text-[11px] font-semibold text-white">{activeFilters}</span>}
            </button>
            {filtersOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <label className="text-xs font-medium text-secondaryText">
                    Status
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field mt-1 w-full">
                      <option value="all">All statuses</option>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-secondaryText">
                    Webinar type
                    <select value={type} onChange={(event) => setType(event.target.value)} className="input-field mt-1 w-full">
                      <option value="all">All types</option>
                      <option value="live">Live</option>
                      <option value="automated">Automated</option>
                      <option value="evergreen">Evergreen</option>
                      <option value="on_demand">On demand</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </label>
                </div>
                <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-[#17294B] hover:underline">Clear search and filters</button>
              </div>
            )}
            </div>
            <Button asChild className="gap-2">
              <Link href="/dashboard/webinars/new"><Plus className="h-4 w-4" /> Create Webinar</Link>
            </Button>
          </div>
        </div>

        {hasCriteria && (
          <p className="text-xs text-secondaryText" role="status" aria-live="polite" data-testid="result-count">
            Showing {filtered.length} of {webinars.length} webinar{webinars.length === 1 ? "" : "s"}.{" "}
            <button type="button" onClick={clearFilters} className="font-semibold text-[#17294B] hover:underline">Clear search and filters</button>
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-white p-10 text-center text-sm text-secondaryText">
            {webinars.length === 0 ? (
              <>You haven&apos;t created a webinar yet. <Link href="/dashboard/webinars/new" className="font-semibold text-[#17294B] hover:underline">Create your first webinar</Link>.</>
            ) : (
              "No webinars match the current search and filters."
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((webinar) => (
              <div key={webinar.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-soft">
                <div className="h-40 bg-gradient-to-br from-[#17294B] via-[#101B35] to-[#16D6B2]/70 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge label={webinar.type} tone="info" className="bg-white/10 text-white" />
                      <Badge label={webinar.status} tone={webinar.status === "scheduled" ? "info" : "success"} className="bg-white/10 text-white" />
                    </div>
                    <div className="relative" ref={openMenu === webinar.id ? menuRef : undefined}>
                      <button type="button" onClick={() => setOpenMenu(openMenu === webinar.id ? null : webinar.id)} className="tap-icon inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/15" aria-label={`Actions for ${webinar.title}`} aria-expanded={openMenu === webinar.id}>
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {openMenu === webinar.id && (
                        <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-border bg-white p-1.5 text-primaryText shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
                          <Link href={`/dashboard/webinars/${webinar.id}`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F1F5F9]"><Eye className="h-4 w-4" /> View details</Link>
                          <Link href={`/dashboard/webinars/${webinar.id}/setup`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F1F5F9]"><Settings2 className="h-4 w-4" /> Edit setup</Link>
                          {webinar.slug && webinar.status !== "draft" && (
                            <Link href={`/w/${webinar.slug}`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F1F5F9]"><ExternalLink className="h-4 w-4" /> Public page</Link>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => { setOpenMenu(null); setError(null); setDeleteTarget(webinar); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#B33A3A] hover:bg-[#FFF1F1]"><Trash2 className="h-4 w-4" /> Delete webinar</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-12 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/60">Webinar</p>
                      <h3 className="mt-2 line-clamp-2 text-xl font-semibold">{webinar.title}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-secondaryText line-clamp-2">{webinar.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-secondaryText"><CalendarClock className="h-4 w-4" />{formatDateTime(webinar.schedule.startsAt, webinar.schedule.timezone)}</div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm text-secondaryText">{webinar.registrationCount} registrations</span>
                    <Link href={webinar.status === "draft" ? `/dashboard/webinars/${webinar.id}/setup` : `/dashboard/webinars/${webinar.id}`} className="tap text-sm font-medium text-[#17294B] hover:underline">
                      {webinar.status === "draft" ? "Continue setup" : "Manage"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101B35]/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
          <div role="alertdialog" aria-modal="true" aria-label={`Delete ${deleteTarget.title}?`} className="w-full max-w-md rounded-[1.5rem] border border-border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1F1] text-[#B33A3A]"><Trash2 className="h-5 w-5" /></div>
            <h2 className="mt-4 text-lg font-semibold text-primaryText">Delete “{deleteTarget.title}”?</h2>
            <p className="mt-2 text-sm text-secondaryText">Its public pages will stop working. Registrations and payment records will be retained.</p>
            {error && <p role="alert" className="mt-3 rounded-lg bg-[#FFF1F1] px-3 py-2 text-xs text-[#B33A3A]">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-primaryText disabled:opacity-60">Cancel</button>
              <button type="button" disabled={deleting} onClick={removeWebinar} className="rounded-xl bg-[#B33A3A] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{deleting ? "Deleting…" : "Delete webinar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
