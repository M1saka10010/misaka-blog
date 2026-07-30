import { Form } from "react-router";
import type { Route } from "./+types/admin-tags";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { getAdminSiteTitle, normalizeSlug } from "~/server/admin-data.server";
import { assertSameOrigin, requireAdmin } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `标签 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [tags, siteTitle] = await Promise.all([
    environment.DB.prepare(
      `SELECT tags.id, tags.name, tags.slug, COUNT(post_tags.post_id) AS post_count
       FROM tags LEFT JOIN post_tags ON post_tags.tag_id = tags.id
       GROUP BY tags.id ORDER BY post_count DESC, tags.name`,
    ).all<{ id: number; name: string; slug: string; post_count: number }>(),
    getAdminSiteTitle(environment.DB),
  ]);
  return { session, tags: tags.results, siteTitle };
}

export async function action({ request }: Route.ActionArgs) {
  const environment = getEnvironment();
  await requireAdmin(request, environment);
  assertSameOrigin(request, environment);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create");
  if (intent === "delete") {
    const id = Number(form.get("id"));
    if (Number.isInteger(id)) await environment.DB.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
    return { ok: true };
  }
  const name = String(form.get("name") ?? "").trim();
  const slug = normalizeSlug(String(form.get("slug") ?? name));
  if (!name || !slug) return { error: "标签名称和 Slug 不能为空" };
  await environment.DB.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)").bind(name, slug).run();
  return { ok: true };
}

export default function AdminTags({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <AdminShell login={loaderData.session.github_login}>
      <AdminPageHeader title="标签" description="管理文章分类入口。删除标签不会删除文章。" />
      {actionData?.error ? <p className="mb-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionData.error}</p> : null}
      <Form method="post" className="grid gap-3 border-y border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
        <input name="name" required placeholder="标签名称" className="min-h-11 rounded-lg border border-slate-300 px-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
        <input name="slug" placeholder="Slug（默认根据名称生成）" className="min-h-11 rounded-lg border border-slate-300 px-3 font-mono text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
        <button className="min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">添加标签</button>
      </Form>
      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200 bg-white">
        {loaderData.tags.length ? loaderData.tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div><p className="font-medium">{tag.name}</p><p className="mt-1 font-mono text-xs text-slate-400">/{tag.slug} · {tag.post_count} 篇文章</p></div>
            <Form method="post" onSubmit={(event) => { if (!window.confirm(`删除标签“${tag.name}”？文章不会被删除。`)) event.preventDefault(); }}>
              <input type="hidden" name="intent" value="delete" /><input type="hidden" name="id" value={tag.id} />
              <button className="min-h-10 px-3 text-sm text-slate-500 hover:text-rose-600">删除</button>
            </Form>
          </div>
        )) : <p className="px-5 py-12 text-center text-sm text-slate-500">还没有标签。</p>}
      </div>
    </AdminShell>
  );
}
