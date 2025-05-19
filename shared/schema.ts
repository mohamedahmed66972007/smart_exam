import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("teacher"), // teacher or student
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Exam model
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  status: text("status").notNull().default("draft"), // draft, active, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileUrl: text("file_url"), // optional attachment
  shareCode: text("share_code"), // code for sharing with examinees
  isPublic: boolean("is_public").default(false), // whether exam is publicly accessible
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
});

// Question model
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  type: text("type").notNull(), // essay, multiple_choice, true_false
  text: text("text").notNull(),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
  options: json("options"), // for multiple choice, contains array of options
  correctAnswer: json("correct_answer"), // Array for essay to support multiple answers, string for others
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

// Student exam attempts
export const examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  maxScore: integer("max_score").notNull(),
  timeSpent: integer("time_spent"), // in seconds
});

export const insertExamAttemptSchema = createInsertSchema(examAttempts).omit({
  id: true,
  score: true,
  completedAt: true,
  timeSpent: true,
});

// Student answers
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => examAttempts.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  score: integer("score"),
  manuallyGraded: boolean("manually_graded").default(false),
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  isCorrect: true,
  score: true,
  manuallyGraded: true,
});

// Grading requests
export const gradingRequests = pgTable("grading_requests", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull().references(() => answers.id),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  comment: text("comment"),
  resolvedAt: timestamp("resolved_at"),
});

export const insertGradingRequestSchema = createInsertSchema(gradingRequests).omit({
  id: true,
  requestedAt: true,
  status: true,
  resolvedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type ExamAttempt = typeof examAttempts.$inferSelect;
export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type GradingRequest = typeof gradingRequests.$inferSelect;
export type InsertGradingRequest = z.infer<typeof insertGradingRequestSchema>;
