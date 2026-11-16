import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/support/article-body";
import { HELP_ARTICLES, HELP_CATEGORIES, getArticle } from "@/lib/support/articles";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? { title: article.title, description: article.summary } : {};
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const category = HELP_CATEGORIES.find((c) => c.id === article.category);
  const related = article.related.map((s) => getArticle(s)).filter((a) => a !== undefined);
  return (
    <article className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-secondaryText">
        <Link href="/help" className="tap hover:text-primaryText">Help center</Link>
        <span aria-hidden> / </span>
        <span>{category?.title}</span>
      </nav>
      <h1 className="text-3xl md:text-4xl">{article.title}</h1>
      <p className="mt-3 text-lg text-secondaryText">{article.summary}</p>
      <p className="mt-2 text-xs text-secondaryText">Updated {new Date(article.updated + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
      <div className="mt-8 rounded-[2rem] border border-border bg-white p-6 shadow-soft md:p-8">
        <ArticleBody blocks={article.body} />
      </div>

      {related.length > 0 && (
        <section className="mt-8" aria-label="Related articles">
          <h2 className="text-lg">Related articles</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={`/help/${a.slug}`} className="flex min-h-14 flex-col justify-center rounded-2xl border border-border bg-white px-4 py-2 hover:bg-[#F7F9FC]">
                  <span className="text-sm font-medium text-primaryText">{a.title}</span>
                  <span className="text-xs text-secondaryText">{a.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3 rounded-[1.5rem] border border-dashed border-border bg-[#F7F9FC] p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-secondaryText">Didn&apos;t answer your question?</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/help" className="inline-flex min-h-11 items-center rounded-2xl bg-[#041B5E] px-4 font-medium text-white">Chat or call support</Link>
          <Link href="/help#contact" className="inline-flex min-h-11 items-center rounded-2xl border border-border bg-white px-4 font-medium text-primaryText">Send an email</Link>
        </div>
      </div>
    </article>
  );
}
