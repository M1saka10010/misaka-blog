import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { PageHeading } from "~/components/public/page-heading";
import { Pagination } from "~/components/public/pagination";
import { PostList } from "~/components/public/post-list";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { siteMeta } from "~/lib/page-meta";
import { getSiteOriginFromMatches, getSiteTitleFromMatches, readPage } from "~/lib/public-context";
import { canonicalUrl } from "~/lib/site-urls";
import { buildCollectionGraph } from "~/lib/structured-data";
import { getDatabase } from "~/server/database.server";
import { getPostsByMonth } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  if (!loaderData) return [...siteMeta(matches), { title: `归档不存在 · ${getSiteTitleFromMatches(matches)}` }];

  const { year, month, posts } = loaderData;
  const origin = getSiteOriginFromMatches(matches);
  const name = `${year} 年 ${month} 月`;
  const description = `${year} 年 ${month} 月共发布 ${posts.totalPosts} 篇文章。`;
  const path = `/archive/${year}/${month}`;

  return [
    ...siteMeta(matches),
    { title: `${name} · ${getSiteTitleFromMatches(matches)}` },
    { name: "description", content: description },
    ...(origin ? [{ tagName: "link", rel: "canonical", href: canonicalUrl(origin, path, posts.page) }] : []),
    ...(origin
      ? [{ "script:ld+json": buildCollectionGraph({ origin, path, name, description, posts: posts.posts }) }]
      : []),
  ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const year = Number(params.year);
  const month = Number(params.month);
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Response("归档月份不存在", { status: 404 });
  }
  const url = new URL(request.url);
  const posts = await getPostsByMonth(getDatabase(), year, month, readPage(url.searchParams));
  if (posts.totalPosts === 0) throw new Response("归档月份不存在", { status: 404 });
  return { year, month, posts };
}

export default function ArchiveMonth({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      <PageHeading eyebrow="Monthly archive" title={`${loaderData.year} 年 ${loaderData.month} 月`} description={`这个月共发布 ${loaderData.posts.totalPosts} 篇文章。`} />
      <PostList data={loaderData.posts} />
      <Pagination page={loaderData.posts.page} totalPages={loaderData.posts.totalPages} />
    </PublicPageFrame>
  );
}
