import { categories, quizzes, results } from "../connections/database/schema";

export type CreateCategory = typeof categories.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type ResultStatus = typeof results.$inferInsert.status;

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

export interface CreateGameAndResults {
  quizId: string;
  results: {
    userId: string;
    score: number;
    status: ResultStatus;
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
  player1: UserData & WinCount;
  player2: UserData & WinCount;
  quizName: string;
  numberOfQuestions: number;
}

interface WinCount {
  wins: number | null;
}

export interface GameFinishedBody {
  winnerId: string | null;
  player1: UserScore;
  player2: UserScore;
}

export interface SendPlayerAnswerBody {
  playerId: string;
  answerId: string;
}

export interface SendCorrectAnswerBody {
  answerId: string;
}

export interface ServerToClientEvents {
  quizJoined: (body: QuizJoinedBody) => void;
  sendQuestion: (body: SendQuestionBody) => void;
  gameFinished: (body: GameFinishedBody) => void;
  sendPlayerAnswer: (body: SendPlayerAnswerBody) => void;
  sendCorrectAnswer: (body: SendCorrectAnswerBody) => void;
  opponentLeftGame: () => void;
}

export interface ClientToServerEvents {
  joinQuiz: (body: { quizId: string }) => void;
  sendAnswer: (body: { answerId: string }) => void;
  leaveWaitingList: () => void;
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
