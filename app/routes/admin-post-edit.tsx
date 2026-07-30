import { Link, redirect } from "react-router";
import type { Route } from "./+types/admin-post-edit";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { PostEditorForm } from "~/components/post-editor-form";
import { getAdminPost, getAdminSiteTitle, listAdminTags, normalizeSlug, normalizeTagNames, updatePost } from "~/server/admin-data.server";
import { assertSameOrigin, requireAdmin } from "~/server/auth.server";
import { estimateReadingMinutes, renderArticleMarkdown, resolvePostSummary } from "~/server/markdown.server";
import { getEnvironment } from "~/server/env.server";

function getId(value: string | undefined) { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new Response("文章不存在", { status: 404 }); return id; }
export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.post.title ?? "编辑文章"} · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}
export async function loader({ request, params }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [post, availableTags, siteTitle] = await Promise.all([
    getAdminPost(environment.DB, getId(params.id)),
    listAdminTags(environment.DB),
    getAdminSiteTitle(environment.DB),
  ]);
  if (!post) throw new Response("文章不存在", { status: 404 });
  return { session, post, availableTags, siteTitle, saved: new URL(request.url).searchParams.has("saved") };
}
export async function action({ request, params }: Route.ActionArgs) {
  const environment = getEnvironment();
  await requireAdmin(request, environment); assertSameOrigin(request);
  const form = await request.formData();
  const postId = getId(params.id);
  if (form.get("intent") === "delete") {
    await environment.DB.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();
    throw redirect("/admin/posts?deleted=1");
  }
  const title = String(form.get("title") ?? "").trim(); const slug = normalizeSlug(String(form.get("slug") ?? "")); const markdown = String(form.get("markdown") ?? "");
  if (!title || !slug || !markdown.trim()) return { error: "标题、Slug 和正文不能为空" };
  await updatePost(environment.DB, postId, { title, slug, markdown, summary: resolvePostSummary(String(form.get("summary") ?? ""), markdown), status: form.get("status") === "published" ? "published" : "draft", tags: normalizeTagNames(form.getAll("tags").map(String)), renderedHtml: await renderArticleMarkdown(markdown), readingMinutes: estimateReadingMinutes(markdown) });
  throw redirect(`/admin/posts/${params.id}/edit?saved=1`);
}
export default function AdminPostEdit({ loaderData, actionData }: Route.ComponentProps) {
  return <AdminShell login={loaderData.session.github_login}><AdminPageHeader title="编辑文章" description={loaderData.saved ? "文章已保存。" : `最后更新：${loaderData.post.id}`} action={<Link to="/admin/posts" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">返回文章列表</Link>} />{actionData?.error ? <p className="mb-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionData.error}</p> : null}<PostEditorForm post={loaderData.post} availableTags={loaderData.availableTags} /></AdminShell>;
}
