import {
  GameFinishedBody,
  QuestionWithAnswers,
  SendQuestionBody,
  UserScore,
} from "lib/types";

interface IGame {
  quizId: string;
  player1: UserScore;
  player2: UserScore;
  questions: QuestionWithAnswers[];
  currentQuestion: {
    question: QuestionWithAnswers;
    playerAnswered: Record<number, boolean>;
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
      };
      return this.mapQuestionDto(question);
    }

    this.currentQuestion = null;
    return null;
  }

  answerQuestion(playerId: string, answerId: string) {
    const player = this.getPlayerOrThrow(playerId);

    if (!this.currentQuestion) {
      throw new Error("no current question");
    }

    if (this.currentQuestion.playerAnswered[player.userId]) {
      throw new Error("already answered");
    }

    const answer = this.currentQuestion.question.answers.find(
      ({ id }) => id === answerId
    );

    if (!answer) {
      throw new Error("invalid answer id");
    }

    if (answer.isCorrect) {
      player.score++;
    }

    this.currentQuestion.playerAnswered[player.userId] = true;
  }

  isSendNextQuestion() {
    return !!(
      this.currentQuestion?.playerAnswered[this.player1.userId] &&
      this.currentQuestion?.playerAnswered[this.player2.userId]
    );
  }

  getWinner(): GameFinishedBody {
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
