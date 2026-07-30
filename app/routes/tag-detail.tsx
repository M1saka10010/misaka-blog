import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { PageHeading } from "~/components/public/page-heading";
import { Pagination } from "~/components/public/pagination";
import { PostList } from "~/components/public/post-list";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { getSiteTitleFromMatches, readPage } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { getPostsByTag, getTagBySlug } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => [
  { title: `${loaderData ? `#${loaderData.tag.name}` : "标签不存在"} · ${getSiteTitleFromMatches(matches)}` },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const slug = params.slug;
  if (!slug) throw new Response("标签不存在", { status: 404 });
  const db = getDatabase();
  const tag = await getTagBySlug(db, slug);
  if (!tag) throw new Response("标签不存在", { status: 404 });
  const url = new URL(request.url);
  const posts = await getPostsByTag(db, slug, readPage(url.searchParams));
  return { tag, posts };
}

export default function TagDetail({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      <PageHeading eyebrow="Topic archive" title={`#${loaderData.tag.name}`} description={`共 ${loaderData.tag.postCount} 篇已发布文章。`} />
      <PostList data={loaderData.posts} emptyMessage="这个标签下暂时没有已发布文章。" />
      <Pagination page={loaderData.posts.page} totalPages={loaderData.posts.totalPages} />
    </PublicPageFrame>
  );
}
