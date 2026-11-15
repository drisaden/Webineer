import Link from "next/link";
import { CalendarClock, UserRound } from "lucide-react";
import type { PublicRegistrationView } from "@/lib/webinar-workflow/public-view";
import type { RegistrationSource } from "@/types";
import { DesignedRegistrationPage } from "@/components/page-design/designed-registration-page";
import { PreviewPlayer } from "./preview-player";
import { RegistrationForm } from "./registration-form";
import { TrackingScripts } from "./tracking-scripts";

/** Hosted registration page rendered from the workflow configuration. */
export function ConfiguredRegistrationPage({ view, preview, source }: { view: PublicRegistrationView; preview: boolean; source: RegistrationSource }) {
  // A custom drag-and-drop design replaces the standard layout below when one is enabled.
  if (view.page) return <DesignedRegistrationPage view={view} design={view.page} preview={preview} source={source} />;
  return (
    <main className="relative z-10 min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
      {!preview && <TrackingScripts {...view.tracking} />}
      {preview && (
        <div className="mx-auto mb-4 max-w-6xl rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-4 py-2 text-sm text-[#8A5A0E]">
          Preview mode — only you can see this page until the webinar is published.
        </div>
      )}
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101B35] text-sm font-bold text-white">W</div>
            <div className="text-lg font-semibold">Webineer</div>
          </div>
          <Link href="/" className="text-sm font-medium text-secondaryText">
            Back to homepage
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft">
              {view.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.coverImageUrl} alt="" className="aspect-[16/7] w-full object-cover" />
              )}
              <div className="p-6">
                <div className="mb-5 inline-flex items-center rounded-full bg-[#EAFBF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#0F7B52]">
                  {view.mode === "always_on" ? "On-demand webinar" : "Webinar registration"}
                </div>
                <h1 className="text-3xl font-semibold text-primaryText md:text-4xl">{view.headline}</h1>
                {view.description && <p className="mt-3 max-w-xl whitespace-pre-line text-base text-secondaryText">{view.description}</p>}
                {view.showDateTime && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F7F9FC] px-3 py-2 text-sm text-primaryText">
                    <CalendarClock className="h-4 w-4 text-[#16D6B2]" aria-hidden /> {view.dateLabel}
                  </p>
                )}
              </div>
            </div>

            {view.videoPreview && (
              <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-3 shadow-soft">
                <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
                  <PreviewPlayer source={view.videoPreview} title={view.title} />
                </div>
              </div>
            )}

            {view.showPresenters && (view.presenters.length > 0 || view.hostName) && (
              <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
                <h2 className="text-lg text-primaryText">{view.presenters.length > 1 ? "Presenters" : "Presented by"}</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(view.presenters.length ? view.presenters : [{ name: view.hostName, title: "Host", bio: "", avatarUrl: "" }]).map((p) => (
                    <li key={p.name} className="flex items-start gap-3">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5FF] text-[#17294B]">
                          <UserRound className="h-5 w-5" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-primaryText">{p.name}</p>
                        {p.title && <p className="text-sm text-secondaryText">{p.title}</p>}
                        {p.bio && <p className="mt-1 text-sm text-secondaryText">{p.bio}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside id="register" className="h-fit scroll-mt-6 rounded-[2rem] border border-border bg-white p-6 shadow-soft lg:sticky lg:top-6">
            <h2 className="text-2xl font-semibold text-primaryText">Reserve your seat</h2>
            <p className="mt-2 mb-5 text-sm text-secondaryText">{view.title}</p>
            <RegistrationForm view={view} source={source} embedded={false} preview={preview} />
          </aside>
        </div>
      </div>
    </main>
  );
}
