import {
  CreateGameAndResults,
  GameFinishedBody,
  QuestionWithAnswers,
  SendCorrectAnswerBody,
  SendQuestionBody,
  UserScore,
} from "lib/types";
import dayjs from "dayjs";
import { settings } from "lib/settings";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { BUFFER_IN_SECONDS } from "lib/const";
dayjs.extend(isSameOrBefore);
interface DeserializedGame {
  quizId: string;
  player1: UserScore;
  player2: UserScore;
  questions: QuestionWithAnswers[];
  currentQuestion: {
    question: QuestionWithAnswers;
    playerAnswer: [string, string | null][];
    maxTimestampToAnswer: string;
  } | null;
  questionCounter: number;
}

export class Game {
  private quizId: string;
  private player1: UserScore;
  private player2: UserScore;
  private questions: QuestionWithAnswers[];
  private currentQuestion: {
    question: QuestionWithAnswers;
    playerAnswer: Map<string, string | null>;
    maxTimestampToAnswer: Date;
  } | null;
  private questionCounter: number;

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
    this.questionCounter = 0;
  }

  getQuestion(addBuffer = false) {
    const question = this.questions.shift();

    if (question) {
      this.currentQuestion = {
        question,
        playerAnswer: new Map(),
        maxTimestampToAnswer: dayjs()
          .add(
            addBuffer
              ? settings.SECONDS_ALLOWED_TO_ANSWER + BUFFER_IN_SECONDS
              : settings.SECONDS_ALLOWED_TO_ANSWER,
            "seconds"
          )
          .toDate(),
      };
      this.questionCounter++;
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

    if (this.currentQuestion.playerAnswer.has(player.userId)) {
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

    this.currentQuestion.playerAnswer.set(player.userId, answerId);

    const correctAnswerId = this.currentQuestion.question.answers.find(
      (answer) => answer.isCorrect
    )?.id;

    if (!correctAnswerId) {
      throw new Error("no correct answer found");
    }

    return { correctAnswerId, isAnsweredInTime };
  }

  isBothPlayersAnswered() {
    return !!(
      this.currentQuestion?.playerAnswer.has(this.player1.userId) &&
      this.currentQuestion?.playerAnswer.has(this.player2.userId)
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

  getCurrentScore(): Omit<SendCorrectAnswerBody, "correctAnswerId"> {
    if (!this.isBothPlayersAnswered() || !this.currentQuestion) {
      throw new Error("both players must answer");
    }

    return {
      player1: {
        ...this.player1,
        answerId:
          this.currentQuestion.playerAnswer.get(this.player1.userId) ?? null,
      },
      player2: {
        ...this.player2,
        answerId:
          this.currentQuestion.playerAnswer.get(this.player2.userId) ?? null,
      },
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
      questionNumber: this.questionCounter,
    };
  }

  toString() {
    return JSON.stringify({
      quizId: this.quizId,
      player1: this.player1,
      player2: this.player2,
      questions: this.questions,
      questionCounter: this.questionCounter,
      currentQuestion: !this.currentQuestion
        ? null
        : {
            ...this.currentQuestion,
            playerAnswer: Array.from(this.currentQuestion.playerAnswer),
          },
    });
  }

  static parse(json: string) {
    const parsedJson = JSON.parse(json) as DeserializedGame;
    const game = new Game(
      parsedJson.quizId,
      parsedJson.player1.userId,
      parsedJson.player2.userId,
      parsedJson.questions
    );
    game.player1.score = parsedJson.player1.score;
    game.player2.score = parsedJson.player2.score;
    game.questionCounter = parsedJson.questionCounter;
    game.currentQuestion = !parsedJson.currentQuestion
      ? null
      : {
          maxTimestampToAnswer: dayjs(
            parsedJson.currentQuestion.maxTimestampToAnswer
          ).toDate(),
          question: parsedJson.currentQuestion.question,
          playerAnswer: new Map(parsedJson.currentQuestion.playerAnswer),
        };
    return game;
  }
}
