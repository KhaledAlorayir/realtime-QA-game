import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { PaginationAndSearchRequestSchema } from "lib/schema";
import { validatorHook } from "lib/util";
import { dao } from "../lib/dao";
import { cors } from "hono/cors";

const hono = new Hono().use(cors());

export const quizzes = hono.get(
  "/",
  zValidator("query", PaginationAndSearchRequestSchema, validatorHook),
  async (ctx) => {
    const quizzes = await dao.getQuizzes(ctx.req.valid("query"));
    return ctx.json(quizzes);
  }
);
