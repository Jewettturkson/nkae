import {
  users,
  subjects,
  studyMaterials,
  flashcards,
  quizQuestions,
  studySessions,
  studyGoals,
  dailyStats,
  type User,
  type UpsertUser,
  type Subject,
  type InsertSubject,
  type StudyMaterial,
  type InsertStudyMaterial,
  type StudyMaterialWithDetails,
  type Flashcard,
  type InsertFlashcard,
  type FlashcardWithDetails,
  type QuizQuestion,
  type InsertQuizQuestion,
  type StudySession,
  type InsertStudySession,
  type StudySessionWithDetails,
  type StudyGoal,
  type InsertStudyGoal,
  type StudyGoalWithDetails,
  type DailyStats,
  type InsertDailyStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Subject operations
  getSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, updates: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;

  // Study materials operations
  getStudyMaterials(userId: string, filters?: { subjectId?: number; search?: string; limit?: number; offset?: number }): Promise<StudyMaterialWithDetails[]>;
  getStudyMaterial(id: number): Promise<StudyMaterialWithDetails | undefined>;
  createStudyMaterial(material: InsertStudyMaterial): Promise<StudyMaterial>;
  updateStudyMaterial(id: number, updates: Partial<InsertStudyMaterial>): Promise<StudyMaterial | undefined>;
  deleteStudyMaterial(id: number): Promise<boolean>;

  // Flashcard operations
  getFlashcards(filters: { userId?: string; studyMaterialId?: number; due?: boolean; limit?: number }): Promise<FlashcardWithDetails[]>;
  getFlashcard(id: number): Promise<Flashcard | undefined>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: number, updates: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: number): Promise<boolean>;
  generateFlashcardsFromMaterial(materialId: number): Promise<Flashcard[]>;

  // Quiz question operations
  getQuizQuestions(filters: { userId?: string; studyMaterialId?: number; limit?: number }): Promise<QuizQuestion[]>;
  getQuizQuestion(id: number): Promise<QuizQuestion | undefined>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  generateQuizFromMaterial(materialId: number): Promise<QuizQuestion[]>;

  // Study session operations
  getStudySessions(userId: string, filters?: { subjectId?: number; dateFrom?: Date; dateTo?: Date; limit?: number }): Promise<StudySessionWithDetails[]>;
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  updateStudySession(id: number, updates: Partial<InsertStudySession>): Promise<StudySession | undefined>;

  // Study goal operations
  getStudyGoals(userId: string, filters?: { subjectId?: number; completed?: boolean }): Promise<StudyGoalWithDetails[]>;
  createStudyGoal(goal: InsertStudyGoal): Promise<StudyGoal>;
  updateStudyGoal(id: number, updates: Partial<InsertStudyGoal>): Promise<StudyGoal | undefined>;
  deleteStudyGoal(id: number): Promise<boolean>;

  // Daily stats operations
  getDailyStats(userId: string, date: Date): Promise<DailyStats | undefined>;
  updateDailyStats(userId: string, date: Date, updates: Partial<InsertDailyStats>): Promise<DailyStats>;
  getWeeklyStats(userId: string, startDate: Date): Promise<DailyStats[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Subject operations
  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects).orderBy(asc(subjects.name));
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values(subject).returning();
    return created;
  }

  async updateSubject(id: number, updates: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db
      .update(subjects)
      .set(updates)
      .where(eq(subjects.id, id))
      .returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<boolean> {
    const result = await db.delete(subjects).where(eq(subjects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Study materials operations
  async getStudyMaterials(
    userId: string,
    filters: { subjectId?: number; search?: string; limit?: number; offset?: number } = {}
  ): Promise<StudyMaterialWithDetails[]> {
    return [];
  }

  async getStudyMaterial(id: number): Promise<StudyMaterialWithDetails | undefined> {
    return undefined;
  }

  async createStudyMaterial(material: InsertStudyMaterial): Promise<StudyMaterial> {
    const [created] = await db.insert(studyMaterials).values(material).returning();
    return created;
  }

  async updateStudyMaterial(id: number, updates: Partial<InsertStudyMaterial>): Promise<StudyMaterial | undefined> {
    const [updated] = await db
      .update(studyMaterials)
      .set(updates)
      .where(eq(studyMaterials.id, id))
      .returning();
    return updated;
  }

  async deleteStudyMaterial(id: number): Promise<boolean> {
    const result = await db.delete(studyMaterials).where(eq(studyMaterials.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Flashcard operations  
  async getFlashcards(filters: { userId?: string; studyMaterialId?: number; due?: boolean; limit?: number }): Promise<FlashcardWithDetails[]> {
    return [];
  }

  async getFlashcard(id: number): Promise<Flashcard | undefined> {
    return undefined;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [created] = await db.insert(flashcards).values(flashcard).returning();
    return created;
  }

  async updateFlashcard(id: number, updates: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set(updates)
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  async deleteFlashcard(id: number): Promise<boolean> {
    const result = await db.delete(flashcards).where(eq(flashcards.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async generateFlashcardsFromMaterial(materialId: number): Promise<Flashcard[]> {
    return [];
  }

  // Quiz question operations
  async getQuizQuestions(filters: { userId?: string; studyMaterialId?: number; limit?: number }): Promise<QuizQuestion[]> {
    return [];
  }

  async getQuizQuestion(id: number): Promise<QuizQuestion | undefined> {
    return undefined;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [created] = await db.insert(quizQuestions).values(question).returning();
    return created;
  }

  async generateQuizFromMaterial(materialId: number): Promise<QuizQuestion[]> {
    return [];
  }

  // Study session operations
  async getStudySessions(userId: string, filters?: { subjectId?: number; dateFrom?: Date; dateTo?: Date; limit?: number }): Promise<StudySessionWithDetails[]> {
    return [];
  }

  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    const [created] = await db.insert(studySessions).values(session).returning();
    return created;
  }

  async updateStudySession(id: number, updates: Partial<InsertStudySession>): Promise<StudySession | undefined> {
    const [updated] = await db
      .update(studySessions)
      .set(updates)
      .where(eq(studySessions.id, id))
      .returning();
    return updated;
  }

  // Study goal operations
  async getStudyGoals(userId: string, filters?: { subjectId?: number; completed?: boolean }): Promise<StudyGoalWithDetails[]> {
    return [];
  }

  async createStudyGoal(goal: InsertStudyGoal): Promise<StudyGoal> {
    const [created] = await db.insert(studyGoals).values(goal).returning();
    return created;
  }

  async updateStudyGoal(id: number, updates: Partial<InsertStudyGoal>): Promise<StudyGoal | undefined> {
    const [updated] = await db
      .update(studyGoals)
      .set(updates)
      .where(eq(studyGoals.id, id))
      .returning();
    return updated;
  }

  async deleteStudyGoal(id: number): Promise<boolean> {
    const result = await db.delete(studyGoals).where(eq(studyGoals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Daily stats operations
  async getDailyStats(userId: string, date: Date): Promise<DailyStats | undefined> {
    return undefined;
  }

  async updateDailyStats(userId: string, date: Date, updates: Partial<InsertDailyStats>): Promise<DailyStats> {
    const [existing] = await db
      .select()
      .from(dailyStats)
      .where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date)));

    if (existing) {
      const [updated] = await db
        .update(dailyStats)
        .set(updates)
        .where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyStats)
        .values({ userId, date, ...updates })
        .returning();
      return created;
    }
  }

  async getWeeklyStats(userId: string, startDate: Date): Promise<DailyStats[]> {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    return await db
      .select()
      .from(dailyStats)
      .where(
        and(
          eq(dailyStats.userId, userId),
          gte(dailyStats.date, startDate),
          lte(dailyStats.date, endDate)
        )
      )
      .orderBy(asc(dailyStats.date));
  }
}

export const storage = new DatabaseStorage();