import { Link, useLocation } from "react-router";

function pageHref(pathname: string, search: string, page: number): string {
  const params = new URLSearchParams(search);
  if (page === 1) params.delete("page"); else params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { pathname, search } = useLocation();
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === totalPages || Math.abs(value - page) <= 2,
  );

  return (
    <nav className="mt-8 flex items-center justify-between border-t border-line pt-6" aria-label="文章分页">
      {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink-soft hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to={pageHref(pathname, search, page - 1)}>上一页</Link> : <span className="min-h-11 w-20" />}
      <span className="font-mono text-xs text-muted md:hidden">{page} / {totalPages}</span>
      <div className="hidden items-center gap-1 md:flex">
        {pages.map((value, index) => {
          const previous = pages[index - 1];
          return <span key={value} className="flex items-center gap-1">{previous && value - previous > 1 && <span className="px-2 text-muted">…</span>}<Link aria-current={value === page ? "page" : undefined} className={`grid h-11 min-w-11 place-items-center rounded-lg font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${value === page ? "bg-accent text-white" : "text-muted hover:bg-accent-soft hover:text-accent"}`} to={pageHref(pathname, search, value)}>{value}</Link></span>;
        })}
      </div>
      {page < totalPages ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink-soft hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" to={pageHref(pathname, search, page + 1)}>下一页</Link> : <span className="min-h-11 w-20" />}
    </nav>
  );
}
