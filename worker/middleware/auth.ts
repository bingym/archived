import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const token = c.env.ADMIN_TOKEN;
  if (!token) {
    return c.json({ error: "Server is missing ADMIN_TOKEN configuration" }, 500);
  }
  const header = c.req.header("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match || match[1] !== token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
