import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketInfo,
} from "./lib/types";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import { getUserByToken } from "./lib/auth";
import { IdSchema, QuizIdSchema } from "./lib/schema";
import { redis } from "./connections/redis";
import { KEY_GENERATOR } from "./lib/const";
import { dao } from "lib/dao";
import { Game } from "model/Game";
import { ApiError } from "model/ApiError";
import { Mutex } from "async-mutex";

/*
  I introduced a locking mechanism to solve a race conation,
  sometimes when both players answer at the same exact time, the will both load the same game instance from redis,
  so when i check if both players answered to send the next question it won't occur for either of them since they both loaded the instance together,
  not one after the other so an answer would be recorded.

  of course we have a mutex for each game to block only between the two players,
  
  a different approach of this, is instead of going with a mutex map, is to go with a roomGame map, so i changed the implantation of 'saveGame' and 'getGameOrThrow' functions
  to read and write to a roomGame map instead of redis, this will also solve the problem because we are muting a single instance of a 'Game' instead of serializing & storing to redis then parsing & creating a new instance.

  cool stuff, programming is pretty cool!.
*/
const answerLocks = new Map<string, Mutex>();

export async function webSocketHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) {
  io.on("connection", async (socket) => {
    try {
      await authorize(socket);

      socket.on("joinQuiz", (body) => {
        joinQuiz(socket, io, body.quizId);
      });

      socket.on("sendAnswer", (body) => {
        sendAnswer(socket, io, body.answerId);
      });

      socket.on("disconnect", () => {
        cleanup(socket, io);
      });
    } catch (error) {
      exceptionHandler(socket, error);
    }
  });
}

async function authorize(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >
) {
  const { token } = socket.handshake.auth;
  if (!token) {
    throw new Error("no token");
  }

  const user = await getUserByToken(token);

  const isUserActive = !!(await redis.exists(
    KEY_GENERATOR.activeUser(user.userId)
  ));

  if (isUserActive) {
    throw new Error("already in a session!");
  }

  await redis.set(KEY_GENERATOR.activeUser(user.userId), socket.id);
  await setSocketInfo(socket.id, {
    userData: user,
    waitingOnQuizId: null,
    joinedRoom: null,
  });
}

async function joinQuiz(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>,
  quizId: string
) {
  try {
    const validatedQuizId = await QuizIdSchema.parseAsync(quizId);
    const socketInfo = await getSocketInfoOrThrow(socket.id);

    if (socketInfo.joinedRoom || socketInfo.waitingOnQuizId) {
      throw new Error("in a game already");
    }

    const waitingPlayer = await redis.lPop(
      KEY_GENERATOR.waitingPlayersList(validatedQuizId)
    );

    if (!waitingPlayer) {
      await redis.rPush(
        KEY_GENERATOR.waitingPlayersList(validatedQuizId),
        socket.id
      );
      await setSocketInfo(socket.id, {
        ...socketInfo,
        waitingOnQuizId: validatedQuizId,
      });
    } else {
      const waitingPlayerSocket = io.sockets.sockets.get(waitingPlayer);
      const waitingPlayerSocketInfo = await getSocketInfo(waitingPlayer);

      if (!waitingPlayerSocket || !waitingPlayerSocketInfo) {
        throw new Error("invalid waiting player");
      }
      const roomId = KEY_GENERATOR.roomId(
        socket.id,
        waitingPlayerSocket.id,
        validatedQuizId
      );
      await socket.join(roomId);
      await waitingPlayerSocket.join(roomId);
      answerLocks.set(roomId, new Mutex());

      await setSocketInfo(waitingPlayerSocket.id, {
        ...waitingPlayerSocketInfo,
        waitingOnQuizId: null,
        joinedRoom: roomId,
      });

      await setSocketInfo(socket.id, { ...socketInfo, joinedRoom: roomId });
      const quiz = await dao.getQuizWithQuestionsAndAnswersById(
        validatedQuizId
      );

      if (!quiz) {
        throw new Error("invalid quiz id");
      }

      const winsCount = await dao.getWinsCountBetweenTwoPlayers(
        socketInfo.userData.userId,
        waitingPlayerSocketInfo.userData.userId
      );

      io.to(roomId).emit("quizJoined", {
        player1: {
          ...socketInfo.userData,
          wins: winsCount?.player1Wins ?? null,
        },
        player2: {
          ...waitingPlayerSocketInfo.userData,
          wins: winsCount?.player2Wins ?? null,
        },
        quizName: quiz.name,
        numberOfQuestions: quiz.questions.length,
      });

      const game = new Game(
        quiz.id,
        socketInfo.userData.userId,
        waitingPlayerSocketInfo.userData.userId,
        quiz.questions
      );

      const question = game.getQuestion();

      if (!question) {
        throw new Error("an error has occurred");
      }

      io.to(roomId).emit("sendQuestion", {
        ...question,
        uiStatusIndicator: "FIRST_QUESTION",
      });
      await saveGame(game, roomId);
    }
  } catch (error) {
    exceptionHandler(socket, error);
  }
}

async function sendAnswer(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>,
  answerId: string | null
) {
  try {
    const validatedId = IdSchema.nullable().parse(answerId);
    const socketInfo = await getSocketInfoOrThrow(socket.id);

    if (!socketInfo.joinedRoom) {
      throw new Error("not in a game");
    }

    await answerLocks.get(socketInfo.joinedRoom)?.runExclusive(async () => {
      if (!socketInfo.joinedRoom) {
        throw new Error("not in a game");
      }

      const game = await getGameOrThrow(socketInfo.joinedRoom);

      const { correctAnswerId, isAnsweredInTime } = game.answerQuestion(
        socketInfo.userData.userId,
        validatedId
      );

      if (!game.isBothPlayersAnswered()) {
        if (isAnsweredInTime && validatedId) {
          io.to(socketInfo.joinedRoom).emit("playerAnswered", {
            playerId: socketInfo.userData.userId,
          });
        }

        await saveGame(game, socketInfo.joinedRoom);
        return;
      }

      io.to(socketInfo.joinedRoom).emit("sendCorrectAnswer", {
        correctAnswerId,
        ...game.getCurrentScore(),
      });

      const question = game.getQuestion();
      if (question) {
        io.to(socketInfo.joinedRoom).emit("sendQuestion", {
          ...question,
          uiStatusIndicator: !!validatedId
            ? "NEXT_QUESTION"
            : "PREVIOUS_NOT_ANSWERED",
        });
        await saveGame(game, socketInfo.joinedRoom);
        return;
      }

      io.to(socketInfo.joinedRoom).emit(
        "gameFinished",
        game.getFinishedGameResults()
      );

      const room = io.sockets.adapter.rooms.get(socketInfo.joinedRoom);

      if (!room) {
        throw new Error("invalid room");
      }

      for (let socketId of room) {
        const socketInRoomInfo = await getSocketInfoOrThrow(socketId);
        await setSocketInfo(socketId, {
          ...socketInRoomInfo,
          joinedRoom: null,
        });
        await io.sockets.sockets.get(socketId)?.leave(socketInfo.joinedRoom);
      }

      await redis.del(socketInfo.joinedRoom);

      await dao.createGameAndResults(game.getCreateGameAndResultsDto());
    });
  } catch (error) {
    exceptionHandler(socket, error);
  }
}

async function cleanup(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >,
  io: Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, any>
) {
  try {
    const socketInfo = await getSocketInfo(socket.id);
    if (socketInfo) {
      await redis.del(KEY_GENERATOR.activeUser(socketInfo.userData.userId));
      await redis.del(KEY_GENERATOR.socketInfo(socket.id));
      if (socketInfo.waitingOnQuizId) {
        redis.lRem(
          KEY_GENERATOR.waitingPlayersList(socketInfo.waitingOnQuizId),
          0,
          socket.id
        );
      }

      if (socketInfo.joinedRoom) {
        const room = io.sockets.adapter.rooms.get(socketInfo.joinedRoom);

        if (room) {
          const [otherPlayerSocket] = Array.from(room.values());
          if (otherPlayerSocket) {
            io.to(otherPlayerSocket).emit("opponentLeftGame");

            const game = await getGameOrThrow(socketInfo.joinedRoom);
            const otherPlayerSocketInfo = await getSocketInfoOrThrow(
              otherPlayerSocket
            );
            await io.sockets.sockets
              .get(otherPlayerSocket)
              ?.leave(socketInfo.joinedRoom);

            await dao.createGameAndResults(
              game.getCreateGameAndResultsDtoByWinnerId(
                otherPlayerSocketInfo.userData.userId
              )
            );

            await setSocketInfo(otherPlayerSocket, {
              ...otherPlayerSocketInfo,
              joinedRoom: null,
            });
          }
        }
        await redis.del(socketInfo.joinedRoom);
      }
    }
  } catch (error) {
    exceptionHandler(socket, error);
  }
}

async function getSocketInfo(socketId: string) {
  const userInfo = await redis.get(KEY_GENERATOR.socketInfo(socketId));
  if (!userInfo) {
    return null;
  }
  return JSON.parse(userInfo) as SocketInfo;
}

async function getSocketInfoOrThrow(socketId: string) {
  const socketInfo = await getSocketInfo(socketId);

  if (!socketInfo) {
    throw new Error("unauthenticated socket");
  }
  return socketInfo;
}

async function setSocketInfo(socketId: string, socketInfo: SocketInfo) {
  await redis.set(
    KEY_GENERATOR.socketInfo(socketId),
    JSON.stringify(socketInfo)
  );
}

async function getGameOrThrow(roomId: string) {
  const gameInfo = await redis.get(roomId);

  if (!gameInfo) {
    throw new Error("game not found");
  }
  return Game.parse(gameInfo);
}

async function saveGame(game: Game, roomId: string) {
  await redis.set(roomId, game.toString());
}

function exceptionHandler(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    any
  >,
  error: unknown
) {
  socket.emit("sendError", ApiError.parseUnknownError(error));
  socket.disconnect(true);
}
