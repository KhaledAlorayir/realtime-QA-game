import { Hono } from "hono";
import { dao } from "../lib/dao";
import { zValidator } from "@hono/zod-validator";
import { GetQuizzesParamsSchema, PaginationRequestSchema } from "../lib/schema";
import { validatorHook } from "../lib/util";

export const categories = new Hono();

categories.get(
  "/",
  zValidator("query", PaginationRequestSchema, validatorHook),
  async (ctx) => {
    const categories = await dao.getCategories(ctx.req.valid("query"));
    return ctx.json(categories);
  }
);

categories.get(
  "/:categoryId/quizzes",
  zValidator("param", GetQuizzesParamsSchema, validatorHook),
  zValidator("query", PaginationRequestSchema, validatorHook),
  async (ctx) => {
    const quizzes = await dao.getQuizzesByCategoryId(
      ctx.req.valid("param").categoryId,
      ctx.req.valid("query")
    );

    return ctx.json({
      ...quizzes,
      data: quizzes.data.map(({ id, name, createdAt }) => ({
        id,
        name,
        createdAt,
      })),
    });
  }
);
