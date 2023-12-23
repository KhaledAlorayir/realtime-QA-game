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

async function things() {
  const { id } = await dao.getCategoryByName(CATEGORY.MOVIES);

  await dao.createQuizWithQuestionsAndAnswers({
    quizName: "The Phantom Menace",
    categoryId: id,
    questions: [
      {
        content: `In "The Phantom Menace", Jar Jar is a Gungan.`,
        answers: [
          { content: "True", isCorrect: true },
          { content: "False", isCorrect: false },
        ],
      },
      {
        content: `How many action sequences take place simultaneously towards the end of "The Phantom Menace"?`,
        answers: [
          { content: "1", isCorrect: false },
          { content: "2", isCorrect: false },
          { content: "4", isCorrect: true },
          { content: "8", isCorrect: false },
        ],
      },
      {
        content: `How long did Padmé serve as queen?`,
        answers: [
          { content: "4 years", isCorrect: false },
          { content: "8 years", isCorrect: true },
          { content: "6 years", isCorrect: false },
          { content: "1 years", isCorrect: false },
        ],
      },
    ],
  });
}

await seedMasterData();
// await seedCategory();
process.exit(0);
