import { Link } from "react-router";
import type { Route } from "./+types/admin-posts";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { requireAdmin } from "~/server/auth.server";
import { getAdminSiteTitle, listAdminPosts } from "~/server/admin-data.server";
import { getEnvironment } from "~/server/env.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `文章 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [posts, siteTitle] = await Promise.all([
    listAdminPosts(environment.DB),
    getAdminSiteTitle(environment.DB),
  ]);
  return { session, posts, siteTitle, deleted: new URL(request.url).searchParams.has("deleted") };
}

export default function AdminPosts({ loaderData }: Route.ComponentProps) {
  return (
    <AdminShell login={loaderData.session.github_login}>
      <AdminPageHeader title="文章" description={`共 ${loaderData.posts.length} 篇内容`} action={<Link to="/admin/posts/new" className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">新建文章</Link>} />
      {loaderData.deleted ? <p className="mb-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">文章已删除。</p> : null}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        {loaderData.posts.length ? (
          <table className="w-full min-w-2xl text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">标题</th><th className="px-5 py-3 font-medium">状态</th><th className="px-5 py-3 font-medium">更新时间</th><th className="px-5 py-3"><span className="sr-only">操作</span></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loaderData.posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-medium">{post.title}</p><p className="mt-1 font-mono text-xs text-slate-400">/{post.slug}</p></td><td className="px-5 py-4"><span className={post.status === "published" ? "text-emerald-700" : "text-amber-700"}>{post.status === "published" ? "已发布" : "草稿"}</span></td><td className="px-5 py-4 text-slate-500">{post.updated_at.slice(0, 16).replace("T", " ")}</td><td className="px-5 py-4 text-right"><Link to={`/admin/posts/${post.id}/edit`} className="font-medium text-violet-700 hover:underline">编辑</Link></td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className="px-5 py-16 text-center"><p className="text-slate-500">还没有文章。</p><Link to="/admin/posts/new" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">新建第一篇草稿 →</Link></div>}
      </div>
    </AdminShell>
  );
}
