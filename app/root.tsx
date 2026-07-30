import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getEnvironment } from "~/server/env.server";

export async function loader({}: Route.LoaderArgs) {
  const settings = await getEnvironment().DB.prepare("SELECT favicon_url FROM site_settings WHERE id = 1")
    .first<{ favicon_url: string }>();
  return { faviconUrl: settings?.favicon_url ?? "" };
}

export const meta: Route.MetaFunction = () => [
  { title: "MISAKA.LOG" },
  { name: "description", content: "记录代码、生活，以及偶尔出现的二次元观察。" },
  { name: "theme-color", content: "#f7f8fc" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {loaderData?.faviconUrl ? <link rel="icon" href={loaderData.faviconUrl} /> : null}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = "500";
  let title = "页面暂时无法打开";
  let detail = "读取内容时发生了意外错误，请稍后重试。";

  if (isRouteErrorResponse(error)) {
    status = String(error.status);
    title = error.status === 404 ? "没有找到这个页面" : "页面暂时无法打开";
    detail = error.status === 404 ? "链接可能已经失效，或内容还没有发布。" : error.statusText || detail;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-5 py-16 text-ink">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-8 shadow-soft md:p-12">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">Error {status}</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">{detail}</p>
        <Link to="/" className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">返回首页</Link>
      </div>
    </main>
  );
}
