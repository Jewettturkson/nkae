import multer from "multer";
import { PDFDocument } from "pdf-lib";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./firebaseAuth";
import {
  insertSubjectSchema,
  insertStudyMaterialSchema,
  insertFlashcardSchema,
  insertQuizQuestionSchema,
  insertStudySessionSchema,
  insertStudyGoalSchema,
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});


// ---- AI cost guardrails (beta) ----
// Bounds worst-case OpenAI spend per user per day. Durable across restarts
// because it counts rows in the database rather than in-memory state.
const MAX_MATERIALS_PER_DAY = 10;
const MAX_AI_CONTENT_CHARS = 24000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const MAX_OCR_PAGES = 100;
const OCR_CHUNK_PAGES = 10;
const OCR_CONCURRENCY = 3;

async function ocrChunk(buffer: Buffer, filename: string): Promise<string> {
  const resp = await (openai as any).responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename: filename || "document.pdf",
            file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
          },
          {
            type: "input_text",
            text: "Transcribe all text in this document in natural reading order. Output plain text only, no commentary. Preserve headings and paragraph breaks.",
          },
        ],
      },
    ],
  });
  return (resp.output_text as string) || "";
}

// Scanned PDFs have no text layer; GPT-4o-mini reads the pages directly.
// Long documents are split into page chunks (pdf-lib) and OCR'd in parallel.
async function ocrPdfWithAI(buffer: Buffer, filename: string, numpages: number): Promise<string> {
  if (!openai) throw new Error("AI is not configured");
  if (numpages <= OCR_CHUNK_PAGES) return ocrChunk(buffer, filename);

  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = src.getPageCount();
  const chunks: Buffer[] = [];
  for (let start = 0; start < total; start += OCR_CHUNK_PAGES) {
    const doc = await PDFDocument.create();
    const idx = Array.from({ length: Math.min(OCR_CHUNK_PAGES, total - start) }, (_, i) => start + i);
    const pages = await doc.copyPages(src, idx);
    pages.forEach((p) => doc.addPage(p));
    chunks.push(Buffer.from(await doc.save()));
  }

  const results: string[] = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const i = next++;
      results[i] = await ocrChunk(chunks[i], `${filename} (pages ${i * OCR_CHUNK_PAGES + 1}+)`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(OCR_CONCURRENCY, chunks.length) }, worker));
  return results.join("\n\n");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize default subjects
  const defaultSubjects = [
    { name: "Mathematics", slug: "mathematics", description: "Algebra, calculus, statistics, and more", color: "#3b82f6" },
    { name: "Science", slug: "science", description: "Physics, chemistry, biology", color: "#10b981" },
    { name: "History", slug: "history", description: "World history, American history", color: "#f59e0b" },
    { name: "Literature", slug: "literature", description: "English literature, writing", color: "#8b5cf6" },
    { name: "Computer Science", slug: "computer-science", description: "Programming, algorithms, data structures", color: "#ef4444" },
    { name: "Foreign Languages", slug: "languages", description: "Spanish, French, German, and more", color: "#06b6d4" },
    { name: "Business", slug: "business", description: "Economics, finance, management", color: "#84cc16" },
  ];

  // Seed subjects if they don't exist
  try {
    const existingSubjects = await storage.getSubjects();
    if (existingSubjects.length === 0) {
      for (const subject of defaultSubjects) {
        await storage.createSubject(subject);
      }
    }
  } catch (error) {
    console.error("Error seeding subjects:", error);
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subject routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const current = await storage.getUser(userId);
      if (!current) {
        return res.status(404).json({ message: "User not found" });
      }
      const { firstName, lastName, university, major, graduationYear, bio } = req.body || {};
      const updated = await storage.upsertUser({
        ...current,
        firstName: firstName ?? current.firstName,
        lastName: lastName ?? current.lastName,
        university: university ?? (current as any).university,
        major: major ?? (current as any).major,
        graduationYear: graduationYear ?? (current as any).graduationYear,
        bio: bio ?? (current as any).bio,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/subjects', async (req, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req, res) => {
    try {
      const validation = insertSubjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid subject data", errors: validation.error });
      }
      
      const subject = await storage.createSubject(validation.data);
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  // Study materials routes
  app.get('/api/study-materials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, search, limit = 20, offset = 0 } = req.query;
      
      const materials = await storage.getStudyMaterials(userId, {
        subjectId: subject ? parseInt(subject as string) : undefined,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
      
      res.json(materials);
    } catch (error) {
      console.error("Error fetching study materials:", error);
      res.status(500).json({ message: "Failed to fetch study materials" });
    }
  });

  app.get('/api/study-materials/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const material = await storage.getStudyMaterial(id);
      
      if (!material) {
        return res.status(404).json({ message: "Study material not found" });
      }
      
      res.json(material);
    } catch (error) {
      console.error("Error fetching study material:", error);
      res.status(500).json({ message: "Failed to fetch study material" });
    }
  });


  // Extract text from an uploaded PDF, DOCX, or TXT file.
  // Returns the text so the client can reuse the normal create + AI flow.
  app.post('/api/study-materials/extract', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const name = (file.originalname || "").toLowerCase();
      let text = "";
      if (name.endsWith(".pdf") || file.mimetype === "application/pdf") {
        // deep import skips pdf-parse's debug harness, which breaks under bundlers
        const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
        const parsed = await pdfParse(file.buffer);
        text = parsed.text || "";

        // Scanned PDF (no text layer): fall back to AI OCR, within guardrails
        if (text.replace(/\s+/g, "").length < 50 && openai) {
          if ((parsed.numpages || 0) > MAX_OCR_PAGES) {
            return res.status(422).json({
              message: `Scanned PDFs are limited to ${MAX_OCR_PAGES} pages. Split the document and try again.`,
            });
          }
          // OCR costs money: reuse the same daily cap as material creation
          const mats = await storage.getStudyMaterials(req.user.claims.sub);
          const today = mats.filter((m: any) => m.createdAt && new Date(m.createdAt) >= startOfToday()).length;
          if (today >= MAX_MATERIALS_PER_DAY) {
            return res.status(429).json({ message: "Daily limit reached for AI processing. Come back tomorrow!" });
          }
          text = await ocrPdfWithAI(file.buffer, file.originalname, parsed.numpages || 0);
        }
      } else if (name.endsWith(".docx") || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value || "";
      } else if (name.endsWith(".txt") || (file.mimetype || "").startsWith("text/")) {
        text = file.buffer.toString("utf8");
      } else {
        return res.status(400).json({ message: "Unsupported file type. Upload a PDF, DOCX, or TXT file." });
      }
      text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) {
        return res.status(422).json({ message: "No text could be extracted from this file, even with OCR. Try a clearer scan or a different file." });
      }
      const LIMIT = 24000;
      const truncated = text.length > LIMIT;
      if (truncated) text = text.slice(0, LIMIT);
      const suggestedTitle = (file.originalname || "Uploaded material").replace(/\.[^.]+$/, "");
      res.json({ text, truncated, suggestedTitle });
    } catch (error) {
      console.error("File extraction failed:", error);
      res.status(500).json({ message: "Failed to extract text from that file" });
    }
  });

  app.post('/api/study-materials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertStudyMaterialSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid study material data", errors: validation.error });
      }

      // Beta guardrail: cap materials (and therefore AI generations) per user per day
      const existing = await storage.getStudyMaterials(userId);
      const createdToday = existing.filter(
        (m: any) => m.createdAt && new Date(m.createdAt) >= startOfToday()
      ).length;
      if (createdToday >= MAX_MATERIALS_PER_DAY) {
        return res.status(429).json({
          message: `Daily limit reached: ${MAX_MATERIALS_PER_DAY} materials per day during beta. Come back tomorrow!`,
        });
      }

      let material = await storage.createStudyMaterial(validation.data);
      
      // Generate AI summary and key points if content is provided
      if (validation.data.content && openai) {
        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: "You are a helpful study assistant. Create a concise summary and extract key learning points from the provided study material. Respond with JSON in this format: { 'summary': 'brief summary', 'keyPoints': ['point1', 'point2', 'point3'] }"
              },
              {
                role: "user",
                content: `Please analyze this study material:\n\nTitle: ${validation.data.title}\n\nContent: ${(validation.data.content || "").slice(0, MAX_AI_CONTENT_CHARS)}`
              }
            ],
            response_format: { type: "json_object" },
          });

          const aiResult = JSON.parse(aiResponse.choices[0].message.content || "{}");
          
          // Update the material with AI-generated content
          material = await storage.updateStudyMaterial(material.id, {
            summary: aiResult.summary,
            keyPoints: aiResult.keyPoints,
          }) || material;
          
        } catch (aiError) {
          console.error("Error generating AI summary:", aiError);
          // Continue without AI enhancement
        }
      }
      
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating study material:", error);
      res.status(500).json({ message: "Failed to create study material" });
    }
  });

  // Flashcards routes
  app.get('/api/flashcards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { materialId, due, limit = 20 } = req.query;
      
      const flashcards = await storage.getFlashcards({
        userId,
        studyMaterialId: materialId ? parseInt(materialId as string) : undefined,
        due: due === 'true',
        limit: parseInt(limit as string),
      });
      
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  // One-shot AI pipeline the upload flow expects: summary + key points,
  // then flashcards and quiz questions, in a single request.
  app.post('/api/study-materials/:id/generate-ai-content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      if (!openai) {
        return res.status(400).json({ message: "OpenAI must be configured" });
      }

      const material = await storage.getStudyMaterial(id);
      if (!material || material.userId !== userId) {
        return res.status(404).json({ message: "Study material not found or access denied" });
      }
      if (!material.content) {
        return res.status(400).json({ message: "Study material must have content" });
      }

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a study assistant. From the provided material produce JSON: { 'summary': '2-4 sentence summary', 'keyPoints': ['5-8 key points'], 'flashcards': [{ 'front': 'question', 'back': 'answer', 'difficulty': 1-5 }] (8-12 cards), 'quizQuestions': [{ 'question': '...', 'options': ['A','B','C','D'], 'correctAnswer': 'exact option text', 'explanation': '...', 'difficulty': 1-5 }] (5-8 questions) }",
          },
          {
            role: "user",
            content: `Title: ${material.title}

Content: ${material.content.slice(0, MAX_AI_CONTENT_CHARS)}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const ai = JSON.parse(aiResponse.choices[0].message.content || "{}");

      const updatedMaterial = await storage.updateStudyMaterial(id, {
        summary: ai.summary || null,
        keyPoints: Array.isArray(ai.keyPoints) ? ai.keyPoints : [],
      });

      const flashcards = [];
      for (const card of ai.flashcards || []) {
        flashcards.push(
          await storage.createFlashcard({
            studyMaterialId: id,
            userId,
            front: card.front,
            back: card.back,
            difficulty: card.difficulty || 1,
            nextReview: new Date(),
          })
        );
      }

      const quizQuestions = [];
      for (const q of ai.quizQuestions || []) {
        quizQuestions.push(
          await storage.createQuizQuestion({
            studyMaterialId: id,
            userId,
            question: q.question,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            difficulty: q.difficulty || 1,
          })
        );
      }

      res.json({ material: updatedMaterial, flashcardsCreated: flashcards.length, quizQuestionsCreated: quizQuestions.length });
    } catch (error) {
      console.error("Error generating AI content:", error);
      res.status(500).json({ message: "Failed to generate AI content" });
    }
  });

  app.post('/api/flashcards/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { materialId } = req.body;
      
      if (!materialId || !openai) {
        return res.status(400).json({ message: "Material ID required and OpenAI must be configured" });
      }
      
      const material = await storage.getStudyMaterial(materialId);
      if (!material || material.userId !== userId) {
        return res.status(404).json({ message: "Study material not found or access denied" });
      }
      
      if (!material.content) {
        return res.status(400).json({ message: "Study material must have content to generate flashcards" });
      }
      
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a helpful study assistant. Generate 8-12 flashcards from the provided study material. Create clear, concise questions on the front and comprehensive answers on the back. Focus on key concepts, definitions, and important facts. Respond with JSON in this format: { 'flashcards': [{ 'front': 'question', 'back': 'answer', 'difficulty': 1-5 }] }"
            },
            {
              role: "user",
              content: `Create flashcards from this study material:\n\nTitle: ${material.title}\n\nContent: ${material.content}`
            }
          ],
          response_format: { type: "json_object" },
        });

        const aiResult = JSON.parse(aiResponse.choices[0].message.content || "{}");
        const generatedFlashcards = [];

        for (const card of aiResult.flashcards || []) {
          const flashcard = await storage.createFlashcard({
            studyMaterialId: material.id,
            userId,
            front: card.front,
            back: card.back,
            difficulty: card.difficulty || 1,
            nextReview: new Date(), // Available immediately
          });
          generatedFlashcards.push(flashcard);
        }

        res.json(generatedFlashcards);
      } catch (aiError) {
        console.error("Error generating flashcards:", aiError);
        res.status(500).json({ message: "Failed to generate flashcards with AI" });
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      res.status(500).json({ message: "Failed to generate flashcards" });
    }
  });

  app.patch('/api/flashcards/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { correct } = req.body;
      
      const flashcard = await storage.getFlashcard(id);
      if (!flashcard || flashcard.userId !== userId) {
        return res.status(404).json({ message: "Flashcard not found or access denied" });
      }
      
      // Implement spaced repetition algorithm
      const now = new Date();
      const wasCorrect = correct === true;
      const newStreak = wasCorrect ? (flashcard.correctStreak || 0) + 1 : 0;
      
      // Calculate next review date based on spaced repetition
      let daysUntilNext = 1;
      if (wasCorrect) {
        daysUntilNext = Math.min(30, Math.pow(2, newStreak)); // Exponential backoff, max 30 days
      }
      
      const nextReview = new Date(now.getTime() + (daysUntilNext * 24 * 60 * 60 * 1000));
      
      const updated = await storage.updateFlashcard(id, {
        lastReviewed: now,
        nextReview,
        correctStreak: newStreak,
        totalReviews: (flashcard.totalReviews || 0) + 1,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error reviewing flashcard:", error);
      res.status(500).json({ message: "Failed to review flashcard" });
    }
  });

  // Quiz routes
  app.get('/api/quiz-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { materialId, limit = 10 } = req.query;
      
      const questions = await storage.getQuizQuestions({
        userId,
        studyMaterialId: materialId ? parseInt(materialId as string) : undefined,
        limit: parseInt(limit as string),
      });
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ message: "Failed to fetch quiz questions" });
    }
  });

  app.post('/api/quiz-questions/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { materialId } = req.body;
      
      if (!materialId || !openai) {
        return res.status(400).json({ message: "Material ID required and OpenAI must be configured" });
      }
      
      const material = await storage.getStudyMaterial(materialId);
      if (!material || material.userId !== userId) {
        return res.status(404).json({ message: "Study material not found or access denied" });
      }
      
      if (!material.content) {
        return res.status(400).json({ message: "Study material must have content to generate quiz questions" });
      }
      
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a helpful study assistant. Generate 8-10 multiple choice quiz questions from the provided study material. Include 4 options for each question with only one correct answer. Provide clear explanations for the correct answers. Respond with JSON in this format: { 'questions': [{ 'question': 'question text', 'options': ['A', 'B', 'C', 'D'], 'correctAnswer': 'correct option', 'explanation': 'why this is correct', 'difficulty': 1-5 }] }"
            },
            {
              role: "user",
              content: `Create quiz questions from this study material:\n\nTitle: ${material.title}\n\nContent: ${material.content}`
            }
          ],
          response_format: { type: "json_object" },
        });

        const aiResult = JSON.parse(aiResponse.choices[0].message.content || "{}");
        const generatedQuestions = [];

        for (const q of aiResult.questions || []) {
          const question = await storage.createQuizQuestion({
            studyMaterialId: material.id,
            userId,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || 1,
          });
          generatedQuestions.push(question);
        }

        res.json(generatedQuestions);
      } catch (aiError) {
        console.error("Error generating quiz questions:", aiError);
        res.status(500).json({ message: "Failed to generate quiz questions with AI" });
      }
    } catch (error) {
      console.error("Error generating quiz questions:", error);
      res.status(500).json({ message: "Failed to generate quiz questions" });
    }
  });

  // Study sessions routes
  app.get('/api/study-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, from, to, limit = 50 } = req.query;
      
      const sessions = await storage.getStudySessions(userId, {
        subjectId: subjectId ? parseInt(subjectId as string) : undefined,
        dateFrom: from ? new Date(from as string) : undefined,
        dateTo: to ? new Date(to as string) : undefined,
        limit: parseInt(limit as string),
      });
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching study sessions:", error);
      res.status(500).json({ message: "Failed to fetch study sessions" });
    }
  });

  app.post('/api/study-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertStudySessionSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid study session data", errors: validation.error });
      }
      
      const session = await storage.createStudySession(validation.data);
      
      // Update daily stats when session is completed
      if (validation.data.completedAt && validation.data.actualDuration) {
        const today = new Date();
        await storage.updateDailyStats(userId, today, {
          totalMinutes: validation.data.actualDuration,
          sessionsCompleted: 1,
        });
      }
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating study session:", error);
      res.status(500).json({ message: "Failed to create study session" });
    }
  });

  // Study goals routes
  app.get('/api/study-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subjectId, completed } = req.query;
      
      const goals = await storage.getStudyGoals(userId, {
        subjectId: subjectId ? parseInt(subjectId as string) : undefined,
        completed: completed !== undefined ? completed === 'true' : undefined,
      });
      
      res.json(goals);
    } catch (error) {
      console.error("Error fetching study goals:", error);
      res.status(500).json({ message: "Failed to fetch study goals" });
    }
  });

  app.post('/api/study-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertStudyGoalSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid study goal data", errors: validation.error });
      }
      
      const goal = await storage.createStudyGoal(validation.data);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating study goal:", error);
      res.status(500).json({ message: "Failed to create study goal" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);

      // Get today's stats
      const todayStats = await storage.getDailyStats(userId, today);
      
      // Get this week's stats
      const weeklyStats = await storage.getWeeklyStats(userId, weekStart);
      
      // Get recent study sessions
      const recentSessions = await storage.getStudySessions(userId, {
        dateFrom: weekStart,
        limit: 10,
      });
      
      // Get due flashcards count
      const dueFlashcards = await storage.getFlashcards({
        userId,
        due: true,
        limit: 1,
      });
      
      // Get active goals
      const activeGoals = await storage.getStudyGoals(userId, {
        completed: false,
      });

      res.json({
        todayStats: todayStats || { totalMinutes: 0, sessionsCompleted: 0, flashcardsReviewed: 0, quizzesCompleted: 0 },
        weeklyStats,
        recentSessions,
        dueFlashcardsCount: dueFlashcards.length,
        activeGoalsCount: activeGoals.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}