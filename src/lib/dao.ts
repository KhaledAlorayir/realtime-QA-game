import { SQL, and, asc, desc, eq, ilike, like, sql } from "drizzle-orm";
import { db } from "../connections/database/db";
import {
  answers,
  categories,
  games,
  questions,
  quizzes,
  results,
} from "../connections/database/schema";
import {
  Category,
  CreateCategory,
  CreateGameAndResults,
  CreateQuizWithQuestionsAndAnswers,
  PaginatedResponse,
  Quiz,
} from "./types";
import { PaginationAndSearchRequest, PaginationRequest } from "./schema";
import { PgTableWithColumns, alias } from "drizzle-orm/pg-core";
import { CATEGORY, KEY_GENERATOR } from "./const";
import { redis } from "connections/redis";

class Dao {
  async createCategory(category: CreateCategory) {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async createQuizWithQuestionsAndAnswers(
    quiz: CreateQuizWithQuestionsAndAnswers
  ) {
    const [createdQuiz] = await db
      .insert(quizzes)
      .values({ name: quiz.quizName, categoryId: quiz.categoryId })
      .returning();

    for (let q of quiz.questions) {
      const [question] = await db
        .insert(questions)
        .values({ content: q.content, quizId: createdQuiz.id })
        .returning();

      await db
        .insert(answers)
        .values(
          q.answers.map((answer) => ({ ...answer, questionId: question.id }))
        );
    }
  }

  getCategories(
    paginationRequest: PaginationRequest
  ): Promise<PaginatedResponse<Category>> {
    return this.paginate(
      categories,
      undefined,
      desc(categories.createdAt),
      paginationRequest
    );
  }

  async getQuizzesByCategoryId(
    categoryId: string,
    { page, pageSize, q }: PaginationAndSearchRequest
  ): Promise<PaginatedResponse<Quiz>> {
    return this.paginate(
      quizzes,
      and(eq(quizzes.categoryId, categoryId), ilike(quizzes.name, `%${q}%`)),
      desc(quizzes.createdAt),
      {
        page,
        pageSize,
      }
    );
  }

  async getQuizzes({
    page,
    pageSize,
    q,
  }: PaginationAndSearchRequest): Promise<PaginatedResponse<Quiz>> {
    return this.paginate(
      quizzes,
      and(ilike(quizzes.name, `%${q}%`)),
      desc(quizzes.createdAt),
      {
        page,
        pageSize,
      }
    );
  }

  async categoryExistsById(categoryId: string) {
    return this.existsById(categories, categoryId);
  }

  async quizExistsById(quizId: string) {
    return this.existsById(quizzes, quizId);
  }

  async createGameAndResults(createGameAndResults: CreateGameAndResults) {
    const [game] = await db
      .insert(games)
      .values({ quizId: createGameAndResults.quizId })
      .returning();

    await db.insert(results).values(
      createGameAndResults.results.map((result) => ({
        ...result,
        gameId: game.id,
      }))
    );
  }

  @cache()
  getQuizWithQuestionsAndAnswersById(quizId: string) {
    return db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
      columns: {
        name: true,
        id: true,
      },
      with: {
        questions: {
          columns: {
            content: true,
            id: true,
          },
          with: {
            answers: {
              columns: {
                content: true,
                id: true,
                isCorrect: true,
              },
            },
          },
          orderBy: asc(questions.createdAt),
        },
      },
    });
  }

  async getWinsCountBetweenTwoPlayers(player1Id: string, player2Id: string) {
    const r1 = alias(results, "r1");
    const r2 = alias(results, "r2");

    const [data] = await db
      .select({
        player1Wins: sql<number>`COUNT(CASE WHEN r1.result_status = 'win' THEN 1 END)`,
        player2Wins: sql<number>`COUNT(CASE WHEN r2.result_status = 'win' THEN 1 END)`,
      })
      .from(r1)
      .innerJoin(r2, eq(r1.gameId, r2.gameId))
      .where(and(eq(r1.userId, player1Id), eq(r2.userId, player2Id)));

    return data ? data : null;
  }

  @cache(null)
  async getCategoryByName(category: CATEGORY) {
    const [results] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, category));
    return results;
  }

  //this can be enhanced by using dynamic queries
  //https://orm.drizzle.team/docs/dynamic-query-building
  //it will allow for pagiantion with anything including Joined Queries, for now this is fine for my use case
  private async paginate<T>(
    table: PgTableWithColumns<any>,
    conditions: SQL<unknown> | undefined,
    orderBy: SQL<unknown>,
    paginationRequest: PaginationRequest
  ): Promise<PaginatedResponse<T>> {
    const [countData] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(conditions);

    const numberOfPages = Math.ceil(
      countData.count / paginationRequest.pageSize
    );

    if (numberOfPages <= paginationRequest.page) {
      return {
        data: [],
        hasNextPage: false,
        page: paginationRequest.page,
      };
    }

    const results = await db
      .select()
      .from(table)
      .where(conditions)
      .limit(paginationRequest.pageSize)
      .offset(paginationRequest.page * paginationRequest.pageSize)
      .orderBy(orderBy);

    return {
      data: results as T[],
      hasNextPage: paginationRequest.page + 1 < numberOfPages,
      page: paginationRequest.page,
    };
  }

  private async existsById(table: PgTableWithColumns<any>, id: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(eq(table.id, id));

    return result.count > 0;
  }
}

export const dao = new Dao();

function cache(
  ttlOptions: { ttl: number; resetOnHit: boolean } | null = {
    ttl: 3600,
    resetOnHit: true,
  }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const key = KEY_GENERATOR.cacheKey(propertyKey, args);

      const results = await redis.get(key);

      if (!results) {
        const data = await originalMethod.apply(this, args);
        if (ttlOptions) {
          await redis.setEx(key, ttlOptions.ttl, JSON.stringify(data));
        } else {
          await redis.set(key, JSON.stringify(data));
        }
        return data;
      }

      if (ttlOptions?.resetOnHit) {
        await redis.expire(key, ttlOptions.ttl);
      }
      return JSON.parse(results);
    };

    return descriptor;
  };
}
