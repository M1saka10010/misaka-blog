import { redirect } from "react-router";
import type { Route } from "./+types/admin-post-new";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { PostEditorForm } from "~/components/post-editor-form";
import { createPost, getAdminSiteTitle, listAdminTags, normalizeSlug, normalizeTagNames } from "~/server/admin-data.server";
import { assertSameOrigin, requireAdmin } from "~/server/auth.server";
import { estimateReadingMinutes, renderArticleMarkdown, resolvePostSummary } from "~/server/markdown.server";
import { getEnvironment } from "~/server/env.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `新建文章 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [availableTags, siteTitle] = await Promise.all([
    listAdminTags(environment.DB),
    getAdminSiteTitle(environment.DB),
  ]);
  return { session, availableTags, siteTitle };
}

export async function action({ request }: Route.ActionArgs) {
  const environment = getEnvironment();
  await requireAdmin(request, environment); assertSameOrigin(request);
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const slug = normalizeSlug(String(form.get("slug") ?? ""));
  const markdown = String(form.get("markdown") ?? "");
  if (!title || !slug || !markdown.trim()) return { error: "标题、Slug 和正文不能为空" };
  const id = await createPost(environment.DB, {
    title, slug, markdown,
    summary: resolvePostSummary(String(form.get("summary") ?? ""), markdown),
    status: form.get("status") === "published" ? "published" : "draft",
    tags: normalizeTagNames(form.getAll("tags").map(String)),
    renderedHtml: await renderArticleMarkdown(markdown),
    readingMinutes: estimateReadingMinutes(markdown),
  });
  throw redirect(`/admin/posts/${id}/edit?saved=1`);
}

export default function AdminPostNew({ loaderData, actionData }: Route.ComponentProps) {
  return <AdminShell login={loaderData.session.github_login}><AdminPageHeader title="新建文章" description="先保存为草稿，确认排版后再发布。" />{actionData?.error ? <p className="mb-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionData.error}</p> : null}<PostEditorForm availableTags={loaderData.availableTags} /></AdminShell>;
}
