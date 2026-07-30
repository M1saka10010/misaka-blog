export function resolvePublicRequest(request: Request, configuredUrl?: string): Request {
  const publicSiteUrl = configuredUrl?.trim();
  if (!publicSiteUrl) return request;

  let publicOrigin: string;
  try {
    const parsedUrl = new URL(publicSiteUrl);
    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== "/" ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      return request;
    }
    publicOrigin = parsedUrl.origin;
  } catch {
    return request;
  }

  const incomingUrl = new URL(request.url);
  if (incomingUrl.origin === publicOrigin) return request;
  return new Request(new URL(`${incomingUrl.pathname}${incomingUrl.search}`, `${publicOrigin}/`), request);
}
