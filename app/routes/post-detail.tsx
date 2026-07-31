import { Link, useOutletContext, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { ElectricMark } from "~/components/public/electric-mark";
import { formatPublishedDate } from "~/components/public/post-list";
import { getSiteTitleFromMatches, type PublicLayoutData } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { getPostBySlug } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => loaderData ? [
  { title: `${loaderData.post.title} · ${getSiteTitleFromMatches(matches)}` },
  { name: "description", content: loaderData.post.summary },
] : [{ title: `文章不存在 · ${getSiteTitleFromMatches(matches)}` }];

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.slug) throw new Response("文章不存在", { status: 404 });
  const post = await getPostBySlug(getDatabase(), params.slug);
  if (!post) throw new Response("文章不存在", { status: 404 });
  return { post };
}

export default function PostDetail({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { post } = loaderData;
  const { timeZone } = useOutletContext<PublicLayoutData>();
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 md:px-8 lg:pb-28 lg:pt-14">
      <article className="rounded-xl border border-line bg-surface px-5 py-8 shadow-soft md:px-10 md:py-12 lg:px-20 lg:py-16">
        <header className="mx-auto max-w-reading border-b border-line pb-8 text-left lg:pb-12">
          <div className="flex justify-start"><ElectricMark /></div>
          <div className="mt-6 flex flex-wrap items-center justify-start gap-x-3 gap-y-2 font-mono text-xs text-muted">
            <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt, timeZone)}</time>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-mint" />
            <span>{post.readingMinutes} 分钟阅读</span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-ink lg:text-display-42">{post.title}</h1>
          {post.tags.length > 0 && <div className="mt-6 flex flex-wrap justify-start gap-3">{post.tags.map((tag) => <Link key={tag.slug} className="font-mono text-xs text-mint-strong transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}</div>}
        </header>
        {post.renderedHtml ? (
          <div className="article-rich-text mx-auto mt-10 max-w-reading lg:mt-12" dangerouslySetInnerHTML={{ __html: post.renderedHtml }} />
        ) : (
          <div className="mx-auto mt-10 max-w-reading rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">这篇文章还没有正文。</div>
        )}
        <footer className="mx-auto mt-14 max-w-reading border-t border-line pt-8">
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink-soft hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to="/">返回文章列表</Link>
        </footer>
      </article>
    </main>
  );
}
