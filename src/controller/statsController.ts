import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "lib/auth";
import { dao } from "lib/dao";

const hono = new Hono().use(cors());

export const stats = hono.get("/", auth, async (ctx) => {
  const resultsCount = await dao.getResultCountsByUserId(ctx.get("authId"));
  const mostPlayedCategories = await dao.getMostPlayedCategoriesByUserId(
    ctx.get("authId")
  );
  const categoryWithMostWins = await dao.getCategoryWithMostWinsByUserId(
    ctx.get("authId")
  );
  return ctx.json({
    resultsCount,
    mostPlayedCategories,
    categoryWithMostWins,
  });
});
