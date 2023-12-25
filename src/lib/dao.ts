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
import { CATEGORY } from "./const";
import { cache } from "./util";

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
        player1Wins: sql<number>`cast(COUNT(CASE WHEN r1.result_status = 'win' THEN 1 END) as int)`,
        player2Wins: sql<number>`cast(COUNT(CASE WHEN r2.result_status = 'win' THEN 1 END) as int)`,
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

  async getResultCountsByUserId(userId: string) {
    const [data] = await db
      .select({
        wins: sql<number>`cast(COUNT(CASE WHEN ${results.status} = 'win' THEN 1 END) as int)`,
        loses: sql<number>`cast(COUNT(CASE WHEN ${results.status} = 'lose' THEN 1 END) as int)`,
        draws: sql<number>`cast(COUNT(CASE WHEN ${results.status} = 'draw' THEN 1 END) as int)`,
      })
      .from(results)
      .where(eq(results.userId, userId));
    return data;
  }

  async getMostPlayedCategoriesByUserId(userId: string) {
    const data = await db
      .select({
        gamesPlayed: sql<number>`cast(count(${results.id}) as int) as gamesPlayed`,
        categoryName: categories.name,
      })
      .from(results)
      .innerJoin(games, eq(games.id, results.gameId))
      .innerJoin(quizzes, eq(quizzes.id, games.quizId))
      .innerJoin(categories, eq(categories.id, quizzes.categoryId))
      .where(eq(results.userId, userId))
      .groupBy(categories.name)
      .orderBy(sql`gamesPlayed desc`)
      .limit(3);
    return data;
  }

  async getCategoryWithMostWinsByUserId(userId: string) {
    const [data] = await db
      .select({
        gamesWon: sql<number>`cast(count(CASE WHEN ${results.status} = 'win' THEN 1 END) as int) as gamesWon`,
        categoryName: categories.name,
      })
      .from(results)
      .innerJoin(games, eq(games.id, results.gameId))
      .innerJoin(quizzes, eq(quizzes.id, games.quizId))
      .innerJoin(categories, eq(categories.id, quizzes.categoryId))
      .where(eq(results.userId, userId))
      .groupBy(categories.name)
      .orderBy(sql`gamesWon desc`)
      .limit(1);
    return data;
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
      .select({ count: sql<number>`cast(count(*) as int)` })
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
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(table)
      .where(eq(table.id, id));

    return !!result.count;
  }
}

export const dao = new Dao();
