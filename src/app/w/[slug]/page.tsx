import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getEmbedUrl } from "@/providers/video";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";

export default async function WebinarRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const webinar = mockWebinarRepository.getBySlug(slug);

  if (!webinar) {
    notFound();
  }

  const embedUrl = getEmbedUrl(webinar.videoSource.provider, webinar.videoSource.url);

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101B35] text-sm font-bold text-white">W</div>
            <div className="text-lg font-semibold">Webineer</div>
          </div>
          <Link href="/" className="text-sm font-medium text-secondaryText">Back to homepage</Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
              <div className="mb-5 inline-flex items-center rounded-full bg-[#EAFBF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#0F7B52]">
                Webinar registration
              </div>
              <h1 className="text-4xl font-semibold text-primaryText">{webinar.title}</h1>
              <p className="mt-3 max-w-xl text-base text-secondaryText">{webinar.description}</p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-border bg-white p-3 shadow-soft">
              <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
                <div className="aspect-video w-full bg-[#111C2E]">
                  <iframe src={embedUrl} title={webinar.title} className="h-full w-full" allowFullScreen />
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-semibold text-primaryText">Reserve your seat</h2>
            <p className="mt-2 text-sm text-secondaryText">Join the live session and get the follow-up recap in your inbox.</p>

            <form action={`/w/${slug}/confirmation`} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-primaryText">Full name</label>
                <input className="input-field" name="name" defaultValue="Jordan Lee" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-primaryText">Email</label>
                <input className="input-field" type="email" name="email" defaultValue="jordan@example.com" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-primaryText">Company</label>
                <input className="input-field" name="company" defaultValue="Northstar Studio" />
              </div>

              <Button type="submit" className="w-full">Register now</Button>
            </form>

            <div className="mt-6 rounded-2xl border border-border bg-[#F7F9FC] p-4 text-sm text-secondaryText">
              <div className="flex items-center justify-between">
                <span>Starts</span>
                <span className="font-medium text-primaryText">{new Date(webinar.schedule.startsAt).toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Format</span>
                <span className="font-medium text-primaryText">{webinar.type}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
