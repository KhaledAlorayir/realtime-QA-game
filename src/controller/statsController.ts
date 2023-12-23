import { Hono } from "hono";
import { authenticated, getUserId } from "lib/auth";

export const stats = new Hono();

stats.get("/", authenticated, (ctx) => {
  const userId = getUserId(ctx);
  return ctx.json({ hello: "world" });
});
