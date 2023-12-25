import { db } from "connections/database/db";
import {
  answers,
  categories,
  games,
  questions,
  quizzes,
  results,
} from "connections/database/schema";
import { redis } from "connections/redis";

async function reset() {
  await redis.flushDb();
  await db.delete(results);
  await db.delete(games);
  await db.delete(answers);
  await db.delete(questions);
  await db.delete(quizzes);
  await db.delete(categories);
}

await reset();
process.exit(0);
