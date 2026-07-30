import { env } from "cloudflare:workers";

export function getEnvironment() {
  return env as unknown as CloudflareEnvironment;
}
