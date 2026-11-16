import { liveFeatureRows, planLimitRows, type ArticleBlock } from "@/lib/support/articles";
import { Lightbulb } from "lucide-react";

export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-primaryText">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "h":
            return <h2 key={i} className="pt-3 text-xl text-primaryText">{b.text}</h2>;
          case "steps":
            return (
              <ol key={i} className="space-y-2.5">
                {b.items.map((item, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#041B5E] text-xs font-semibold text-white">{n + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-[#0AEBCB]">
                {b.items.map((item, n) => <li key={n}>{item}</li>)}
              </ul>
            );
          case "tip":
            return (
              <div key={i} className="flex gap-3 rounded-2xl border border-[#BFE9E0] bg-[#E9FBF7] p-4 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7F6B]" aria-hidden />
                <p>{b.text}</p>
              </div>
            );
          case "plans":
            return b.kind === "limits" ? (
              <div key={i} className="overflow-x-auto rounded-2xl border border-border bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F7F9FC] text-secondaryText">
                    <tr>{["Plan", "Price", "Webinars", "Registrants per webinar", "Team members", "Also included"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {planLimitRows().map((r) => (
                      <tr key={r.plan} className="border-t border-border align-top">
                        <td className="px-4 py-3 font-medium">{r.plan}</td>
                        <td className="px-4 py-3">{r.price}</td>
                        <td className="px-4 py-3">{r.webinars}</td>
                        <td className="px-4 py-3">{r.registrants}</td>
                        <td className="px-4 py-3">{r.team}</td>
                        <td className="px-4 py-3 text-secondaryText">{r.extras}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                {liveFeatureRows().map((r) => (
                  <div key={r.plan} className="rounded-2xl border border-border bg-white p-4">
                    <p className="font-semibold">{r.plan}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondaryText marker:text-[#0AEBCB]">{r.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  </div>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
