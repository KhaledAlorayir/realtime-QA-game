import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  quizzes: many(quizzes),
}));

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  categoryId: uuid("category_id")
    .references(() => categories.id)
    .notNull(),
});

export const quizzesRelations = relations(quizzes, ({ many, one }) => ({
  category: one(categories, {
    fields: [quizzes.categoryId],
    references: [categories.id],
  }),
  questions: many(questions),
  results: many(results),
}));

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: varchar("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  quizId: uuid("quiz_id")
    .references(() => quizzes.id)
    .notNull(),
});

export const questionsRelations = relations(questions, ({ many, one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  answers: many(answers),
}));

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: varchar("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isCorrect: boolean("is_correct").notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
});

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}));

export const resultStatusEnum = pgEnum("result_status", [
  "win",
  "lose",
  "draw",
]);

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    quizId: uuid("quiz_id")
      .references(() => quizzes.id)
      .notNull(),
    userId: uuid("user_id").notNull(),
    score: integer("score").notNull(),
    status: resultStatusEnum("result_status").notNull(),
  },
  (table) => ({
    userIdx: index("userIdx").on(table.userId),
  })
);

export const resultsRelations = relations(results, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [results.quizId],
    references: [quizzes.id],
  }),
}));
