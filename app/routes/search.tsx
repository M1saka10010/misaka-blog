import { Form, type LoaderFunctionArgs, type MetaFunction } from "react-router";

import { Pagination } from "~/components/public/pagination";
import { PostList } from "~/components/public/post-list";
import { PublicPageFrame } from "~/components/public/public-page-frame";
import { SearchIcon } from "~/components/public/icons";
import { getSiteTitleFromMatches, readPage } from "~/lib/public-context";
import { getDatabase } from "~/server/database.server";
import { searchPublishedPosts } from "~/server/db/public";

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => [
  { title: `${loaderData?.query ? `搜索：${loaderData.query}` : "搜索"} · ${getSiteTitleFromMatches(matches)}` },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const posts = await searchPublishedPosts(getDatabase(), query, readPage(url.searchParams));
  return { query, posts };
}

export default function Search({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <PublicPageFrame>
      <Form method="get" className="mb-10 flex gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜索关键词</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={loaderData.query} autoFocus className="h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-4 text-base text-ink shadow-soft placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" placeholder="输入关键词" />
        </label>
        <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">搜索</button>
      </Form>
      {loaderData.query ? (
        <>
          <p className="mb-5 font-mono text-xs text-muted">“{loaderData.query}” 找到 {loaderData.posts.totalPosts} 篇文章</p>
          <PostList data={loaderData.posts} emptyMessage="没有找到匹配文章，试试更短或不同的关键词。" />
          <Pagination page={loaderData.posts.page} totalPages={loaderData.posts.totalPages} />
        </>
      ) : <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">输入关键词开始搜索。</div>}
    </PublicPageFrame>
  );
}
