import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface Question {
  id: number;
  type: string;
  text: string;
  points: number;
  order: number;
  options?: { id: string; text: string }[];
  correctAnswer?: string | string[];
}

interface Exam {
  id: number;
  title: string;
  subject: string;
  description?: string;
  duration: number;
  status: string;
  createdAt: string;
  userId: number;
  fileUrl?: string;
}

interface Attempt {
  id: number;
  examId: number;
  userId: number;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  maxScore: number;
  timeSpent: number | null;
}

interface Answer {
  id?: number;
  attemptId: number;
  questionId: number;
  answer: string;
  isCorrect?: boolean;
  score?: number;
}

export default function ExamTake() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const examId = parseInt(location.split("/")[2]);
  
  // State for exam progress
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examComplete, setExamComplete] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    timeSpent: number;
  } | null>(null);
  
  // Timer ref to clear interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch exam details
  const { data: exam, isLoading: isExamLoading } = useQuery<Exam>({
    queryKey: [`/api/exams/${examId}`],
  });
  
  // Fetch questions
  const { data: questions, isLoading: isQuestionsLoading } = useQuery<Question[]>({
    queryKey: [`/api/exams/${examId}/questions`],
  });
  
  // Start attempt mutation
  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/exams/${examId}/attempts`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      setAttempt(data);
      // Set timer
      if (exam) {
        setTimeLeft(exam.duration * 60);
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء بدء الاختبار",
        variant: "destructive",
      });
    },
  });
  
  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async ({ attemptId, questionId, answer }: { attemptId: number; questionId: number; answer: string }) => {
      const res = await apiRequest("POST", `/api/attempts/${attemptId}/answers`, {
        questionId,
        answer,
      });
      return await res.json();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الإجابة",
        variant: "destructive",
      });
    },
  });
  
  // Complete attempt mutation
  const completeAttemptMutation = useMutation({
    mutationFn: async (attemptId: number) => {
      const res = await apiRequest("PUT", `/api/attempts/${attemptId}/complete`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      setExamComplete(true);
      
      const resultData = {
        score: data.score || 0,
        maxScore: data.maxScore,
        percentage: data.score ? (data.score / data.maxScore) * 100 : 0,
        timeSpent: data.timeSpent || 0,
      };
      
      setResult(resultData);
      
      toast({
        title: "تم إكمال الاختبار",
        description: "تم تقديم إجاباتك بنجاح",
      });
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إكمال الاختبار",
        variant: "destructive",
      });
    },
  });
  
  // Initialize attempt when the exam is loaded
  useEffect(() => {
    if (exam && questions && user && !attempt) {
      startAttemptMutation.mutate();
    }
  }, [exam, questions, user]);
  
  // Set up timer
  useEffect(() => {
    if (timeLeft !== null && !examComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Time's up, submit the exam
            if (attempt) {
              completeAttemptMutation.mutate(attempt.id);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [timeLeft, examComplete]);
  
  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
    
    // Save the answer if attempt exists
    if (attempt) {
      submitAnswerMutation.mutate({
        attemptId: attempt.id,
        questionId,
        answer: value,
      });
    }
  };
  
  const goToNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleSubmitExam = () => {
    if (attempt) {
      setIsSubmitting(true);
      completeAttemptMutation.mutate(attempt.id);
    }
  };
  
  if (isExamLoading || isQuestionsLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!exam || !questions) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">لم يتم العثور على الاختبار</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">الاختبار المطلوب غير موجود أو تم حذفه</p>
        <Button className="mt-4" onClick={() => navigate("/exams")}>
          العودة إلى الاختبارات
        </Button>
      </div>
    );
  }
  
  // Check if the exam is active
  if (exam.status !== "active") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400">هذا الاختبار غير متاح حالياً</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {exam.status === "draft" ? "هذا الاختبار لم يتم نشره بعد" : "هذا الاختبار تم أرشفته"}
        </p>
        <Button className="mt-4" onClick={() => navigate("/exams")}>
          العودة إلى الاختبارات المتاحة
        </Button>
      </div>
    );
  }
  
  // Show result page if exam is complete
  if (examComplete && result) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-primary-500">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">نتيجة الاختبار</CardTitle>
              <p className="text-gray-500 dark:text-dark-200">{exam.title}</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="text-center">
                <div className="inline-block rounded-full bg-gray-100 dark:bg-dark-800 p-6">
                  <span className="material-icons text-5xl text-primary-500">
                    {result.percentage >= 70 ? "emoji_events" : result.percentage >= 50 ? "check_circle" : "sentiment_satisfied"}
                  </span>
                </div>
                
                <h2 className="mt-4 text-3xl font-bold">
                  {result.score} / {result.maxScore}
                </h2>
                <p className="text-lg text-gray-500 dark:text-dark-200">
                  {result.percentage.toFixed(1)}%
                </p>
                
                <div className={`mt-2 text-lg font-medium ${
                  result.percentage >= 70 
                    ? "text-green-600 dark:text-green-400" 
                    : result.percentage >= 50 
                      ? "text-amber-600 dark:text-amber-400" 
                      : "text-red-600 dark:text-red-400"
                }`}>
                  {result.percentage >= 70 
                    ? "ممتاز! أحسنت" 
                    : result.percentage >= 50 
                      ? "جيد، يمكنك التحسين" 
                      : "تحتاج للمزيد من الدراسة"}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-dark-800/50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-300">المادة</p>
                  <p className="font-medium">{exam.subject}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-300">الوقت المستغرق</p>
                  <p className="font-medium">
                    {Math.floor(result.timeSpent / 60)} دقيقة و {result.timeSpent % 60} ثانية
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-300">عدد الأسئلة</p>
                  <p className="font-medium">{questions.length}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-300">تاريخ الاختبار</p>
                  <p className="font-medium">{new Date().toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-gray-700 dark:text-dark-200">
                  يمكنك مراجعة إجاباتك ومراجعة المعلم إذا كان لديك أي استفسار
                </p>
                {/* Button to request grading review could go here */}
              </div>
            </CardContent>
            <CardFooter className="justify-center pb-6">
              <Button onClick={() => navigate("/exams")} className="w-full max-w-xs">
                العودة إلى الاختبارات
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const questionProgress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Exam Header */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">{exam.title}</h1>
            
            <div className="flex items-center bg-gray-100 dark:bg-dark-800 px-3 py-1 rounded-full text-gray-700 dark:text-dark-200">
              <span className="material-icons ml-1 text-sm">timer</span>
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 dark:text-dark-300 mb-4">
            <span className="ml-2">{exam.subject}</span>
            <span className="mx-2">•</span>
            <span>{questions.length} سؤال</span>
            <span className="mx-2">•</span>
            <span>{exam.duration} دقيقة</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex-1">
              <Progress value={questionProgress} className="h-2" />
            </div>
            <span className="text-sm text-gray-500 dark:text-dark-300 mr-2">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
        
        {/* Question Card */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <Badge variant="outline">
                {currentQuestion.points} {currentQuestion.points === 1 ? "درجة" : "درجات"}
              </Badge>
              <Badge>
                {currentQuestion.type === "multiple_choice" && "اختيار من متعدد"}
                {currentQuestion.type === "true_false" && "صح/خطأ"}
                {currentQuestion.type === "essay" && "سؤال مقالي"}
              </Badge>
            </div>
            <CardTitle className="mt-2 text-lg">
              {currentQuestionIndex + 1}. {currentQuestion.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Multiple Choice Question */}
            {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
              <RadioGroup 
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="space-y-3"
              >
                {currentQuestion.options.filter((o: any) => o.text).map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`} className="font-normal">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {/* True/False Question */}
            {currentQuestion.type === "true_false" && (
              <RadioGroup 
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="true" id="true-option" />
                  <Label htmlFor="true-option" className="font-normal">صح</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="false" id="false-option" />
                  <Label htmlFor="false-option" className="font-normal">خطأ</Label>
                </div>
              </RadioGroup>
            )}
            
            {/* Essay Question */}
            {currentQuestion.type === "essay" && (
              <div className="space-y-2">
                <Label htmlFor="essay-answer">إجابتك:</Label>
                <Textarea 
                  id="essay-answer"
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  rows={5}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
              السابق
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={goToNextQuestion}>
                التالي
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    إنهاء الاختبار
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد من إنهاء الاختبار؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      بعد تقديم الاختبار، لن تتمكن من العودة وتغيير إجاباتك.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitExam} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري التقديم...
                        </span>
                      ) : (
                        "تقديم الاختبار"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>
        
        {/* Question Navigation */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-dark-200 mb-3">تنقل بين الأسئلة:</h3>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={index === currentQuestionIndex ? "default" : answers[q.id] ? "outline" : "ghost"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 p-0 ${answers[q.id] ? "border-green-500 dark:border-green-700" : ""}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
