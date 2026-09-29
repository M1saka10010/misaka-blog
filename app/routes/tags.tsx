import { Link, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { PublicPageFrame } from "~/components/public/public-page-frame";
import { siteMeta } from "~/lib/page-meta";
import { getSiteOriginFromMatches, getSiteTitleFromMatches } from "~/lib/public-context";
import { canonicalUrl } from "~/lib/site-urls";
import { buildCollectionGraph } from "~/lib/structured-data";
import { getDatabase } from "~/server/database.server";
import { getAllTags } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  const origin = getSiteOriginFromMatches(matches);
  const tags = loaderData?.tags ?? [];
  const description = tags.length
    ? `按主题浏览全部 ${tags.length} 个标签：${tags.slice(0, 10).map((tag) => tag.name).join("、")}。`
    : "按主题浏览全部文章标签。";

  return [
    ...siteMeta(matches),
    { title: `全部标签 · ${getSiteTitleFromMatches(matches)}` },
    { name: "description", content: description },
    ...(origin ? [{ tagName: "link", rel: "canonical", href: canonicalUrl(origin, "/tags") }] : []),
    ...(origin
      ? [{ "script:ld+json": buildCollectionGraph({ origin, path: "/tags", name: "全部标签", description }) }]
      : []),
  ];
};

export async function loader({}: LoaderFunctionArgs) {
  return { tags: await getAllTags(getDatabase()) };
}

export default function Tags({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      {loaderData.tags.length > 0 ? (
        <ul className="divide-y divide-line border-y border-line">
          {loaderData.tags.map((tag) => (
            <li key={tag.slug}>
              <Link to={`/tags/${tag.slug}`} className="group flex min-h-16 items-center justify-between gap-5 rounded-lg px-2 py-3 text-ink transition-colors hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <span className="font-display text-lg font-semibold transition-colors group-hover:text-accent-ink"><span className="mr-2 font-mono text-sm text-mint-strong">#</span>{tag.name}</span>
                <span className="rounded-full border border-line bg-page px-2.5 py-1 font-mono text-xs text-muted tabular-nums transition-colors group-hover:border-accent/30 group-hover:text-accent-ink">{tag.postCount} 篇</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">发布文章并添加标签后，它们会出现在这里。</div>
      )}
    </PublicPageFrame>
  );
}
