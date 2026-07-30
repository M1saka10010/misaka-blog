import { getEnvironment } from "~/server/env.server";

export function getDatabase(): D1Database {
  return getEnvironment().DB;
}
