import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { Pagination } from "~/components/public/pagination";
import { PostList } from "~/components/public/post-list";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { getSiteTitleFromMatches, readPage } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { getPublishedPosts } from "~/server/db/public";

export const meta: MetaFunction = ({ matches }) => [
  { title: getSiteTitleFromMatches(matches) },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return getPublishedPosts(getDatabase(), readPage(url.searchParams));
}

export default function Home({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      <PostList data={loaderData} />
      <Pagination page={loaderData.page} totalPages={loaderData.totalPages} />
    </PublicPageFrame>
  );
}
