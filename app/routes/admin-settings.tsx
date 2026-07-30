import { useState } from "react";
import { Form } from "react-router";
import type { Route } from "./+types/admin-settings";
import { AdminPageHeader, AdminShell } from "~/components/admin-shell";
import { MarkdownEditor } from "~/components/markdown-editor";
import { assertSameOrigin, requireAdmin } from "~/server/auth.server";
import { renderProfileMarkdown } from "~/server/markdown.server";
import { getEnvironment } from "~/server/env.server";
import { normalizeSettingsHttpsUrl, SettingsValidationError } from "~/server/settings-validation.server";

interface SettingsRow {
  site_title: string; site_description: string; favicon_url: string; avatar_url: string; profile_handle: string;
  profile_markdown: string; background_url: string; background_position_x: number; background_position_y: number;
  mobile_background_position_x: number; mobile_background_position_y: number; background_overlay: number;
  github_url: string; email: string; theme_mode: "system" | "light" | "dark";
}

const defaultSettings: SettingsRow = { site_title: "MISAKA.LOG", site_description: "记录代码、生活，以及偶尔出现的二次元观察。", favicon_url: "", avatar_url: "", profile_handle: "", profile_markdown: "", background_url: "", background_position_x: 50, background_position_y: 50, mobile_background_position_x: 50, mobile_background_position_y: 30, background_overlay: 48, github_url: "", email: "", theme_mode: "system" };
function boundedNumber(form: FormData, name: string, fallback: number, max = 100) { const value = Number(form.get(name)); return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : fallback; }

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await requireAdmin(request, environment);
  const settings = await environment.DB.prepare("SELECT * FROM site_settings WHERE id = 1").first<SettingsRow>();
  return { session, settings: settings ?? defaultSettings, saved: new URL(request.url).searchParams.has("saved") };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `站点设置 · ${loaderData?.settings.site_title ?? "MISAKA.LOG"}` }];
}
export async function action({ request }: Route.ActionArgs) {
  const environment = getEnvironment();
  await requireAdmin(request, environment); assertSameOrigin(request); const form = await request.formData();
  const profileMarkdown = String(form.get("profile_markdown") ?? "");
  let avatarUrl: string;
  let backgroundUrl: string;
  let faviconUrl: string;
  let githubUrl: string;
  try {
    avatarUrl = normalizeSettingsHttpsUrl(form.get("avatar_url"), "Avatar URL");
    backgroundUrl = normalizeSettingsHttpsUrl(form.get("background_url"), "背景图片 URL");
    faviconUrl = normalizeSettingsHttpsUrl(form.get("favicon_url"), "Favicon URL");
    githubUrl = normalizeSettingsHttpsUrl(form.get("github_url"), "GitHub URL");
  } catch (error) {
    if (error instanceof SettingsValidationError) return { error: error.message };
    throw error;
  }
  await environment.DB.prepare(
    `UPDATE site_settings SET site_title = ?, site_description = ?, favicon_url = ?, avatar_url = ?, profile_handle = ?,
     profile_markdown = ?, profile_rendered_html = ?, background_url = ?, background_position_x = ?,
     background_position_y = ?, mobile_background_position_x = ?, mobile_background_position_y = ?,
     background_overlay = ?, github_url = ?, email = ?, theme_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
  ).bind(
    String(form.get("site_title") ?? "MISAKA.LOG").trim(), String(form.get("site_description") ?? "").trim(),
    faviconUrl, avatarUrl, String(form.get("profile_handle") ?? "").trim(), profileMarkdown,
    await renderProfileMarkdown(profileMarkdown), backgroundUrl,
    boundedNumber(form, "background_position_x", 50), boundedNumber(form, "background_position_y", 50),
    boundedNumber(form, "mobile_background_position_x", 50), boundedNumber(form, "mobile_background_position_y", 30),
    boundedNumber(form, "background_overlay", 48, 90), githubUrl,
    String(form.get("email") ?? "").trim(), ["light", "dark"].includes(String(form.get("theme_mode"))) ? String(form.get("theme_mode")) : "system",
  ).run();
  return Response.redirect(new URL("/admin/settings?saved=1", request.url), 303);
}

const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100";

function BackgroundSettings({ settings }: { settings: SettingsRow }) {
  const [backgroundUrl, setBackgroundUrl] = useState(settings.background_url);
  const [desktopX, setDesktopX] = useState(settings.background_position_x);
  const [desktopY, setDesktopY] = useState(settings.background_position_y);
  const [mobileX, setMobileX] = useState(settings.mobile_background_position_x);
  const [mobileY, setMobileY] = useState(settings.mobile_background_position_y);
  const [overlay, setOverlay] = useState(settings.background_overlay);

  const previewBackground = backgroundUrl.trim()
    ? `linear-gradient(rgba(13,15,22,${overlay / 100}),rgba(13,15,22,${overlay / 100})),url(${JSON.stringify(backgroundUrl.trim())})`
    : undefined;

  const sliders = [
    { name: "background_position_x", label: "桌面焦点 X", value: desktopX, max: 100, update: setDesktopX },
    { name: "background_position_y", label: "桌面焦点 Y", value: desktopY, max: 100, update: setDesktopY },
    { name: "mobile_background_position_x", label: "移动焦点 X", value: mobileX, max: 100, update: setMobileX },
    { name: "mobile_background_position_y", label: "移动焦点 Y", value: mobileY, max: 100, update: setMobileY },
    { name: "background_overlay", label: "遮罩强度", value: overlay, max: 90, update: setOverlay },
  ];

  return (
    <section className="border-y border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-semibold">站点背景</h2>
      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-medium">背景图片 URL</span>
        <input
          type="url"
          name="background_url"
          value={backgroundUrl}
          onChange={(event) => setBackgroundUrl(event.target.value)}
          placeholder="https://..."
          className={inputClass}
        />
      </label>

      {previewBackground ? (
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">桌面预览</p>
            <div
              className="aspect-[16/7] overflow-hidden rounded-lg bg-slate-200 bg-cover bg-no-repeat"
              style={{ backgroundImage: previewBackground, backgroundPosition: `${desktopX}% ${desktopY}%` }}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">移动端预览</p>
            <div
              className="mx-auto aspect-[9/16] w-full max-w-48 overflow-hidden rounded-lg bg-slate-200 bg-cover bg-no-repeat"
              style={{ backgroundImage: previewBackground, backgroundPosition: `${mobileX}% ${mobileY}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid aspect-[16/7] place-items-center rounded-lg bg-slate-100 text-sm text-slate-500">
          输入背景 URL 后即可预览
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sliders.map((slider) => (
          <label key={slider.name}>
            <span className="mb-2 flex justify-between text-sm font-medium">
              <span>{slider.label}</span>
              <output htmlFor={slider.name}>{slider.value}%</output>
            </span>
            <input
              id={slider.name}
              type="range"
              name={slider.name}
              value={slider.value}
              min="0"
              max={slider.max}
              onChange={(event) => slider.update(Number(event.target.value))}
              className="w-full accent-violet-600"
            />
          </label>
        ))}
        <label>
          <span className="mb-2 block text-sm font-medium">默认主题</span>
          <select name="theme_mode" defaultValue={settings.theme_mode} className={inputClass}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export default function AdminSettings({ loaderData, actionData }: Route.ComponentProps) {
  const settings = loaderData.settings;
  return (
    <AdminShell login={loaderData.session.github_login}>
      <AdminPageHeader title="站点设置" description={loaderData.saved ? "设置已保存。" : "个人资料、背景与公开站点信息。"} />
      {actionData?.error ? <div role="alert" className="mb-6 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionData.error}</div> : null}
      <Form method="post" className="space-y-10">
        <section className="border-y border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold">基本信息</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-medium">站点标题</span><input name="site_title" defaultValue={settings.site_title} required className={inputClass} /></label><label><span className="mb-2 block text-sm font-medium">个人短标识</span><input name="profile_handle" defaultValue={settings.profile_handle} placeholder="@misaka-blog" className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">站点描述</span><input name="site_description" defaultValue={settings.site_description} className={inputClass} /></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">Favicon URL</span><input type="url" name="favicon_url" defaultValue={settings.favicon_url} placeholder="https://example.com/favicon.ico" className={inputClass} /><span className="mt-1.5 block text-xs text-slate-400">支持 ICO、PNG 或 SVG 等浏览器可识别的 HTTPS 图片地址</span></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">Avatar 图床 URL</span><input type="url" name="avatar_url" defaultValue={settings.avatar_url} placeholder="https://..." className={inputClass} /></label><label><span className="mb-2 block text-sm font-medium">GitHub URL</span><input type="url" name="github_url" defaultValue={settings.github_url} placeholder="https://github.com/..." className={inputClass} /></label><label><span className="mb-2 block text-sm font-medium">联系邮箱</span><input type="email" name="email" defaultValue={settings.email} className={inputClass} /></label></div><div className="mt-6"><span className="mb-2 block text-sm font-medium">个人简介</span><MarkdownEditor name="profile_markdown" initialMarkdown={settings.profile_markdown} compact /></div></section>
        <BackgroundSettings settings={settings} />
        <div className="sticky bottom-4 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><button className="min-h-11 rounded-lg bg-violet-600 px-6 text-sm font-semibold text-white hover:bg-violet-700">保存设置</button></div>
      </Form>
    </AdminShell>
  );
}
