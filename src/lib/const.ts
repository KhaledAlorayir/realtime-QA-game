export const KEY_GENERATOR = {
  waitingPlayersList: (quizId: string) => `QUIZ_${quizId}`,
  socketInfo: (socketId: string) => `SOCKET_${socketId}`,
  activeUser: (userId: string) => `USER_${userId}`,
  roomId: (firstId: string, secondId: string, quizId: string) =>
    `ROOM_${firstId}_${secondId}_${quizId}`,
  cacheKey: (propertyKey: string, args: any[]) =>
    `FN_${propertyKey}_${args
      .map((parameter) => String(parameter))
      .sort()
      .join("_")}`,
};

export enum CATEGORY {
  MOVIES = "movies",
  TV = "tv",
  VIDEO_GAMES = "video games",
  MUSIC = "music",
  GENERAL_KNOWLEDGE = "general knowledge",
  BOOKS = "books",
  NATURE = "nature",
  COMPUTERS = "computers",
  SPORT = "sports",
  GEOGRAPHY = "geography",
  HISTORY = "history",
  CELEBRITIES = "celebrities",
  ANIMALS = "animals",
}

export const BUFFER_IN_SECONDS = 5;
