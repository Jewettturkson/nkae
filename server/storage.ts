import {
  users,
  subjects,
  concepts,
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
  type Concept,
  type InsertConcept,
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

  // Concept operations (auto-populated at card generation time)
  getConceptsBySubject(subjectId: number): Promise<Concept[]>;
  getOrCreateConcept(subjectId: number, label: string): Promise<Concept>;
  getConceptGraphCards(subjectId: number): Promise<{ id: number; conceptId: number | null; studyMaterialId: number | null; correctStreak: number | null; totalReviews: number | null }[]>;

  // Study materials operations
  getStudyMaterials(userId: string, filters?: { subjectId?: number; search?: string; limit?: number; offset?: number }): Promise<StudyMaterialWithDetails[]>;
  getStudyMaterial(id: number): Promise<StudyMaterialWithDetails | undefined>;
  createStudyMaterial(material: InsertStudyMaterial): Promise<StudyMaterial>;
  updateStudyMaterial(id: number, updates: Partial<InsertStudyMaterial>): Promise<StudyMaterial | undefined>;
  deleteStudyMaterial(id: number): Promise<boolean>;

  // Flashcard operations
  getFlashcards(filters: { userId?: string; studyMaterialId?: number; conceptId?: number; due?: boolean; limit?: number }): Promise<FlashcardWithDetails[]>;
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

  // Concept operations
  async getConceptsBySubject(subjectId: number): Promise<Concept[]> {
    return await db.select().from(concepts).where(eq(concepts.subjectId, subjectId)).orderBy(asc(concepts.label));
  }

  // Case-insensitive match within the subject so the AI saying "Krebs Cycle"
  // one time and "krebs cycle" another doesn't fork into two nodes.
  async getOrCreateConcept(subjectId: number, label: string): Promise<Concept> {
    const clean = label.trim().slice(0, 100);
    const existing = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.subjectId, subjectId), sql`lower(${concepts.label}) = lower(${clean})`));
    if (existing[0]) return existing[0];
    const [created] = await db.insert(concepts).values({ subjectId, label: clean }).returning();
    return created;
  }

  // Minimal fields needed to derive the knowledge graph live: mastery per
  // concept (from correctStreak/totalReviews, same signal reviewReason
  // already uses) and edges from concepts that co-occur on the same
  // material. Nothing here is stored, it's recomputed on each request.
  async getConceptGraphCards(subjectId: number) {
    return await db
      .select({
        id: flashcards.id,
        conceptId: flashcards.conceptId,
        studyMaterialId: flashcards.studyMaterialId,
        correctStreak: flashcards.correctStreak,
        totalReviews: flashcards.totalReviews,
      })
      .from(flashcards)
      .where(eq(flashcards.subjectId, subjectId));
  }

  // Study materials operations
  async getStudyMaterials(
    userId: string,
    filters: { subjectId?: number; search?: string; limit?: number; offset?: number } = {}
  ): Promise<StudyMaterialWithDetails[]> {
    const rows = await db.query.studyMaterials.findMany({
      where: filters.subjectId
        ? and(eq(studyMaterials.userId, userId), eq(studyMaterials.subjectId, filters.subjectId))
        : eq(studyMaterials.userId, userId),
      with: { user: true, subject: true, flashcards: true, quizQuestions: true },
      orderBy: desc(studyMaterials.createdAt),
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
    return rows
      .filter((row) =>
        filters.search ? row.title.toLowerCase().includes(filters.search.toLowerCase()) : true
      )
      .map(({ flashcards: cards, quizQuestions: questions, ...row }) => ({
        ...row,
        flashcardsCount: cards.length,
        questionsCount: questions.length,
      })) as StudyMaterialWithDetails[];
  }

  async getStudyMaterial(id: number): Promise<StudyMaterialWithDetails | undefined> {
    const row = await db.query.studyMaterials.findFirst({
      where: eq(studyMaterials.id, id),
      with: { user: true, subject: true, flashcards: true, quizQuestions: true },
    });
    if (!row) return undefined;
    const { flashcards: cards, quizQuestions: questions, ...rest } = row;
    return { ...rest, flashcardsCount: cards.length, questionsCount: questions.length } as StudyMaterialWithDetails;
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
  async getFlashcards(filters: { userId?: string; studyMaterialId?: number; conceptId?: number; due?: boolean; limit?: number }): Promise<FlashcardWithDetails[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(flashcards.userId, filters.userId));
    if (filters.studyMaterialId) conditions.push(eq(flashcards.studyMaterialId, filters.studyMaterialId));
    if (filters.conceptId) conditions.push(eq(flashcards.conceptId, filters.conceptId));
    if (filters.due) conditions.push(sql`(${flashcards.nextReview} IS NULL OR ${flashcards.nextReview} <= NOW())`);
    const rows = await db.query.flashcards.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { user: true, studyMaterial: true, subject: true },
      orderBy: asc(flashcards.nextReview),
      limit: filters.limit ?? 200,
    });
    return rows as FlashcardWithDetails[];
  }

  async getFlashcard(id: number): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    return card;
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
    return await db.select().from(flashcards).where(eq(flashcards.studyMaterialId, materialId));
  }

  // Quiz question operations
  async getQuizQuestions(filters: { userId?: string; studyMaterialId?: number; limit?: number }): Promise<QuizQuestion[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(quizQuestions.userId, filters.userId));
    if (filters.studyMaterialId) conditions.push(eq(quizQuestions.studyMaterialId, filters.studyMaterialId));
    return await db
      .select()
      .from(quizQuestions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(quizQuestions.createdAt))
      .limit(filters.limit ?? 100);
  }

  async getQuizQuestion(id: number): Promise<QuizQuestion | undefined> {
    const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
    return question;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [created] = await db.insert(quizQuestions).values(question).returning();
    return created;
  }

  async generateQuizFromMaterial(materialId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.studyMaterialId, materialId));
  }

  // Study session operations
  async getStudySessions(userId: string, filters?: { subjectId?: number; dateFrom?: Date; dateTo?: Date; limit?: number }): Promise<StudySessionWithDetails[]> {
    const conditions = [eq(studySessions.userId, userId)];
    if (filters?.subjectId) conditions.push(eq(studySessions.subjectId, filters.subjectId));
    if (filters?.dateFrom) conditions.push(gte(studySessions.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(studySessions.createdAt, filters.dateTo));
    const rows = await db.query.studySessions.findMany({
      where: and(...conditions),
      with: { user: true, subject: true, studyMaterial: true },
      orderBy: desc(studySessions.createdAt),
      limit: filters?.limit ?? 100,
    });
    return rows as StudySessionWithDetails[];
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
    const conditions = [eq(studyGoals.userId, userId)];
    if (filters?.subjectId) conditions.push(eq(studyGoals.subjectId, filters.subjectId));
    if (filters?.completed !== undefined) conditions.push(eq(studyGoals.isCompleted, filters.completed));
    const rows = await db.query.studyGoals.findMany({
      where: and(...conditions),
      with: { user: true, subject: true },
      orderBy: desc(studyGoals.createdAt),
    });
    // goals track daily minutes and weekly sessions; percentage is derived
    // client-side from stats, so completion state stands in here
    return rows.map((row) => ({
      ...row,
      progressPercentage: row.isCompleted ? 100 : 0,
    })) as StudyGoalWithDetails[];
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
    const [stats] = await db
      .select()
      .from(dailyStats)
      .where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date)));
    return stats;
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