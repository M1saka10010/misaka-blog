import { Link, redirect } from "react-router";
import type { Route } from "./+types/admin-login";
import { getAdminSiteTitle } from "~/server/admin-data.server";
import { getAdminSession } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `登录管理后台 · ${loaderData?.siteTitle ?? "MISAKA.LOG"}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const environment = getEnvironment();
  const session = await getAdminSession(request, environment);
  if (session) throw redirect("/admin");
  return {
    configured: Boolean(environment.GITHUB_OAUTH_CLIENT_ID),
    siteTitle: await getAdminSiteTitle(environment.DB),
  };
}

export default function AdminLogin({ loaderData }: Route.ComponentProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
      <section className="w-full max-w-sm border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-black/30">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violet-500 text-xl font-bold">⌁</div>
          <p className="mt-6 font-mono text-xs tracking-widest text-violet-300">MISAKA.LOG</p>
          <h1 className="mt-2 text-2xl font-semibold">登录博客管理后台</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">仅环境变量中允许的 GitHub 账户可以进入。</p>
        </div>
        {loaderData.configured ? (
          <a
            href="/auth/github"
            className="mt-8 flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            使用 GitHub 登录
          </a>
        ) : (
          <div className="mt-8 border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-200">
            GitHub OAuth 尚未配置。请先复制 `.dev.vars.example` 并填写本地变量。
          </div>
        )}
        <Link to="/" className="mt-5 block text-center text-sm text-slate-400 hover:text-white">← 返回博客</Link>
      </section>
    </main>
  );
}
