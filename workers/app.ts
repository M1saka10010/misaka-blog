import { createRequestHandler, RouterContextProvider } from "react-router";

declare global {
  interface CloudflareEnvironment {
    DB: D1Database;
    GITHUB_OAUTH_CLIENT_ID: string;
    GITHUB_OAUTH_CLIENT_SECRET: string;
    GITHUB_ALLOWED_LOGIN: string;
    GITHUB_ALLOWED_USER_ID?: string;
    SESSION_SECRET: string;
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const context = Object.assign(new RouterContextProvider(), {
      cloudflare: { env, ctx },
    });
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
