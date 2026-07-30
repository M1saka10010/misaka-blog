import { Link } from "react-router";
import type { Route } from "./+types/admin-index";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { requireAdmin } from "~/server/auth.server";
import { getSiteSettings } from "~/server/db/public";
import { getEnvironment } from "~/server/env.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `概览 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [settings, counts, recent] = await Promise.all([
    getSiteSettings(environment.DB),
    environment.DB.prepare(
      `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts FROM posts`,
    ).first<{ total: number; published: number; drafts: number }>(),
    environment.DB.prepare(
      "SELECT id, title, status, updated_at FROM posts ORDER BY updated_at DESC LIMIT 5",
    ).all<{ id: number; title: string; status: string; updated_at: string }>(),
  ]);
  return {
    session,
    siteTitle: settings.siteTitle,
    counts: counts ?? { total: 0, published: 0, drafts: 0 },
    recent: recent.results,
  };
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  return (
    <AdminShell login={loaderData.session.github_login}>
      <AdminPageHeader
        title="概览"
        description="从最近编辑的内容继续。"
        action={<Link to="/admin/posts/new" className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">新建文章</Link>}
      />
      <section className="border-y border-slate-200 bg-white">
        <dl className="grid grid-cols-3 divide-x divide-slate-200">
          {[
            ["全部文章", loaderData.counts.total],
            ["已发布", loaderData.counts.published],
            ["草稿", loaderData.counts.drafts],
          ].map(([label, value]) => (
            <div key={label} className="p-5 sm:p-7">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-2 font-mono text-2xl font-semibold">{Number(value ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">最近编辑</h2>
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {loaderData.recent.length ? loaderData.recent.map((post) => (
            <Link key={post.id} to={`/admin/posts/${post.id}/edit`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-violet-50/50">
              <span className="truncate font-medium">{post.title}</span>
              <span className="shrink-0 text-xs text-slate-500">{post.status === "published" ? "已发布" : "草稿"} · {post.updated_at.slice(0, 10)}</span>
            </Link>
          )) : <p className="px-5 py-10 text-sm text-slate-500">还没有文章。新建一篇草稿开始写作。</p>}
        </div>
      </section>
    </AdminShell>
  );
}
