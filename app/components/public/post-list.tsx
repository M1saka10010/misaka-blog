import { Link, useOutletContext } from "react-router";

import type { PublicLayoutData } from "~/lib/public-context";
import type { PaginatedPosts } from "~/server/db/public";
import { ArrowIcon } from "./icons";

export function formatPublishedDate(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date).replaceAll("/", ".");
}

export function PostList({ data, emptyMessage = "还没有已发布的文章。" }: { data: PaginatedPosts; emptyMessage?: string }) {
  const { timeZone } = useOutletContext<PublicLayoutData>();
  if (data.posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-ink">这里暂时是空的</p>
        <p className="mt-2 text-sm leading-6 text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-line">
      {data.posts.map((post) => (
        <li key={post.slug} className="group py-7 first:pt-6 lg:py-9">
          <article>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-muted">
              <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt, timeZone)}</time>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-mint" />
              <span>{post.readingMinutes} 分钟阅读</span>
            </div>
            <h2 className="mt-3 font-display text-[1.375rem] font-semibold leading-snug tracking-tight text-ink lg:text-2xl">
              <Link className="decoration-accent/35 decoration-2 underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4" to={`/posts/${post.slug}`}>{post.title}</Link>
            </h2>
            {post.summary && <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-7 text-ink-soft lg:text-base">{post.summary}</p>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {post.tags.map((tag) => <Link key={tag.slug} className="font-mono text-xs text-mint-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}
              </div>
              <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to={`/posts/${post.slug}`}>
                继续阅读 <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
