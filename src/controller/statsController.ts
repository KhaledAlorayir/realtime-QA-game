import { Hono } from "hono";
import { auth } from "lib/auth";

export const stats = new Hono();

stats.get("/", auth, (ctx) => {
  console.log(ctx.get("authId"));
  return ctx.json({ hello: "world" });
});
