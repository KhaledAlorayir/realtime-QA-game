import {
  CreateGameAndResults,
  GameFinishedBody,
  QuestionWithAnswers,
  SendQuestionBody,
  UserScore,
} from "lib/types";
import dayjs from "dayjs";
import { settings } from "lib/settings";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);
interface IGame {
  quizId: string;
  player1: UserScore;
  player2: UserScore;
  questions: QuestionWithAnswers[];
  currentQuestion: {
    question: QuestionWithAnswers;
    playerAnswered: Record<number, boolean>;
    maxTimestampToAnswer: Date;
  } | null;
}

export class Game {
  private quizId: string;
  private player1: UserScore;
  private player2: UserScore;
  private questions: QuestionWithAnswers[];
  private currentQuestion: {
    question: QuestionWithAnswers;
    playerAnswered: Record<string, boolean>;
    maxTimestampToAnswer: Date;
  } | null;

  constructor(
    quizId: string,
    firstPlayerId: string,
    secondPlayerId: string,
    questions: QuestionWithAnswers[]
  ) {
    this.quizId = quizId;
    this.questions = questions;
    this.player1 = { score: 0, userId: firstPlayerId };
    this.player2 = { score: 0, userId: secondPlayerId };
    this.currentQuestion = null;
  }

  getQuestion() {
    const question = this.questions.shift();

    if (question) {
      this.currentQuestion = {
        question,
        playerAnswered: {},
        maxTimestampToAnswer: dayjs()
          .add(settings.SECONDS_ALLOWED_TO_ANSWER, "seconds")
          .toDate(),
      };
      return this.mapQuestionDto(question);
    }

    this.currentQuestion = null;
    return null;
  }

  answerQuestion(playerId: string, answerId: string | null) {
    const player = this.getPlayerOrThrow(playerId);

    if (!this.currentQuestion) {
      throw new Error("no current question");
    }

    if (this.currentQuestion.playerAnswered[player.userId]) {
      throw new Error("already answered");
    }

    const isAnsweredInTime = dayjs().isSameOrBefore(
      this.currentQuestion.maxTimestampToAnswer
    );

    if (answerId) {
      const answer = this.currentQuestion.question.answers.find(
        ({ id }) => id === answerId
      );

      if (!answer) {
        throw new Error("invalid answer id");
      }

      if (answer.isCorrect && isAnsweredInTime) {
        player.score++;
      }
    }

    this.currentQuestion.playerAnswered[player.userId] = true;

    const correctAnswerId = this.currentQuestion.question.answers.find(
      (answer) => answer.isCorrect
    )?.id;

    if (!correctAnswerId) {
      throw new Error("no correct answer found");
    }

    return { correctAnswerId, isAnsweredInTime };
  }

  isSendNextQuestion() {
    return !!(
      this.currentQuestion?.playerAnswered[this.player1.userId] &&
      this.currentQuestion?.playerAnswered[this.player2.userId]
    );
  }

  getFinishedGameResults(): GameFinishedBody {
    if (!!this.currentQuestion) {
      throw new Error("game hasn't finished");
    }

    const winnerId =
      this.player1.score > this.player2.score
        ? this.player1.userId
        : this.player2.score > this.player1.score
        ? this.player2.userId
        : null;

    return {
      player1: this.player1,
      player2: this.player2,
      winnerId,
    };
  }

  getCreateGameAndResultsDto(): CreateGameAndResults {
    const results = this.getFinishedGameResults();
    return {
      quizId: this.quizId,
      results: [
        this.mapToCreateResult(this.player1, results.winnerId),
        this.mapToCreateResult(this.player2, results.winnerId),
      ],
    };
  }

  getCreateGameAndResultsDtoByWinnerId(winnerId: string): CreateGameAndResults {
    const winner = this.getPlayerOrThrow(winnerId);
    return {
      quizId: this.quizId,
      results: [
        this.mapToCreateResult(this.player1, winner.userId),
        this.mapToCreateResult(this.player2, winner.userId),
      ],
    };
  }

  private mapToCreateResult(
    userScore: UserScore,
    winnerId: string | null
  ): CreateGameAndResults["results"][number] {
    return {
      userId: userScore.userId,
      score: userScore.score,
      status:
        winnerId === userScore.userId ? "win" : !!winnerId ? "lose" : "draw",
    };
  }

  private getPlayerOrThrow(playerId: string) {
    if (playerId === this.player1.userId) {
      return this.player1;
    } else if (playerId === this.player2.userId) {
      return this.player2;
    }
    throw new Error("invalid player id");
  }

  private mapQuestionDto(question: QuestionWithAnswers): SendQuestionBody {
    return {
      content: question.content,
      id: question.id,
      answers: question.answers.map(({ id, content }) => ({ id, content })),
    };
  }

  toString() {
    return JSON.stringify({
      quizId: this.quizId,
      player1: this.player1,
      player2: this.player2,
      questions: this.questions,
      currentQuestion: this.currentQuestion,
    });
  }

  static parse(json: string) {
    const parsedJson = JSON.parse(json) as IGame;
    const game = new Game(
      parsedJson.quizId,
      parsedJson.player1.userId,
      parsedJson.player2.userId,
      parsedJson.questions
    );
    game.player1.score = parsedJson.player1.score;
    game.player2.score = parsedJson.player2.score;
    game.currentQuestion = parsedJson.currentQuestion;
    return game;
  }
}
