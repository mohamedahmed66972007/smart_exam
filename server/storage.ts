import { 
  users, User, InsertUser, 
  exams, Exam, InsertExam,
  questions, Question, InsertQuestion,
  examAttempts, ExamAttempt, InsertExamAttempt,
  answers, Answer, InsertAnswer,
  gradingRequests, GradingRequest, InsertGradingRequest
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Exams
  createExam(exam: InsertExam): Promise<Exam>;
  getExam(id: number): Promise<Exam | undefined>;
  getExamByShareCode(shareCode: string): Promise<Exam | undefined>;
  updateExam(id: number, exam: Partial<Exam>): Promise<Exam | undefined>;
  deleteExam(id: number): Promise<boolean>;
  getExamsByUser(userId: number): Promise<Exam[]>;
  getAllExams(): Promise<Exam[]>;

  // Questions
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: number): Promise<Question | undefined>;
  updateQuestion(id: number, question: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  getQuestionsByExam(examId: number): Promise<Question[]>;

  // Exam Attempts
  createExamAttempt(attempt: InsertExamAttempt): Promise<ExamAttempt>;
  getExamAttempt(id: number): Promise<ExamAttempt | undefined>;
  updateExamAttempt(id: number, attempt: Partial<ExamAttempt>): Promise<ExamAttempt | undefined>;
  getExamAttemptsByUser(userId: number): Promise<ExamAttempt[]>;
  getExamAttemptsByExam(examId: number): Promise<ExamAttempt[]>;

  // Answers
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswer(id: number): Promise<Answer | undefined>;
  updateAnswer(id: number, answer: Partial<Answer>): Promise<Answer | undefined>;
  getAnswersByAttempt(attemptId: number): Promise<Answer[]>;

  // Grading Requests
  createGradingRequest(request: InsertGradingRequest): Promise<GradingRequest>;
  getGradingRequest(id: number): Promise<GradingRequest | undefined>;
  updateGradingRequest(id: number, request: Partial<GradingRequest>): Promise<GradingRequest | undefined>;
  getGradingRequestsByUser(userId: number): Promise<GradingRequest[]>;
  getPendingGradingRequests(): Promise<GradingRequest[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private exams: Map<number, Exam>;
  private questions: Map<number, Question>;
  private examAttempts: Map<number, ExamAttempt>;
  private answers: Map<number, Answer>;
  private gradingRequests: Map<number, GradingRequest>;
  
  private userIdCounter: number;
  private examIdCounter: number;
  private questionIdCounter: number;
  private attemptIdCounter: number;
  private answerIdCounter: number;
  private requestIdCounter: number;

  constructor() {
    this.users = new Map();
    this.exams = new Map();
    this.questions = new Map();
    this.examAttempts = new Map();
    this.answers = new Map();
    this.gradingRequests = new Map();
    
    this.userIdCounter = 1;
    this.examIdCounter = 1;
    this.questionIdCounter = 1;
    this.attemptIdCounter = 1;
    this.answerIdCounter = 1;
    this.requestIdCounter = 1;

    // Create a default admin user
    this.createUser({
      username: "admin",
      password: "adminpassword", // In a real app, this would be hashed
      email: "admin@example.com",
      name: "Admin User",
      role: "teacher"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { 
      ...userData, 
      id, 
      createdAt,
      role: userData.role || "student" // Ensure role is always set
    };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Exam methods
  // وظيفة مساعدة لتوليد رمز مشاركة عشوائي مكون من 6 أحرف
  private generateShareCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // حروف وأرقام مميزة بوضوح
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async createExam(examData: InsertExam): Promise<Exam> {
    const id = this.examIdCounter++;
    const createdAt = new Date();
    
    // إنشاء رمز مشاركة فريد
    const shareCode = this.generateShareCode();
    
    const exam: Exam = { 
      ...examData, 
      id, 
      createdAt,
      status: examData.status || "draft",
      description: examData.description || null,
      fileUrl: examData.fileUrl || null,
      shareCode: shareCode,
      isPublic: examData.isPublic || false
    };
    this.exams.set(id, exam);
    return exam;
  }

  async getExam(id: number): Promise<Exam | undefined> {
    return this.exams.get(id);
  }
  
  async getExamByShareCode(shareCode: string): Promise<Exam | undefined> {
    return Array.from(this.exams.values()).find(
      (exam) => exam.shareCode === shareCode
    );
  }

  async updateExam(id: number, examData: Partial<Exam>): Promise<Exam | undefined> {
    const exam = this.exams.get(id);
    if (!exam) return undefined;
    
    const updatedExam = { ...exam, ...examData };
    this.exams.set(id, updatedExam);
    return updatedExam;
  }

  async deleteExam(id: number): Promise<boolean> {
    return this.exams.delete(id);
  }

  async getExamsByUser(userId: number): Promise<Exam[]> {
    return Array.from(this.exams.values()).filter(
      (exam) => exam.userId === userId
    );
  }

  async getAllExams(): Promise<Exam[]> {
    return Array.from(this.exams.values());
  }

  // Question methods
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const id = this.questionIdCounter++;
    const question: Question = { 
      ...questionData, 
      id,
      options: questionData.options || null,
      order: questionData.order || 0,
      points: questionData.points || 0,
      correctAnswer: questionData.correctAnswer || null
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async updateQuestion(id: number, questionData: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...questionData };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    return this.questions.delete(id);
  }

  async getQuestionsByExam(examId: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((question) => question.examId === examId)
      .sort((a, b) => a.order - b.order);
  }

  // Exam Attempt methods
  async createExamAttempt(attemptData: InsertExamAttempt): Promise<ExamAttempt> {
    const id = this.attemptIdCounter++;
    const attempt: ExamAttempt = { 
      ...attemptData, 
      id, 
      startedAt: new Date(), 
      completedAt: null, 
      score: null, 
      timeSpent: null 
    };
    this.examAttempts.set(id, attempt);
    return attempt;
  }

  async getExamAttempt(id: number): Promise<ExamAttempt | undefined> {
    return this.examAttempts.get(id);
  }

  async updateExamAttempt(id: number, attemptData: Partial<ExamAttempt>): Promise<ExamAttempt | undefined> {
    const attempt = this.examAttempts.get(id);
    if (!attempt) return undefined;
    
    const updatedAttempt = { ...attempt, ...attemptData };
    this.examAttempts.set(id, updatedAttempt);
    return updatedAttempt;
  }

  async getExamAttemptsByUser(userId: number): Promise<ExamAttempt[]> {
    return Array.from(this.examAttempts.values()).filter(
      (attempt) => attempt.userId === userId
    );
  }

  async getExamAttemptsByExam(examId: number): Promise<ExamAttempt[]> {
    return Array.from(this.examAttempts.values()).filter(
      (attempt) => attempt.examId === examId
    );
  }

  // Answer methods
  async createAnswer(answerData: InsertAnswer): Promise<Answer> {
    const id = this.answerIdCounter++;
    const answer: Answer = { 
      ...answerData, 
      id, 
      isCorrect: null, 
      score: null, 
      manuallyGraded: false 
    };
    this.answers.set(id, answer);
    return answer;
  }

  async getAnswer(id: number): Promise<Answer | undefined> {
    return this.answers.get(id);
  }

  async updateAnswer(id: number, answerData: Partial<Answer>): Promise<Answer | undefined> {
    const answer = this.answers.get(id);
    if (!answer) return undefined;
    
    const updatedAnswer = { ...answer, ...answerData };
    this.answers.set(id, updatedAnswer);
    return updatedAnswer;
  }

  async getAnswersByAttempt(attemptId: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      (answer) => answer.attemptId === attemptId
    );
  }

  // Grading Request methods
  async createGradingRequest(requestData: InsertGradingRequest): Promise<GradingRequest> {
    const id = this.requestIdCounter++;
    const request: GradingRequest = { 
      ...requestData, 
      id, 
      requestedAt: new Date(), 
      status: "pending", 
      comment: requestData.comment || null,
      resolvedAt: null 
    };
    this.gradingRequests.set(id, request);
    return request;
  }

  async getGradingRequest(id: number): Promise<GradingRequest | undefined> {
    return this.gradingRequests.get(id);
  }

  async updateGradingRequest(id: number, requestData: Partial<GradingRequest>): Promise<GradingRequest | undefined> {
    const request = this.gradingRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, ...requestData };
    this.gradingRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getGradingRequestsByUser(userId: number): Promise<GradingRequest[]> {
    const userAnswers = Array.from(this.answers.values()).filter(answer => {
      const attempt = this.examAttempts.get(answer.attemptId);
      return attempt && attempt.userId === userId;
    });
    
    const userAnswerIds = userAnswers.map(answer => answer.id);
    
    return Array.from(this.gradingRequests.values()).filter(
      request => userAnswerIds.includes(request.answerId)
    );
  }

  async getPendingGradingRequests(): Promise<GradingRequest[]> {
    return Array.from(this.gradingRequests.values()).filter(
      request => request.status === "pending"
    );
  }
}

export const storage = new MemStorage();
