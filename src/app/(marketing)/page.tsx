import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle, ShieldCheck, Sparkles, Video, Wand2 } from "lucide-react";
import { APP_NAME, APP_SUPPORTING_MESSAGE, APP_TAGLINE } from "@/lib/constants/site";
import { Button } from "@/components/ui/button";

const capabilityList = [
  "External video integrations",
  "Custom registration experiences",
  "Automated engagement and reminders",
  "Conversion-ready webinar funnels",
];

const workflowSteps = [
  { title: "Create your webinar", text: "Set the event theme, schedule and source content in a few focused steps." },
  { title: "Bring your content", text: "Use YouTube, Vimeo, iframe embeds or a native upload flow with modular providers." },
  { title: "Automate the experience", text: "Manage invitations, landing pages and audience engagement from one place." },
];

const providers = ["YouTube", "Vimeo", "Wistia", "Custom iframe", "HTML5 URL", "Uploaded video"];

const useCases = [
  "Course launches",
  "Coach sessions",
  "Product demonstrations",
  "Agency campaigns",
  "Corporate trainings",
  "Virtual events",
];

const plans = [
  { name: "Starter", price: "$19", description: "For solo operators getting started with webinar funnels.", cta: "Try starter" },
  { name: "Growth", price: "$49", description: "For teams scaling live launches and automated webinars.", cta: "Choose growth" },
  { name: "Scale", price: "$99", description: "For larger marketing operations with advanced workflows.", cta: "Talk to sales" },
];

const faqs = [
  { question: "Can I use my own video sources?", answer: "Yes. Webineer is designed around external video integrations, iframe embeds and modular providers so you can keep your current content sources." },
  { question: "Is this only for live webinars?", answer: "No. The foundation supports live, replay and automated webinar experiences, with future workflows expanding further." },
  { question: "Does Webineer host all content natively?", answer: "Not required. The product is built to orchestrate and grow the webinar experience around your existing content sources." },
];

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-primaryText">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(10,235,203,0.2),transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(4,27,94,0.12),transparent_28%)]" />
      <header className="mx-auto max-w-7xl px-6 py-5">
        <nav className="flex items-center justify-between rounded-full border border-white/60 bg-white/70 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src="/brand/webineer-logo.svg" alt={`${APP_NAME} logo`} className="h-9 w-auto" />
          </div>
          <div className="hidden items-center gap-8 text-sm text-secondaryText md:flex">
            <Link href="#platform">Platform</Link>
            <Link href="#solutions">Solutions</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-primaryText">Log in</Link>
            <Button asChild variant="primary" size="sm"><Link href="/register">Get started</Link></Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-20 px-6 pb-20">
        <section className="grid items-center gap-10 rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#16D6B2]/30 bg-[#EAFBF5] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#0F7B52]">
              <Sparkles className="h-3.5 w-3.5" />
              Webinar automation
            </div>
            <h1 className="max-w-xl text-4xl leading-tight md:text-6xl">{APP_TAGLINE}</h1>
            <p className="mt-5 max-w-xl text-lg text-secondaryText">{APP_SUPPORTING_MESSAGE}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/register">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild variant="secondary" size="lg"><Link href="#platform">Explore the platform</Link></Button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-secondaryText">
              <CheckCircle2 className="h-4 w-4 text-[#16A36A]" />
              Live, replay and automated webinar workflows
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#101B35]/90 p-5 text-white shadow-[0_25px_50px_rgba(4,27,94,0.25)] backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,35,70,0.92),rgba(10,27,81,0.88))] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#16D6B2]" />
                  <span className="text-xs text-white/70">Live session</span>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#B9F0E7]">Automated</span>
              </div>
              <div className="rounded-xl bg-[#0B1220] p-3">
                <div className="mb-3 flex h-44 items-center justify-center rounded-xl border border-dashed border-[#16D6B2]/40 bg-[#111C2E]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16D6B2]/20 text-[#16D6B2]">
                    <PlayCircle className="h-9 w-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm"><span className="text-white/70">Launch webinar</span><span className="font-medium">12:00 PM</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-white/70">Registrations</span><span className="font-medium">2,184</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-white/70">Attendance rate</span><span className="font-medium text-[#16D6B2]">68%</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="space-y-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Main value proposition</p>
            <h2 className="mt-3 text-3xl">A more flexible webinar platform for modern growth teams</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <Wand2 className="mb-3 h-8 w-8 text-[#16D6B2]" />
              <h3 className="text-lg font-semibold">Build around your content</h3>
              <p className="mt-2 text-sm text-secondaryText">Keep your video source, registration flow and webinar narrative distinct from the platform itself.</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <Video className="mb-3 h-8 w-8 text-[#16D6B2]" />
              <h3 className="text-lg font-semibold">Connect external sources</h3>
              <p className="mt-2 text-sm text-secondaryText">Support YouTube, Vimeo and custom embeds without hard-coding one provider into the app.</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <ShieldCheck className="mb-3 h-8 w-8 text-[#16D6B2]" />
              <h3 className="text-lg font-semibold">Control the experience</h3>
              <p className="mt-2 text-sm text-secondaryText">Grow branded landing page experiences, automate workflows and maintain influence over your funnel.</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              <CheckCircle2 className="mb-3 h-8 w-8 text-[#16D6B2]" />
              <h3 className="text-lg font-semibold">Drive conversion</h3>
              <p className="mt-2 text-sm text-secondaryText">Track audience behavior, build offers and turn registrations into measurable opportunities.</p>
            </div>
          </div>
        </section>

        <section id="solutions" className="rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">How it works</p>
            <h2 className="mt-3 text-3xl">From source to sales in a few steps</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {workflowSteps.map((step, idx) => (
              <div key={step.title} className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(239,245,255,0.9))] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#101B35] text-sm font-semibold text-white">0{idx + 1}</div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-secondaryText">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Supported sources</p>
            <h2 className="mt-3 text-3xl">Bring your content without changing your stack</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {providers.map((provider) => (
                <span key={provider} className="rounded-full border border-border bg-[#F7F9FC] px-3 py-2 text-sm font-medium text-primaryText">{provider}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#101B35]/90 p-8 text-white shadow-[0_26px_55px_rgba(4,27,94,0.25)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B9F0E7]">Marketing and automation</p>
            <h2 className="mt-3 text-3xl">Keep the momentum going after the live session</h2>
            <ul className="mt-6 space-y-4 text-sm text-white/80">
              {capabilityList.map((item) => (
                <li key={item} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#16D6B2]" /> {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Use cases</p>
            <h2 className="mt-3 text-3xl">Built for growing and educational teams</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div key={useCase} className="rounded-[1.5rem] border border-white/60 bg-white/75 p-5 text-center text-lg font-medium shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">{useCase}</div>
            ))}
          </div>
        </section>

        <section id="pricing" className="rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Illustrative pricing</p>
            <h2 className="mt-3 text-3xl">Simple plans for teams at every stage</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan, idx) => (
              <div key={plan.name} className={`rounded-[1.75rem] border p-6 backdrop-blur-xl ${idx === 1 ? "border-[#0AEBCB] bg-[linear-gradient(180deg,rgba(10,235,203,0.12),rgba(255,255,255,0.72))] shadow-[0_20px_45px_rgba(10,235,203,0.12)]" : "border-white/60 bg-white/75 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"}`}>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  <span className="pb-2 text-sm text-secondaryText">/month</span>
                </div>
                <p className="mt-4 text-sm text-secondaryText">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-primaryText">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A36A]" /> Basic webinar automation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A36A]" /> Audience insights</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A36A]" /> Registration landing pages</li>
                </ul>
                <Button asChild className="mt-6 w-full" variant={idx === 1 ? "primary" : "secondary"}><Link href="/register">{plan.cta}</Link></Button>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">FAQ</p>
            <h2 className="mt-3 text-3xl">Common questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-[1.5rem] border border-white/60 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
                <h3 className="text-lg font-semibold">{faq.question}</h3>
                <p className="mt-2 text-secondaryText">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101B35] text-sm font-bold text-white">W</div>
              <div className="text-lg font-semibold">{APP_NAME}</div>
            </div>
            <p className="mt-3 max-w-xs text-sm text-secondaryText">{APP_SUPPORTING_MESSAGE}</p>
          </div>
          <div>
            <h3 className="font-semibold">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-secondaryText">
              <li>Webinars</li>
              <li>Landing pages</li>
              <li>Analytics</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-secondaryText">
              <li>Help center</li>
              <li>Privacy</li>
              <li>Terms</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
