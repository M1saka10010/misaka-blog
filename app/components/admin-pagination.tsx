import { Link, useLocation } from "react-router";

function getPageHref(pathname: string, search: string, page: number): string {
  const searchParams = new URLSearchParams(search);
  if (page === 1) searchParams.delete("page");
  else searchParams.set("page", String(page));
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { pathname, search } = useLocation();
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === totalPages || Math.abs(value - page) <= 2,
  );
  const linkClassName = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="后台文章分页">
      {page > 1 ? <Link className={linkClassName} to={getPageHref(pathname, search, page - 1)}>上一页</Link> : <span className="min-h-11 w-20" />}
      <span className="text-xs text-slate-500 sm:hidden">{page} / {totalPages}</span>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((value, index) => {
          const previousPage = pages[index - 1];
          return (
            <span key={value} className="flex items-center gap-1">
              {previousPage && value - previousPage > 1 ? <span className="px-2 text-slate-400">…</span> : null}
              <Link
                aria-current={value === page ? "page" : undefined}
                className={value === page ? "grid min-h-11 min-w-11 place-items-center rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white" : linkClassName}
                to={getPageHref(pathname, search, value)}
              >
                {value}
              </Link>
            </span>
          );
        })}
      </div>
      {page < totalPages ? <Link className={linkClassName} to={getPageHref(pathname, search, page + 1)}>下一页</Link> : <span className="min-h-11 w-20" />}
    </nav>
  );
}
