import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  university: varchar("university"),
  major: varchar("major"),
  graduationYear: integer("graduation_year"),
  bio: text("bio"),
  isVerified: boolean("is_verified").default(false),
  remindersEnabled: boolean("reminders_enabled").default(true),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Study subjects/categories
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6366f1"), // hex color
  createdAt: timestamp("created_at").defaultNow(),
});

// Study materials (notes, PDFs, etc.)
export const studyMaterials = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // extracted text content
  fileUrl: varchar("file_url"), // if uploaded file
  fileType: varchar("file_type", { length: 50 }), // pdf, txt, docx, etc.
  subjectId: integer("subject_id").references(() => subjects.id),
  tags: text("tags").array(),
  summary: text("summary"), // AI-generated summary
  keyPoints: text("key_points").array(), // AI-extracted key points
  examDate: timestamp("exam_date"), // optional: reviews compress toward this date
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flashcards generated from study materials
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  studyMaterialId: integer("study_material_id").references(() => studyMaterials.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  front: text("front").notNull(), // question/term
  back: text("back").notNull(), // answer/definition
  difficulty: integer("difficulty").default(1), // 1-5 scale
  lastReviewed: timestamp("last_reviewed"),
  nextReview: timestamp("next_review"), // spaced repetition
  correctStreak: integer("correct_streak").default(0),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz questions generated from study materials
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  studyMaterialId: integer("study_material_id").references(() => studyMaterials.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  question: text("question").notNull(),
  options: text("options").array(), // for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  difficulty: integer("difficulty").default(1), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
});

// Study sessions with Pomodoro/timed focus
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id),
  studyMaterialId: integer("study_material_id").references(() => studyMaterials.id),
  sessionType: varchar("session_type", { length: 50 }).notNull(), // pomodoro, timed, free
  plannedDuration: integer("planned_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  focusRating: integer("focus_rating"), // 1-5 self-assessment
  createdAt: timestamp("created_at").defaultNow(),
});

// User study goals and progress tracking
export const studyGoals = pgTable("study_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  dailyMinutesGoal: integer("daily_minutes_goal"),
  weeklySessionsGoal: integer("weekly_sessions_goal"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track daily study statistics
export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  totalMinutes: integer("total_minutes").default(0),
  sessionsCompleted: integer("sessions_completed").default(0),
  flashcardsReviewed: integer("flashcards_reviewed").default(0),
  quizzesCompleted: integer("quizzes_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  studyMaterials: many(studyMaterials),
  flashcards: many(flashcards),
  quizQuestions: many(quizQuestions),
  studySessions: many(studySessions),
  studyGoals: many(studyGoals),
  dailyStats: many(dailyStats),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  studyMaterials: many(studyMaterials),
  studySessions: many(studySessions),
  studyGoals: many(studyGoals),
}));

export const studyMaterialsRelations = relations(studyMaterials, ({ one, many }) => ({
  user: one(users, {
    fields: [studyMaterials.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [studyMaterials.subjectId],
    references: [subjects.id],
  }),
  flashcards: many(flashcards),
  quizQuestions: many(quizQuestions),
  studySessions: many(studySessions),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [flashcards.studyMaterialId],
    references: [studyMaterials.id],
  }),
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id],
  }),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [quizQuestions.studyMaterialId],
    references: [studyMaterials.id],
  }),
  user: one(users, {
    fields: [quizQuestions.userId],
    references: [users.id],
  }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [studySessions.subjectId],
    references: [subjects.id],
  }),
  studyMaterial: one(studyMaterials, {
    fields: [studySessions.studyMaterialId],
    references: [studyMaterials.id],
  }),
}));

export const studyGoalsRelations = relations(studyGoals, ({ one }) => ({
  user: one(users, {
    fields: [studyGoals.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [studyGoals.subjectId],
    references: [subjects.id],
  }),
}));

export const dailyStatsRelations = relations(dailyStats, ({ one }) => ({
  user: one(users, {
    fields: [dailyStats.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});

export const insertStudyMaterialSchema = createInsertSchema(studyMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
  createdAt: true,
});

export const insertStudyGoalSchema = createInsertSchema(studyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertStudyMaterial = z.infer<typeof insertStudyMaterialSchema>;
export type StudyMaterial = typeof studyMaterials.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudyGoal = z.infer<typeof insertStudyGoalSchema>;
export type StudyGoal = typeof studyGoals.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;

// Extended types for API responses
export type StudyMaterialWithDetails = StudyMaterial & {
  user: User;
  subject: Subject | null;
  flashcardsCount: number;
  questionsCount: number;
};

export type FlashcardWithDetails = Flashcard & {
  studyMaterial: StudyMaterial | null;
  user: User;
};

export type StudySessionWithDetails = StudySession & {
  user: User;
  subject: Subject | null;
  studyMaterial: StudyMaterial | null;
};

export type StudyGoalWithDetails = StudyGoal & {
  user: User;
  subject: Subject | null;
  progressPercentage: number;
};
