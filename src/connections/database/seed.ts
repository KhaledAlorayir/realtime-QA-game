import { CATEGORY } from "lib/const";
import { dao } from "../../lib/dao";
import { db } from "./db";
import {
  categories,
  answers,
  questions,
  quizzes,
  results,
  games,
} from "./schema";
import { openTdbClient, type Result } from "../opentdbClient";
import { redis } from "../redis";

async function seedMasterData() {
  await db.delete(results);
  await db.delete(games);
  await db.delete(answers);
  await db.delete(questions);
  await db.delete(quizzes);
  await db.delete(categories);
  await redis.flushDb();

  await Promise.all(
    Object.values(CATEGORY).map(async (category) =>
      dao.createCategory({ name: category })
    )
  );
}

async function seedCategory() {
  const quiz = await openTdbClient.getTrivia({
    amount: 50,
    category: openTdbClient.API_CATEGORY.CELEBRITIES,
  });
  const category = CATEGORY.CELEBRITIES;

  if (quiz) {
    const chunkSize = 10;
    const chunks = [
      quiz.results.splice(0, chunkSize),
      quiz.results.splice(0, chunkSize),
      quiz.results.splice(0, chunkSize),
      quiz.results.splice(0, chunkSize),
      quiz.results.splice(0, chunkSize),
    ];

    const { id } = await dao.getCategoryByName(category);

    for (let i = 0; i < chunks.length; i++) {
      await dao.createQuizWithQuestionsAndAnswers(
        openTdbClient.mapToCreateQuiz(
          chunks[i],
          id,
          `${category} part ${i + 1}`
        )
      );
    }
  }
}

await seedMasterData();
// await seedCategory();
process.exit(0);
