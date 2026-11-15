import Link from "next/link";
import { TrackingScripts } from "@/components/registration/tracking-scripts";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import type { PageDesign, RegistrationSource } from "@/types";
import { PageBlocksLayout, PageBlockView, pageThemeStyle } from "./blocks";

/** Hosted registration page rendered from a custom drag-and-drop design. */
export function DesignedRegistrationPage({ view, design, preview, source }: { view: PublicRegistrationView; design: PageDesign; preview: boolean; source: RegistrationSource }) {
  const ctx = { view, theme: design.theme, mode: "public" as const, preview, source };
  return (
    <main className="relative z-10 min-h-screen px-4 py-8 md:px-6" style={pageThemeStyle(design.theme)} data-page-design="custom">
      {!preview && <TrackingScripts {...view.tracking} />}
      {preview && (
        <div className="mx-auto mb-4 max-w-6xl rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-4 py-2 text-sm text-[#8A5A0E]">
          Preview mode — only you can see this page until the webinar is published.
        </div>
      )}
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101B35] text-sm font-bold text-white">W</div>
          <div className="text-lg font-semibold">Webineer</div>
        </div>
        <Link href="/" className="text-sm font-medium opacity-70">
          Back to homepage
        </Link>
      </header>
      <PageBlocksLayout design={design} renderBlock={(block) => <PageBlockView key={block.id} block={block} ctx={ctx} />} />
    </main>
  );
}
