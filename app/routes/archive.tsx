import { Link, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { PublicPageFrame } from "~/components/public/public-page-frame";
import { getSiteTitleFromMatches } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { getAllArchiveMonths } from "~/server/db/public";

export const meta: MetaFunction = ({ matches }) => [{ title: `文章归档 · ${getSiteTitleFromMatches(matches)}` }];

export async function loader({}: LoaderFunctionArgs) {
  return { months: await getAllArchiveMonths(getDatabase()) };
}

export default function Archive({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const years = Map.groupBy(loaderData.months, (item) => item.year);

  return (
    <PublicPageFrame>
      {loaderData.months.length > 0 ? (
        <div className="space-y-10">
          {Array.from(years, ([year, months]) => (
            <section key={year} className="grid gap-4 border-t border-line pt-5 md:grid-cols-[7rem_1fr]">
              <h2 className="flex items-baseline gap-2 font-display text-2xl font-semibold tracking-tight text-ink">
                {year}
                <span className="font-mono text-xs font-normal text-muted">{months.reduce((sum, item) => sum + item.postCount, 0)} 篇</span>
              </h2>
              <ol className="divide-y divide-line">
                {months.map((item) => (
                  <li key={item.month}>
                    <Link className="group flex min-h-14 items-center justify-between rounded-lg px-2 text-ink-soft hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to={`/archive/${item.year}/${item.month}`}>
                      <time className="font-display text-base font-semibold group-hover:text-accent" dateTime={`${item.year}-${String(item.month).padStart(2, "0")}`}>{String(item.month).padStart(2, "0")} 月</time>
                      <span className="font-mono text-xs text-muted">{item.postCount} 篇</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">第一篇文章发布后，时间线会从这里开始。</div>}
    </PublicPageFrame>
  );
}
