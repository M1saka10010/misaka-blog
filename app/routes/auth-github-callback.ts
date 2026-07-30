import type { Route } from "./+types/auth-github-callback";
import { finishGitHubLogin } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";

export function loader({ request }: Route.LoaderArgs) {
  return finishGitHubLogin(request, getEnvironment());
}
