import { openTdbClient } from "connections/opentdbClient";
import { CATEGORY } from "lib/const";
import { dao } from "lib/dao";

async function generateQuizzes() {
  const quiz = await openTdbClient.getTrivia({
    amount: 50,
    category: openTdbClient.API_CATEGORY.VIDEO_GAMES,
  });
  const category = CATEGORY.VIDEO_GAMES;

  if (quiz) {
    const chunkSize = 3;
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

await generateQuizzes();
process.exit(0);
