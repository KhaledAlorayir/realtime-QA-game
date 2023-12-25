import { Hono } from "hono";
import { auth } from "lib/auth";
import { dao } from "lib/dao";

export const stats = new Hono();

stats.get("/", auth, async (ctx) => {
  const resultsCount = await dao.getResultCountsByUserId(ctx.get("authId"));
  const mostPlayedCategories = await dao.getMostPlayedCategoriesByUserId(
    ctx.get("authId")
  );
  const categoryWithMostWins = await dao.getCategoryWithMostWinsByUserId(
    ctx.get("authId")
  );
  return ctx.json({ resultsCount, mostPlayedCategories, categoryWithMostWins });
});
