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
