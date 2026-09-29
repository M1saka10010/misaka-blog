import { useEffect, useRef } from "react";
import { Link, useOutletContext, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { formatDottedDate, isUpdatedLater, toIsoDateTime } from "~/lib/date-time";
import { siteMeta } from "~/lib/page-meta";
import { getSiteOriginFromMatches, getSiteSettingsFromMatches, getSiteTitleFromMatches, type PublicLayoutData } from "~/lib/public-context";
import { postUrl, tagPath } from "~/lib/site-urls";
import { buildPostGraph } from "~/lib/structured-data";
import { getDatabase } from "~/server/database.server";
import { getAdjacentPosts, getPostBySlug } from "~/server/db/public";

// 允许答案引擎取用完整片段与原始配图，这是被引用而不是被"截断成标题"的前提
const ROBOTS = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  if (!loaderData) {
    return [...siteMeta(matches), { title: `文章不存在 · ${getSiteTitleFromMatches(matches)}` }];
  }

  const { post } = loaderData;
  const origin = getSiteOriginFromMatches(matches);
  const settings = getSiteSettingsFromMatches(matches);
  const url = postUrl(origin, post.slug);

  return [
    ...siteMeta(matches),
    { title: `${post.title} · ${getSiteTitleFromMatches(matches)}` },
    { name: "description", content: post.summary },
    { name: "robots", content: ROBOTS },
    { name: "author", content: settings?.profileHandle || settings?.siteTitle || "" },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "article" },
    { property: "og:title", content: post.title },
    { property: "og:description", content: post.summary },
    { property: "og:url", content: url },
    { property: "article:published_time", content: toIsoDateTime(post.publishedAt) },
    { property: "article:modified_time", content: toIsoDateTime(post.updatedAt) },
    ...post.tags.map((tag) => ({ property: "article:tag", content: tag.name })),
    { name: "twitter:title", content: post.title },
    { name: "twitter:description", content: post.summary },
    ...(settings && origin ? [{ "script:ld+json": buildPostGraph(origin, settings, post) }] : []),
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.slug) throw new Response("文章不存在", { status: 404 });
  const db = getDatabase();
  const post = await getPostBySlug(db, params.slug);
  if (!post) throw new Response("文章不存在", { status: 404 });
  const adjacent = await getAdjacentPosts(db, post.publishedAt);
  return { post, adjacent };
}

function ReadingProgress() {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={barRef} className="reading-progress" aria-hidden="true" />;
}

export default function PostDetail({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { post, adjacent } = loaderData;
  const { settings, timeZone } = useOutletContext<PublicLayoutData>();
  const articleRef = useRef<HTMLDivElement>(null);
  const updated = isUpdatedLater(post.publishedAt, post.updatedAt);

  // 代码块复制：事件委托，避免为每个代码块注册监听
  useEffect(() => {
    const container = articleRef.current;
    if (!container) return;
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest(".code-copy");
      if (!(button instanceof HTMLButtonElement)) return;
      const code = button.parentElement?.querySelector("pre")?.innerText ?? "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "已复制";
      } catch {
        button.textContent = "复制失败";
      }
      window.setTimeout(() => { button.textContent = "复制"; }, 1600);
    };
    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 md:px-8 lg:pb-28 lg:pt-14">
      <ReadingProgress />
      <article className="rounded-xl border border-line bg-surface px-5 py-8 shadow-soft md:px-10 md:py-12 lg:px-20 lg:py-16">
        <header className="mx-auto max-w-reading border-b border-line pb-8 text-left lg:pb-12">
          <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 font-mono text-xs text-muted tabular-nums">
            {settings.profileHandle && (
              <>
                <span>{settings.profileHandle}</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-mint" />
              </>
            )}
            <time dateTime={post.publishedAt}>{formatDottedDate(post.publishedAt, timeZone)}</time>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-mint" />
            <span>{post.readingMinutes} 分钟阅读</span>
            {updated && (
              <>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-mint" />
                <span>更新于 <time dateTime={toIsoDateTime(post.updatedAt)}>{formatDottedDate(post.updatedAt, timeZone)}</time></span>
              </>
            )}
          </div>
          <h1 className="mt-6 font-editorial text-3xl font-semibold leading-tight tracking-tight text-balance text-ink lg:text-display-42">{post.title}</h1>
          {post.tags.length > 0 && <div className="mt-6 flex flex-wrap justify-start gap-3">{post.tags.map((tag) => <Link key={tag.slug} className="font-mono text-xs text-mint-strong transition-colors hover:text-accent-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to={tagPath(tag.slug)}>#{tag.name}</Link>)}</div>}
        </header>
        {post.renderedHtml ? (
          <div ref={articleRef} className="article-rich-text mx-auto mt-10 max-w-reading lg:mt-12" dangerouslySetInnerHTML={{ __html: post.renderedHtml }} />
        ) : (
          <div className="mx-auto mt-10 max-w-reading rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">这篇文章还没有正文。</div>
        )}
        <footer className="mx-auto mt-14 max-w-reading border-t border-line pt-8">
          {(adjacent.newer || adjacent.older) && (
            <nav className="mb-8 grid gap-3 sm:grid-cols-2" aria-label="相邻文章">
              {adjacent.newer ? (
                <Link viewTransition to={`/posts/${adjacent.newer.slug}`} className="group rounded-lg border border-line px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="block font-mono text-xs text-muted">较新一篇</span>
                  <span className="mt-1 block truncate text-sm font-medium text-ink transition-colors group-hover:text-accent-ink">{adjacent.newer.title}</span>
                </Link>
              ) : <span aria-hidden="true" />}
              {adjacent.older ? (
                <Link viewTransition to={`/posts/${adjacent.older.slug}`} className="group rounded-lg border border-line px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-right">
                  <span className="block font-mono text-xs text-muted">较早一篇</span>
                  <span className="mt-1 block truncate text-sm font-medium text-ink transition-colors group-hover:text-accent-ink">{adjacent.older.title}</span>
                </Link>
              ) : <span aria-hidden="true" />}
            </nav>
          )}
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink-soft hover:border-accent/40 hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to="/">返回文章列表</Link>
        </footer>
      </article>
    </main>
  );
}
