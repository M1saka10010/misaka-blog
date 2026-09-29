import { Link, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { PublicPageFrame } from "~/components/public/public-page-frame";
import { siteMeta } from "~/lib/page-meta";
import { getSiteOriginFromMatches, getSiteTitleFromMatches } from "~/lib/public-context";
import { canonicalUrl } from "~/lib/site-urls";
import { buildCollectionGraph } from "~/lib/structured-data";
import { getDatabase } from "~/server/database.server";
import { getAllArchiveMonths } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  const origin = getSiteOriginFromMatches(matches);
  const months = loaderData?.months ?? [];
  const total = months.reduce((sum, item) => sum + item.postCount, 0);
  const description = months.length
    ? `按月份浏览 ${total} 篇已发布文章，覆盖 ${months[months.length - 1].year} 年至 ${months[0].year} 年。`
    : "按月份浏览全部已发布文章。";

  return [
    ...siteMeta(matches),
    { title: `文章归档 · ${getSiteTitleFromMatches(matches)}` },
    { name: "description", content: description },
    ...(origin ? [{ tagName: "link", rel: "canonical", href: canonicalUrl(origin, "/archive") }] : []),
    ...(origin
      ? [{ "script:ld+json": buildCollectionGraph({ origin, path: "/archive", name: "文章归档", description }) }]
      : []),
  ];
};

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
                      <time className="font-display text-base font-semibold tabular-nums group-hover:text-accent-ink" dateTime={`${item.year}-${String(item.month).padStart(2, "0")}`}>{String(item.month).padStart(2, "0")} 月</time>
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
