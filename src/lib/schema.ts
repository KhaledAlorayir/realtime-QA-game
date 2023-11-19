import { z } from "zod";
import { dao } from "./dao";

export const GetQuizzesParamsSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .uuid({ message: "invalid category id" })
    .transform(async (categoryId, ctx) => {
      const exist = await dao.categoryExistsById(categoryId);
      if (!exist) {
        ctx.addIssue({
          message: "invalid category id",
          code: z.ZodIssueCode.custom,
        });
      }
      return categoryId;
    }),
});

export const IdSchema = z.string().trim().uuid({ message: "invalid id" });

export const QuizIdSchema = IdSchema.transform(async (quizId, ctx) => {
  const exist = await dao.quizExistsById(quizId);
  if (!exist) {
    ctx.addIssue({
      message: "invalid quiz id",
      code: z.ZodIssueCode.custom,
    });
  }
  return quizId;
});

export const PaginationRequestSchema = z.object({
  page: z.string().pipe(z.coerce.number().nonnegative()).default("0"),
  pageSize: z.string().pipe(z.coerce.number().nonnegative()).default("10"),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
