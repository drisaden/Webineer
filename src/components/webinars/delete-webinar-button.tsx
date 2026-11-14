"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/** Two-step delete. The webinar is archived (soft-deleted); registrations and payments are kept. */
export function DeleteWebinarButton({ webinarId, title }: { webinarId: string; title: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "confirm" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setStage("deleting");
    setError(null);
    const res = await fetch(`/api/webinars/${webinarId}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setError(data.error ?? "Couldn't delete the webinar.");
      setStage("confirm");
      return;
    }
    router.push("/dashboard/webinars");
    router.refresh();
  };

  if (stage === "idle") {
    return (
      <button type="button" onClick={() => setStage("confirm")} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
        <Trash2 className="h-4 w-4" aria-hidden /> Delete
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#F5D7D7] bg-[#FFF6F6] px-3 py-2 text-sm text-[#B33A3A]" role="alertdialog" aria-label={`Delete ${title}?`}>
      <span>Delete “{title}”? Its public pages stop working.</span>
      <button type="button" onClick={remove} disabled={stage === "deleting"} className="rounded-xl bg-[#B33A3A] px-3 py-1.5 font-medium text-white disabled:opacity-60">
        {stage === "deleting" ? "Deleting…" : "Delete webinar"}
      </button>
      <button type="button" onClick={() => setStage("idle")} disabled={stage === "deleting"} className="rounded-xl px-3 py-1.5 font-medium text-[#17294B]">
        Cancel
      </button>
      {error && <span role="alert" className="w-full text-xs">{error}</span>}
    </div>
  );
}
