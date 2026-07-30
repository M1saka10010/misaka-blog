import { Link } from "react-router";

import type { ArchiveMonth, PublicTag } from "~/server/db/public";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-sm font-semibold tracking-wide text-ink">{children}</h2>;
}

export function TagSection({ tags }: { tags: PublicTag[] }) {
  return (
    <section aria-labelledby="popular-tags">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading><span id="popular-tags">常用标签</span></SectionHeading>
        <Link className="text-xs font-medium text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to="/tags">全部</Link>
      </div>
      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag.slug} to={`/tags/${tag.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-mono text-xs text-ink-soft transition-colors hover:border-mint/60 hover:text-mint-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              <span className="text-mint-strong">#</span>{tag.name}<span className="text-muted">{tag.postCount}</span>
            </Link>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-muted">还没有标签。</p>}
    </section>
  );
}

export function ArchiveSection({ months }: { months: ArchiveMonth[] }) {
  return (
    <section className="border-t border-line pt-5" aria-labelledby="recent-archive">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading><span id="recent-archive">文章归档</span></SectionHeading>
        <Link className="text-xs font-medium text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to="/archive">全部</Link>
      </div>
      {months.length > 0 ? (
        <ol className="mt-3">
          {months.map((item) => (
            <li key={`${item.year}-${item.month}`}>
              <Link to={`/archive/${item.year}/${item.month}`} className="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <time className="font-mono" dateTime={`${item.year}-${String(item.month).padStart(2, "0")}`}>{item.year}.{String(item.month).padStart(2, "0")}</time>
                <span className="font-mono text-xs text-muted">{item.postCount}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-muted">还没有已发布文章。</p>}
    </section>
  );
}
