import { categories, questions, quizzes } from "../connections/database/schema";

export type CreateCategory = typeof categories.$inferInsert;
export type Category = typeof categories.$inferSelect;

export interface CreateQuizWithQuestionsAndAnswers {
  categoryId: string;
  quizName: string;
  questions: {
    content: string;
    answers: {
      content: string;
      isCorrect: boolean;
    }[];
  }[];
}

export type Quiz = typeof quizzes.$inferSelect;
export interface PaginatedResponse<T> {
  page: number;
  hasNextPage: boolean;
  data: T[];
}

type AnswerDto = {
  isCorrect: boolean;
  content: string;
  id: string;
};

export interface SendQuestionBody {
  id: string;
  content: string;
  answers: Omit<AnswerDto, "isCorrect">[];
}

interface QuizJoinedBody {
  player1: UserData;
  player2: UserData;
  quizName: string;
}

export interface GameFinishedBody {
  winnerId: string | null;
  player1: UserScore;
  player2: UserScore;
}

export interface ServerToClientEvents {
  quizJoined: (body: QuizJoinedBody) => void;
  sendQuestion: (body: SendQuestionBody) => void;
  gameFinished: (body: GameFinishedBody) => void;
}

export interface ClientToServerEvents {
  joinQuiz: (body: { quizId: string }) => void;
  sendAnswer: (body: { answerId: string }) => void;
}

export interface UserData {
  userId: string;
  username: string;
  img: string;
}

export interface SocketInfo {
  userData: UserData;
  waitingOnQuizId: string | null;
  joinedRoom: string | null;
}

export interface UserScore {
  userId: string;
  score: number;
}

export interface QuestionWithAnswers extends SendQuestionBody {
  answers: AnswerDto[];
}

//turn into class
