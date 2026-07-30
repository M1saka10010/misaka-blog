import type { Route } from "./+types/auth-github";
import { beginGitHubLogin } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";

export function loader({ request }: Route.LoaderArgs) {
  return beginGitHubLogin(request, getEnvironment());
}
