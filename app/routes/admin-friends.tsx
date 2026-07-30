import { useEffect, useState } from "react";
import { Form } from "react-router";
import type { Route } from "./+types/admin-friends";

import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { getAdminSiteTitle } from "~/server/admin-data.server";
import { assertSameOrigin, requireAdmin } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";
import {
  listAdminFriendLinks,
  normalizeHttpsUrl,
  normalizeOptionalHttpsUrl,
  type FriendLink,
} from "~/server/friend-links.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `友情链接 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

function readFriendLinkForm(form: FormData) {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const description = String(form.get("description") ?? "").trim().slice(0, 240);
  if (!name) throw new Error("站点名称不能为空");
  return {
    name,
    url: normalizeHttpsUrl(String(form.get("url") ?? "")),
    description,
    iconUrl: normalizeOptionalHttpsUrl(String(form.get("icon_url") ?? "")),
    sortOrder: Math.min(9999, Math.max(-9999, Math.round(Number(form.get("sort_order")) || 0))),
    isActive: form.get("is_active") === "on" ? 1 : 0,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const [links, siteTitle] = await Promise.all([
    listAdminFriendLinks(environment.DB),
    getAdminSiteTitle(environment.DB),
  ]);
  return { session, links, siteTitle };
}

export async function action({ request }: Route.ActionArgs) {
  const environment = getEnvironment();
  await requireAdmin(request, environment);
  assertSameOrigin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create");

  try {
    if (intent === "delete") {
      const id = Number(form.get("id"));
      if (!Number.isInteger(id) || id < 1) return { error: "友情链接不存在" };
      await environment.DB.prepare("DELETE FROM friend_links WHERE id = ?").bind(id).run();
      return { ok: true, message: "友情链接已删除。" };
    }

    const input = readFriendLinkForm(form);
    if (intent === "update") {
      const id = Number(form.get("id"));
      if (!Number.isInteger(id) || id < 1) return { error: "友情链接不存在" };
      await environment.DB.prepare(
        `UPDATE friend_links SET name = ?, url = ?, description = ?, icon_url = ?,
         sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(input.name, input.url, input.description, input.iconUrl, input.sortOrder, input.isActive, id).run();
      return { ok: true, message: "友情链接已保存。", updatedId: id };
    }

    await environment.DB.prepare(
      `INSERT INTO friend_links (name, url, description, icon_url, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(input.name, input.url, input.description, input.iconUrl, input.sortOrder, input.isActive).run();
    return { ok: true, message: "友情链接已添加。" };
  } catch (error) {
    const message = error instanceof Error && error.message.includes("UNIQUE")
      ? "这个链接已经存在"
      : error instanceof Error ? error.message : "操作失败，请稍后重试";
    return { error: message };
  }
}

const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100";

function LinkFields({ values }: { values?: { name: string; url: string; description: string; customIconUrl: string; sortOrder: number; isActive: boolean } }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="mb-2 block text-sm font-medium">站点名称</span><input name="name" required maxLength={80} defaultValue={values?.name} className={inputClass} /></label>
        <label><span className="mb-2 block text-sm font-medium">目标链接</span><input type="url" name="url" required placeholder="https://example.com/" defaultValue={values?.url} className={inputClass} /></label>
      </div>
      <label className="block"><span className="mb-2 block text-sm font-medium">简介</span><input name="description" maxLength={240} placeholder="一句话介绍这个网站" defaultValue={values?.description} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <label><span className="mb-2 block text-sm font-medium">自定义图标 URL</span><input type="url" name="icon_url" defaultValue={values?.customIconUrl} placeholder="留空则使用目标站 /favicon.ico" className={inputClass} /></label>
        <label><span className="mb-2 block text-sm font-medium">排序</span><input type="number" name="sort_order" defaultValue={values?.sortOrder ?? 0} min={-9999} max={9999} className={inputClass} /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" name="is_active" defaultChecked={values?.isActive ?? true} className="size-4 accent-violet-600" />公开显示</label>
      </div>
    </>
  );
}

function ExistingFriendLink({ friend, updateResult }: { friend: FriendLink; updateResult?: { updatedId?: number } }) {
  const [isEditing, setIsEditing] = useState(false);
  const editorId = `friend-link-editor-${friend.id}`;

  useEffect(() => {
    if (updateResult?.updatedId === friend.id) setIsEditing(false);
  }, [friend.id, updateResult]);

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-semibold">{friend.name}</h2>
            <span className={friend.isActive ? "text-xs text-emerald-700" : "text-xs text-slate-400"}>
              {friend.isActive ? "公开" : "隐藏"}
            </span>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-slate-400">{new URL(friend.url).hostname}</p>
          {friend.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{friend.description}</p> : null}
        </div>
        <button
          type="button"
          aria-expanded="false"
          aria-controls={editorId}
          onClick={() => setIsEditing(true)}
          className="min-h-11 shrink-0 self-start rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:self-auto"
        >
          编辑
        </button>
      </div>
    );
  }

  return (
    <Form id={editorId} method="post" className="space-y-5 px-5 py-5 sm:p-7">
      <input type="hidden" name="id" value={friend.id} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">编辑 {friend.name}</h2>
          <p className="mt-1 font-mono text-xs text-slate-400">{new URL(friend.url).hostname}</p>
        </div>
        <span className={friend.isActive ? "text-xs text-emerald-700" : "text-xs text-slate-400"}>{friend.isActive ? "公开" : "隐藏"}</span>
      </div>
      <LinkFields values={friend} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="submit"
          name="intent"
          value="delete"
          formNoValidate
          onClick={(event) => {
            if (!window.confirm(`删除友情链接“${friend.name}”？`)) event.preventDefault();
          }}
          className="min-h-11 px-3 text-sm font-medium text-slate-500 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          删除
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            取消
          </button>
          <button type="submit" name="intent" value="update" className="min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
            保存修改
          </button>
        </div>
      </div>
    </Form>
  );
}

export default function AdminFriends({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <AdminShell login={loaderData.session.github_login}>
      <AdminPageHeader title="友情链接" description="管理公开展示的网站列表；默认从目标站读取 favicon.ico。" />
      {actionData?.error ? <p className="mb-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionData.error}</p> : null}
      {actionData?.message ? <p className="mb-5 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{actionData.message}</p> : null}

      <Form method="post" className="space-y-5 border-y border-slate-200 bg-white p-5 sm:p-7">
        <input type="hidden" name="intent" value="create" />
        <h2 className="text-lg font-semibold">添加友情链接</h2>
        <LinkFields />
        <div className="flex justify-end"><button className="min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">添加链接</button></div>
      </Form>

      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200 bg-white">
        {loaderData.links.length ? loaderData.links.map((friend) => (
          <ExistingFriendLink key={friend.id} friend={friend} updateResult={actionData} />
        )) : <div className="px-5 py-14 text-center text-sm text-slate-500">还没有友情链接。</div>}
      </div>
    </AdminShell>
  );
}
