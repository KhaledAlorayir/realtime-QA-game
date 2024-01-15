import { Hono } from "hono";
import { dao } from "../lib/dao";
import { zValidator } from "@hono/zod-validator";
import {
  GetQuizzesParamsSchema,
  PaginationAndSearchRequestSchema,
  PaginationRequestSchema,
} from "../lib/schema";
import { validatorHook } from "../lib/util";

const hono = new Hono();

export const categories = hono
  .get(
    "/",
    zValidator("query", PaginationRequestSchema, validatorHook),
    async (ctx) => {
      const categories = await dao.getCategories(ctx.req.valid("query"));
      return ctx.json(categories);
    }
  )
  .get(
    "/:categoryId/quizzes",
    zValidator("param", GetQuizzesParamsSchema, validatorHook),
    zValidator("query", PaginationAndSearchRequestSchema, validatorHook),
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
