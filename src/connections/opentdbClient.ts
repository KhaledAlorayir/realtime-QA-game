import { CreateQuizWithQuestionsAndAnswers } from "lib/types";
import shuffle from "lodash.shuffle";

const basePath = "https://opentdb.com/api.php";

interface ApiRequest {
  amount: number;
  category: API_CATEGORY;
}

interface ApiResponse {
  response_code: number;
  results: Result[];
}

export interface Result {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

enum API_CATEGORY {
  GENERAL_KNOWLEDGE = 9,
  BOOKS = 10,
  FILM = 11,
  MUSIC = 12,
  TV = 14,
  VIDEO_GAMES = 15,
  NATURE = 17,
  COMPUTERS = 18,
  SPORT = 21,
  GEOGRAPHY = 22,
  HISTORY = 23,
  CELEBRITIES = 26,
  ANIMALS = 27,
}

async function getTrivia(request: ApiRequest) {
  try {
    const params = new URLSearchParams({
      amount: request.amount.toString(),
      category: request.category.toString(),
    });

    const results = await fetch(`${basePath}?${params}`);

    if (!results.ok) {
      console.log(results);
      throw new Error("ops");
    }

    return (await results.json()) as ApiResponse;
  } catch (error) {
    console.log(error);
  }
}

function mapToCreateQuiz(
  questions: Result[],
  categoryId: string,
  quizName: string
): CreateQuizWithQuestionsAndAnswers {
  return {
    categoryId,
    quizName,
    questions: questions.map((q) => ({
      content: q.question,
      answers: shuffle([
        ...q.incorrect_answers.map((a) => ({ content: a, isCorrect: false })),
        { content: q.correct_answer, isCorrect: true },
      ]),
    })),
  };
}

export const openTdbClient = { API_CATEGORY, getTrivia, mapToCreateQuiz };
