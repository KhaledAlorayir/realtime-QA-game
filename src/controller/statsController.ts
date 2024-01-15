import { Hono } from "hono";
import { auth } from "../lib/auth";
import { dao } from "../lib/dao";

const hono = new Hono();

export const stats = hono.get("/", auth, async (ctx) => {
  const resultsCount = await dao.getResultCountsByUserId(ctx.get("authId"));
  const mostPlayedCategories = await dao.getMostPlayedCategoriesByUserId(
    ctx.get("authId")
  );
  const categoryWithMostWins = await dao.getCategoryWithMostWinsByUserId(
    ctx.get("authId")
  );
  return ctx.json({
    resultsCount: Object.keys(resultsCount).map((key) => ({
      label: key,
      //@ts-ignore
      value: resultsCount[key] as number,
    })),
    mostPlayedCategories,
    categoryWithMostWins,
  });
});
