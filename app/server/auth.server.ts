import { redirect } from "react-router";

const sessionCookieName = "misaka_session";
const oauthStateCookieName = "misaka_oauth_state";
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

type AppEnvironment = CloudflareEnvironment;

interface GitHubUser {
  id: number;
  login: string;
}

function parseCookies(request: Request) {
  const cookies = new Map<string, string>();
  for (const item of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    cookies.set(item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1).trim()));
  }
  return cookies;
}

function createCookie(name: string, value: string, options: { maxAge?: number; secure?: boolean } = {}) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.secure !== false) attributes.push("Secure");
  if (typeof options.maxAge === "number") attributes.push(`Max-Age=${options.maxAge}`);
  return attributes.join("; ");
}

function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function resolvePublicOrigin(request: Request, configuredUrl?: string) {
  const input = configuredUrl?.trim();
  if (!input) return new URL(request.url).origin;

  let publicUrl: URL;
  try {
    publicUrl = new URL(input);
  } catch {
    throw new Response("PUBLIC_SITE_URL 配置无效", { status: 503 });
  }
  if (
    !["http:", "https:"].includes(publicUrl.protocol) ||
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.pathname !== "/" ||
    publicUrl.search ||
    publicUrl.hash
  ) {
    throw new Response("PUBLIC_SITE_URL 必须是仅包含协议和域名的站点地址", { status: 503 });
  }
  return publicUrl.origin;
}

function callbackUrl(request: Request, env: AppEnvironment) {
  return new URL("/auth/github/callback", `${resolvePublicOrigin(request, env.PUBLIC_SITE_URL)}/`).toString();
}

function isSecureRequest(request: Request, env: AppEnvironment) {
  return new URL(resolvePublicOrigin(request, env.PUBLIC_SITE_URL)).protocol === "https:";
}

export function assertSameOrigin(request: Request, env: AppEnvironment) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== resolvePublicOrigin(request, env.PUBLIC_SITE_URL)) {
    throw new Response("请求来源无效", { status: 403 });
  }
}

export function beginGitHubLogin(request: Request, env: AppEnvironment) {
  if (!env.GITHUB_OAUTH_CLIENT_ID) {
    throw new Response("GitHub OAuth 尚未配置", { status: 503 });
  }
  const state = randomToken(24);
  const githubCallbackUrl = callbackUrl(request, env);
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", githubCallbackUrl);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);
  return redirect(authorizeUrl.toString(), {
    headers: {
      "Set-Cookie": createCookie(oauthStateCookieName, state, {
        maxAge: 600,
        secure: isSecureRequest(request, env),
      }),
      "Cache-Control": "private, no-store",
    },
  });
}

async function exchangeGitHubCode(request: Request, env: AppEnvironment, code: string) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(request, env),
    }),
  });
  if (!tokenResponse.ok) throw new Response("GitHub 登录暂时不可用", { status: 502 });
  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) throw new Response("GitHub 授权失败", { status: 401 });

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "misaka-blog-worker",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userResponse.ok) throw new Response("无法读取 GitHub 账户", { status: 502 });
  return (await userResponse.json()) as GitHubUser;
}

function isAllowedUser(user: GitHubUser, env: AppEnvironment) {
  const loginMatches = user.login.toLowerCase() === env.GITHUB_ALLOWED_LOGIN?.toLowerCase();
  const idMatches = !env.GITHUB_ALLOWED_USER_ID || String(user.id) === env.GITHUB_ALLOWED_USER_ID;
  return loginMatches && idMatches;
}

export async function finishGitHubLogin(request: Request, env: AppEnvironment) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseCookies(request).get(oauthStateCookieName);
  if (!code || !state || !expectedState || state !== expectedState) {
    throw new Response("登录状态已失效，请重新登录", { status: 400 });
  }

  const user = await exchangeGitHubCode(request, env, code);
  if (!isAllowedUser(user, env)) {
    throw new Response("该 GitHub 账户没有管理权限", { status: 403 });
  }

  const token = randomToken();
  const tokenHash = await hashToken(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_sessions
      (id, token_hash, github_user_id, github_login, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(sessionId, tokenHash, String(user.id), user.login, expiresAt)
    .run();

  return redirect("/admin", {
    headers: [
      [
        "Set-Cookie",
        createCookie(sessionCookieName, token, {
          maxAge: sessionLifetimeSeconds,
          secure: isSecureRequest(request, env),
        }),
      ],
      ["Set-Cookie", createCookie(oauthStateCookieName, "", { maxAge: 0, secure: isSecureRequest(request, env) })],
      ["Cache-Control", "private, no-store"],
    ],
  });
}

export async function getAdminSession(request: Request, env: AppEnvironment) {
  const token = parseCookies(request).get(sessionCookieName);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const session = await env.DB.prepare(
    `SELECT id, github_user_id, github_login, expires_at
     FROM admin_sessions
     WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{ id: string; github_user_id: string; github_login: string; expires_at: string }>();
  if (!session) return null;
  if (
    session.github_login.toLowerCase() !== env.GITHUB_ALLOWED_LOGIN?.toLowerCase() ||
    (env.GITHUB_ALLOWED_USER_ID && session.github_user_id !== env.GITHUB_ALLOWED_USER_ID)
  ) {
    return null;
  }
  env.DB.prepare("UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(session.id)
    .run()
    .catch(() => undefined);
  return session;
}

export async function requireAdmin(request: Request, env: AppEnvironment) {
  const session = await getAdminSession(request, env);
  if (!session) {
    const returnTo = new URL(request.url).pathname;
    throw redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

export async function logoutAdmin(request: Request, env: AppEnvironment) {
  assertSameOrigin(request, env);
  const token = parseCookies(request).get(sessionCookieName);
  if (token) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
      .bind(await hashToken(token))
      .run();
  }
  return redirect("/", {
    headers: {
      "Set-Cookie": createCookie(sessionCookieName, "", { maxAge: 0, secure: isSecureRequest(request, env) }),
      "Cache-Control": "private, no-store",
    },
  });
}
