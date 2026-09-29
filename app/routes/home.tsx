import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { Pagination } from "~/components/public/pagination";
import { PostList } from "~/components/public/post-list";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { siteMeta } from "~/lib/page-meta";
import { getSiteOriginFromMatches, getSiteSettingsFromMatches, getSiteTitleFromMatches, readPage } from "~/lib/public-context";
import { canonicalUrl } from "~/lib/site-urls";
import { buildCollectionGraph } from "~/lib/structured-data";
import { getDatabase } from "~/server/database.server";
import { getPublishedPosts } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  const origin = getSiteOriginFromMatches(matches);
  const settings = getSiteSettingsFromMatches(matches);
  const siteTitle = getSiteTitleFromMatches(matches);
  const description = settings?.siteDescription ?? "";
  const page = loaderData?.page ?? 1;
  const path = page > 1 ? `/?page=${page}` : "/";

  return [
    ...siteMeta(matches),
    { title: page > 1 ? `${siteTitle} · 第 ${page} 页` : siteTitle },
    { name: "description", content: description },
    ...(origin ? [{ tagName: "link", rel: "canonical", href: canonicalUrl(origin, "/", page) }] : []),
    ...(origin && settings && loaderData
      ? [{ "script:ld+json": buildCollectionGraph({ origin, path, name: siteTitle, description, posts: loaderData.posts }) }]
      : []),
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return getPublishedPosts(getDatabase(), readPage(url.searchParams));
}

export default function Home({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame stickySidebar={false}>
      <PostList data={loaderData} />
      <Pagination page={loaderData.page} totalPages={loaderData.totalPages} />
    </PublicPageFrame>
  );
}
