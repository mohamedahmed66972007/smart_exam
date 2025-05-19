import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import {
  insertUserSchema,
  insertExamSchema,
  insertQuestionSchema,
  insertExamAttemptSchema,
  insertAnswerSchema,
  insertGradingRequestSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const MemoryStoreSession = MemoryStore(session);
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session management
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "examination-platform-secret",
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        if (user.password !== password) {
          // In a real app, we would use proper password hashing
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth middleware
  // للتطوير والاختبار فقط - سيتم استبداله بمنطق المصادقة الحقيقي في الإنتاج
  const isAuthenticated = async (req: Request, res: Response, next: Function) => {
    try {
      // تجاوز المصادقة مؤقتاً للتطوير
      const users = await storage.getUsers();
      if (users.length > 0) {
        (req as any).user = users[0];
        return next();
      } else {
        // إنشاء مستخدم للاختبار إذا لم يكن هناك مستخدمين
        const newUser = await storage.createUser({
          username: "admin",
          password: "password",
          name: "مدير النظام",
          email: "admin@example.com",
          role: "teacher"
        });
        (req as any).user = newUser;
        return next();
      }
    } catch (error) {
      console.error("Error in isAuthenticated middleware:", error);
      return next();
    }
  };

  const isTeacher = async (req: Request, res: Response, next: Function) => {
    try {
      // تجاوز التحقق من دور المعلم مؤقتاً للتطوير
      const users = await storage.getUsers();
      if (users.length > 0) {
        (req as any).user = users[0];
        return next();
      } else {
        // إنشاء مستخدم معلم للاختبار
        const newUser = await storage.createUser({
          username: "admin",
          password: "password",
          name: "مدير النظام",
          email: "admin@example.com",
          role: "teacher"
        });
        (req as any).user = newUser;
        return next();
      }
    } catch (error) {
      console.error("Error in isTeacher middleware:", error);
      return next();
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username, email: user.email, name: user.name, role: user.role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/current-user", async (req, res) => {
    // للاختبار فقط - سيتم استبداله بنظام المصادقة الصحيح
    try {
      const users = await storage.getUsers();
      if (users.length > 0) {
        const testUser = users[0];
        res.json({ 
          id: testUser.id, 
          username: testUser.username, 
          email: testUser.email, 
          name: testUser.name, 
          role: testUser.role 
        });
        return;
      } else {
        // إنشاء مستخدم اختبار إذا لم يكن هناك مستخدمين
        const newUser = await storage.createUser({
          username: "admin",
          password: "password",
          name: "مدير النظام",
          email: "admin@example.com",
          role: "teacher"
        });
        
        res.json({ 
          id: newUser.id, 
          username: newUser.username, 
          email: newUser.email, 
          name: newUser.name, 
          role: newUser.role 
        });
        return;
      }
    } catch (error) {
      console.error("Error in /api/auth/current-user:", error);
      res.status(500).json({ message: "خطأ في المصادقة" });
    }
  });

  // Exam routes
  
  // طريق للوصول للاختبار باستخدام رمز المشاركة
  app.get("/api/exams/code/:shareCode", async (req, res) => {
    try {
      const { shareCode } = req.params;
      if (!shareCode) {
        return res.status(400).json({ message: "رمز المشاركة مطلوب" });
      }
      
      const exam = await storage.getExamByShareCode(shareCode);
      if (!exam) {
        return res.status(404).json({ message: "لم يتم العثور على اختبار بهذا الرمز" });
      }
      
      if (exam.status !== "active") {
        return res.status(403).json({ message: "هذا الاختبار غير متاح حالياً" });
      }
      
      return res.json(exam);
    } catch (error) {
      console.error("Error getting exam by share code:", error);
      return res.status(500).json({ message: "خطأ في الخادم" });
    }
  });
  
  // طريق إنشاء اختبار جديد
  app.post("/api/exams", isTeacher, async (req, res) => {
    try {
      const user = req.user as any;
      
      // المعلومات الأساسية للاختبار
      const examData = {
        title: req.body.title,
        subject: req.body.subject,
        description: req.body.description || null,
        duration: parseInt(req.body.duration) || 60,
        status: req.body.status || "draft",
        userId: user.id,
        fileUrl: null // سنضيف دعم الملفات لاحقاً
      };
      
      // إنشاء الاختبار في قاعدة البيانات
      const exam = await storage.createExam(examData);
      console.log("Created exam:", exam);
      
      // إرجاع الاختبار الذي تم إنشاؤه
      res.status(201).json(exam);
    } catch (error) {
      console.error("Error creating exam:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      } else {
        res.status(500).json({ message: "خطأ في الخادم" });
      }
    }
  });

  app.get("/api/exams", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role === "teacher") {
        const exams = await storage.getExamsByUser(user.id);
        res.json(exams);
      } else {
        // Students see only active exams
        const allExams = await storage.getAllExams();
        const activeExams = allExams.filter(exam => exam.status === "active");
        res.json(activeExams);
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/exams/:id", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      
      // Teachers can see their own exams
      if (user.role === "teacher" && exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Students can only see active exams
      if (user.role === "student" && exam.status !== "active") {
        return res.status(403).json({ message: "Exam is not active" });
      }
      
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/exams/:id", isTeacher, upload.single("file"), async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      let fileUrl = exam.fileUrl;
      if (req.file) {
        // Remove old file if exists
        if (exam.fileUrl) {
          const oldFilePath = path.join(process.cwd(), exam.fileUrl);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        fileUrl = `/uploads/${req.file.filename}`;
      }
      
      const updatedExamData = {
        ...req.body,
        fileUrl,
      };
      
      const updatedExam = await storage.updateExam(examId, updatedExamData);
      res.json(updatedExam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.delete("/api/exams/:id", isTeacher, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Delete any attached file
      if (exam.fileUrl) {
        const filePath = path.join(process.cwd(), exam.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteExam(examId);
      res.json({ message: "Exam deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Question routes
  app.post("/api/exams/:examId/questions", isTeacher, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        examId,
      });
      
      const question = await storage.createQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.get("/api/exams/:examId/questions", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      
      // Teachers can see questions for their own exams
      if (user.role === "teacher" && exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Students can only see questions for active exams
      if (user.role === "student" && exam.status !== "active") {
        return res.status(403).json({ message: "Exam is not active" });
      }
      
      const questions = await storage.getQuestionsByExam(examId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/questions/:id", isTeacher, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const exam = await storage.getExam(question.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedQuestion = await storage.updateQuestion(questionId, req.body);
      res.json(updatedQuestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.delete("/api/questions/:id", isTeacher, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const exam = await storage.getExam(question.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteQuestion(questionId);
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Exam Attempt routes
  app.post("/api/exams/:examId/attempts", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      if (exam.status !== "active") {
        return res.status(400).json({ message: "Exam is not active" });
      }
      
      const user = req.user as any;
      
      // Check if user already has an attempt
      const attempts = await storage.getExamAttemptsByUser(user.id);
      const existingAttempt = attempts.find(a => a.examId === examId && a.completedAt === null);
      
      if (existingAttempt) {
        return res.json(existingAttempt);
      }
      
      // Get all questions to calculate max score
      const questions = await storage.getQuestionsByExam(examId);
      const maxScore = questions.reduce((total, q) => total + q.points, 0);
      
      const attemptData = insertExamAttemptSchema.parse({
        examId,
        userId: user.id,
        maxScore,
      });
      
      const attempt = await storage.createExamAttempt(attemptData);
      res.status(201).json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.get("/api/exams/:examId/attempts", isTeacher, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const attempts = await storage.getExamAttemptsByExam(examId);
      
      // Enrich attempts with user information
      const enrichedAttempts = [];
      
      for (const attempt of attempts) {
        const student = await storage.getUser(attempt.userId);
        enrichedAttempts.push({
          ...attempt,
          student: student ? {
            id: student.id,
            name: student.name,
            username: student.username,
            email: student.email
          } : null
        });
      }
      
      res.json(enrichedAttempts);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/attempts/:id", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const attempt = await storage.getExamAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const user = req.user as any;
      const exam = await storage.getExam(attempt.examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Students can only see their own attempts
      if (user.role === "student" && attempt.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Teachers can only see attempts for their exams
      if (user.role === "teacher" && exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get answers for this attempt
      const answers = await storage.getAnswersByAttempt(attemptId);
      
      res.json({
        attempt,
        answers
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/attempts/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const attempt = await storage.getExamAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const user = req.user as any;
      if (attempt.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (attempt.completedAt) {
        return res.status(400).json({ message: "Attempt already completed" });
      }
      
      const completedAt = new Date();
      const timeSpent = Math.floor((completedAt.getTime() - attempt.startedAt.getTime()) / 1000);
      
      // Get all answers and calculate score
      const answers = await storage.getAnswersByAttempt(attemptId);
      const score = answers.reduce((total, answer) => {
        return total + (answer.score || 0);
      }, 0);
      
      const updatedAttempt = await storage.updateExamAttempt(attemptId, {
        completedAt,
        timeSpent,
        score
      });
      
      res.json(updatedAttempt);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Answer routes
  app.post("/api/attempts/:attemptId/answers", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.attemptId);
      const attempt = await storage.getExamAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const user = req.user as any;
      if (attempt.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (attempt.completedAt) {
        return res.status(400).json({ message: "Attempt already completed" });
      }
      
      const answerData = insertAnswerSchema.parse({
        ...req.body,
        attemptId,
      });
      
      // Check if answer already exists for this question
      const answers = await storage.getAnswersByAttempt(attemptId);
      const existingAnswer = answers.find(a => a.questionId === answerData.questionId);
      
      if (existingAnswer) {
        // Update existing answer
        const updatedAnswer = await storage.updateAnswer(existingAnswer.id, {
          answer: answerData.answer
        });
        
        // Grade the answer
        const question = await storage.getQuestion(answerData.questionId);
        if (question && question.type !== 'essay') {
          let isCorrect = false;
          let score = 0;
          
          if (question.type === 'multiple_choice') {
            isCorrect = answerData.answer === question.correctAnswer;
            score = isCorrect ? question.points : 0;
          } else if (question.type === 'true_false') {
            isCorrect = answerData.answer === question.correctAnswer;
            score = isCorrect ? question.points : 0;
          }
          
          await storage.updateAnswer(existingAnswer.id, {
            isCorrect,
            score
          });
        }
        
        return res.json(updatedAnswer);
      }
      
      // Create new answer
      const answer = await storage.createAnswer(answerData);
      
      // Grade the answer if it's not an essay
      const question = await storage.getQuestion(answerData.questionId);
      if (question && question.type !== 'essay') {
        let isCorrect = false;
        let score = 0;
        
        if (question.type === 'multiple_choice') {
          isCorrect = answerData.answer === question.correctAnswer;
          score = isCorrect ? question.points : 0;
        } else if (question.type === 'true_false') {
          isCorrect = answerData.answer === question.correctAnswer;
          score = isCorrect ? question.points : 0;
        }
        
        await storage.updateAnswer(answer.id, {
          isCorrect,
          score
        });
      }
      
      res.status(201).json(answer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.put("/api/answers/:id/grade", isTeacher, async (req, res) => {
    try {
      const answerId = parseInt(req.params.id);
      const answer = await storage.getAnswer(answerId);
      
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      
      const attempt = await storage.getExamAttempt(answer.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const exam = await storage.getExam(attempt.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { score, isCorrect } = req.body;
      
      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: "Invalid score" });
      }
      
      const question = await storage.getQuestion(answer.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      if (score > question.points) {
        return res.status(400).json({ message: "Score cannot exceed question points" });
      }
      
      const updatedAnswer = await storage.updateAnswer(answerId, {
        score,
        isCorrect: !!isCorrect,
        manuallyGraded: true
      });
      
      // Update attempt score
      const answers = await storage.getAnswersByAttempt(attempt.id);
      const totalScore = answers.reduce((total, a) => total + (a.score || 0), 0);
      
      await storage.updateExamAttempt(attempt.id, {
        score: totalScore
      });
      
      res.json(updatedAnswer);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Grading Request routes
  app.post("/api/answers/:answerId/grading-requests", isAuthenticated, async (req, res) => {
    try {
      const answerId = parseInt(req.params.answerId);
      const answer = await storage.getAnswer(answerId);
      
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      
      const attempt = await storage.getExamAttempt(answer.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const user = req.user as any;
      if (attempt.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const requestData = insertGradingRequestSchema.parse({
        ...req.body,
        answerId,
      });
      
      const request = await storage.createGradingRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.get("/api/grading-requests", isTeacher, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get all pending requests
      const pendingRequests = await storage.getPendingGradingRequests();
      
      // Filter to only include requests for this teacher's exams
      const filteredRequests = [];
      
      for (const request of pendingRequests) {
        const answer = await storage.getAnswer(request.answerId);
        if (!answer) continue;
        
        const attempt = await storage.getExamAttempt(answer.attemptId);
        if (!attempt) continue;
        
        const exam = await storage.getExam(attempt.examId);
        if (!exam || exam.userId !== user.id) continue;
        
        const question = await storage.getQuestion(answer.questionId);
        const student = await storage.getUser(attempt.userId);
        
        filteredRequests.push({
          ...request,
          answer,
          question,
          exam,
          student: student ? {
            id: student.id,
            name: student.name,
            username: student.username,
            email: student.email
          } : null
        });
      }
      
      res.json(filteredRequests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/grading-requests/:id", isTeacher, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getGradingRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Grading request not found" });
      }
      
      const answer = await storage.getAnswer(request.answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }
      
      const attempt = await storage.getExamAttempt(answer.attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      const exam = await storage.getExam(attempt.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      const user = req.user as any;
      if (exam.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { status, comment, score } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedRequest = await storage.updateGradingRequest(requestId, {
        status,
        comment,
        resolvedAt: new Date()
      });
      
      // If approved, update the answer score
      if (status === 'approved' && typeof score === 'number') {
        const question = await storage.getQuestion(answer.questionId);
        if (!question) {
          return res.status(404).json({ message: "Question not found" });
        }
        
        if (score > question.points) {
          return res.status(400).json({ message: "Score cannot exceed question points" });
        }
        
        await storage.updateAnswer(answer.id, {
          score,
          isCorrect: score > 0,
          manuallyGraded: true
        });
        
        // Update attempt score
        const answers = await storage.getAnswersByAttempt(attempt.id);
        const totalScore = answers.reduce((total, a) => total + (a.score || 0), 0);
        
        await storage.updateExamAttempt(attempt.id, {
          score: totalScore
        });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Student results
  app.get("/api/results", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (user.role === 'student') {
        // Get student's own results
        const attempts = await storage.getExamAttemptsByUser(user.id);
        
        // Enrich attempts with exam data
        const enrichedAttempts = [];
        
        for (const attempt of attempts) {
          const exam = await storage.getExam(attempt.examId);
          enrichedAttempts.push({
            ...attempt,
            exam: exam || null
          });
        }
        
        res.json(enrichedAttempts);
      } else {
        // Teacher gets all results
        const exams = await storage.getExamsByUser(user.id);
        
        const examResults = [];
        
        for (const exam of exams) {
          const attempts = await storage.getExamAttemptsByExam(exam.id);
          
          // Enrich attempts with student data
          const enrichedAttempts = [];
          
          for (const attempt of attempts) {
            const student = await storage.getUser(attempt.userId);
            enrichedAttempts.push({
              ...attempt,
              student: student ? {
                id: student.id,
                name: student.name,
                username: student.username,
                email: student.email
              } : null
            });
          }
          
          examResults.push({
            exam,
            attempts: enrichedAttempts
          });
        }
        
        res.json(examResults);
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir, { fallthrough: true }));

  const httpServer = createServer(app);
  return httpServer;
}
