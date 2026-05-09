import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../types";

/** 仅做无副作用的 token 校验，用于读接口判断"是否管理员视图"。 */
export function isAdminAuthorized(c: Context<{ Bindings: Env }>): boolean {
  const token = c.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = c.req.header("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/.exec(header);
  return !!match && match[1] === token;
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const token = c.env.ADMIN_TOKEN;
  if (!token) {
    return c.json({ error: "Server is missing ADMIN_TOKEN configuration" }, 500);
  }
  if (!isAdminAuthorized(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
