import { dao } from "../../lib/dao";
import { db } from "./db";
import { categories, answers, questions, quizzes } from "./schema";

async function seed() {
  await db.delete(answers);
  await db.delete(questions);
  await db.delete(quizzes);
  await db.delete(categories);
  console.log("cleared db");

  const moviesCategory = await dao.createCategory({ name: "movies" });
  const boxingCategory = await dao.createCategory({ name: "boxing" });
  const mmaCategory = await dao.createCategory({ name: "mma" });
  const tvCategory = await dao.createCategory({ name: "tv" });
  const carsCategory = await dao.createCategory({ name: "cars" });
  const musicCategory = await dao.createCategory({ name: "music" });
  const videoGamesCategory = await dao.createCategory({ name: "video games" });

  console.log("created categories");
  await dao.createQuizWithQuestionsAndAnswers({
    quizName: "The Phantom Menace",
    categoryId: moviesCategory.id,
    questions: [
      // {
      //   content: `What planet, never previously mentioned in a "Star Wars" movie, is invaded by the Trade Federation in "The Phantom Menace"?`,
      //   answers: [
      //     { content: "Kamino", isCorrect: false },
      //     { content: "Sullust", isCorrect: false },
      //     { content: "Tatooine", isCorrect: false },
      //     { content: "Naboo", isCorrect: true },
      //   ],
      // },
      // {
      //   content: `What color is the Naboo Starfighter in "The Phantom Menace"?`,
      //   answers: [
      //     { content: "Yellow", isCorrect: true },
      //     { content: "Blue", isCorrect: false },
      //     { content: " White and Red", isCorrect: false },
      //     { content: "Black", isCorrect: false },
      //   ],
      // },
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

  console.log("created quiz and stuff");
}

seed();
