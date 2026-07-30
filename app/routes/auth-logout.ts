import type { Route } from "./+types/auth-logout";
import { logoutAdmin } from "~/server/auth.server";
import { getEnvironment } from "~/server/env.server";

export function action({ request }: Route.ActionArgs) {
  return logoutAdmin(request, getEnvironment());
}
