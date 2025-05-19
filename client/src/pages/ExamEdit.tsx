import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Question types
type QuestionType = "essay" | "multiple_choice" | "true_false";

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: number | string;
  type: QuestionType;
  text: string;
  points: number;
  order: number;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

interface Exam {
  id: number;
  title: string;
  subject: string;
  description: string;
  duration: number;
  status: string;
  createdAt: string;
  userId: number;
  fileUrl?: string;
}

export default function ExamEdit() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const examId = location.split("/")[2];
  const [activeTab, setActiveTab] = useState("details");
  const [examFile, setExamFile] = useState<File | null>(null);
  
  // Exam details
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [status, setStatus] = useState("draft");
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: Date.now().toString(),
    type: "multiple_choice",
    text: "",
    points: 1,
    order: 0,
    options: [
      { id: "1", text: "" },
      { id: "2", text: "" },
      { id: "3", text: "" },
      { id: "4", text: "" }
    ],
    correctAnswer: ""
  });
  
  // For essay questions with multiple correct answers
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([""]);
  
  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Fetch exam details
  const { data: exam, isLoading: isExamLoading } = useQuery<Exam>({
    queryKey: [`/api/exams/${examId}`],
  });
  
  // Fetch questions
  const { data: fetchedQuestions, isLoading: isQuestionsLoading } = useQuery<Question[]>({
    queryKey: [`/api/exams/${examId}/questions`],
    onSuccess: (data) => {
      setQuestions(data.map(q => {
        // Format correctAnswer for essay questions
        if (q.type === "essay" && Array.isArray(q.correctAnswer)) {
          return { ...q };
        }
        return q;
      }));
    },
  });
  
  // Update exam mutation
  const updateExamMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update exam");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "تم تحديث الاختبار",
        description: "تم تحديث الاختبار بنجاح",
      });
      
      navigate(`/exams/${examId}`);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث الاختبار",
        variant: "destructive",
      });
    }
  });
  
  // Question mutations
  const addQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      const res = await apiRequest("POST", `/api/exams/${examId}/questions`, questionData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}/questions`] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة السؤال",
        variant: "destructive",
      });
    }
  });
  
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PUT", `/api/questions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}/questions`] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث السؤال",
        variant: "destructive",
      });
    }
  });
  
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}/questions`] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حذف السؤال",
        variant: "destructive",
      });
    }
  });
  
  // Set up form with exam data
  useEffect(() => {
    if (exam) {
      setTitle(exam.title);
      setSubject(exam.subject);
      setDescription(exam.description || "");
      setDuration(String(exam.duration));
      setStatus(exam.status);
    }
  }, [exam]);

  const validateExamDetails = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = "عنوان الاختبار مطلوب";
    }
    
    if (!subject.trim()) {
      newErrors.subject = "المادة مطلوبة";
    }
    
    if (!duration.trim() || isNaN(Number(duration)) || Number(duration) <= 0) {
      newErrors.duration = "مدة الاختبار يجب أن تكون رقماً موجباً";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateQuestion = (question: Question) => {
    const newErrors: Record<string, string> = {};
    
    if (!question.text.trim()) {
      newErrors.questionText = "نص السؤال مطلوب";
    }
    
    if (question.type === "multiple_choice") {
      if (question.options) {
        // Ensure at least two options have text
        const filledOptions = question.options.filter(opt => opt.text.trim());
        if (filledOptions.length < 2) {
          newErrors.options = "يجب إضافة خيارين على الأقل";
        }
      }
      
      if (!question.correctAnswer) {
        newErrors.correctAnswer = "الإجابة الصحيحة مطلوبة";
      }
    }
    
    if (question.type === "essay" && multipleAnswers.every(ans => !ans.trim())) {
      newErrors.essayAnswer = "يجب إضافة إجابة واحدة على الأقل";
    }
    
    if (question.type === "true_false" && !question.correctAnswer) {
      newErrors.trueFalseAnswer = "الإجابة الصحيحة مطلوبة";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTabChange = (value: string) => {
    if (value === "questions" && activeTab === "details") {
      // Validate details before moving to questions tab
      if (!validateExamDetails()) {
        toast({
          title: "يرجى تعبئة جميع الحقول المطلوبة",
          description: "يجب إكمال تفاصيل الاختبار قبل إضافة الأسئلة",
          variant: "destructive",
        });
        return;
      }
    }
    setActiveTab(value);
  };

  const handleAddQuestion = () => {
    if (!validateQuestion(currentQuestion)) {
      return;
    }
    
    // Create a copy of the current question
    let questionToAdd = { ...currentQuestion };
    
    // Set correct answer for essay type
    if (currentQuestion.type === "essay") {
      questionToAdd.correctAnswer = multipleAnswers.filter(ans => ans.trim());
    }
    
    // Prepare data for API
    const questionData = {
      examId: parseInt(examId),
      type: questionToAdd.type,
      text: questionToAdd.text,
      points: questionToAdd.points,
      order: questions.length,
      options: questionToAdd.type === "multiple_choice" ? questionToAdd.options : undefined,
      correctAnswer: questionToAdd.type === "essay" 
        ? multipleAnswers.filter(ans => ans.trim())
        : questionToAdd.correctAnswer
    };
    
    // Add to database
    addQuestionMutation.mutate(questionData, {
      onSuccess: (newQuestion) => {
        setQuestions([...questions, newQuestion]);
        
        // Reset for next question
        setCurrentQuestion({
          id: Date.now().toString(),
          type: "multiple_choice",
          text: "",
          points: 1,
          order: questions.length + 1,
          options: [
            { id: "1", text: "" },
            { id: "2", text: "" },
            { id: "3", text: "" },
            { id: "4", text: "" }
          ],
          correctAnswer: ""
        });
        
        setMultipleAnswers([""]);
        
        toast({
          title: "تمت إضافة السؤال",
          description: "تمت إضافة السؤال بنجاح",
        });
      }
    });
  };

  const handleRemoveQuestion = (id: number | string) => {
    if (typeof id === 'number') {
      deleteQuestionMutation.mutate(id, {
        onSuccess: () => {
          setQuestions(questions.filter(q => q.id !== id));
          toast({
            title: "تم حذف السؤال",
            description: "تم حذف السؤال بنجاح",
          });
        }
      });
    } else {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleOptionChange = (optionId: string, value: string) => {
    if (!currentQuestion.options) return;
    
    setCurrentQuestion({
      ...currentQuestion,
      options: currentQuestion.options.map(opt => 
        opt.id === optionId ? { ...opt, text: value } : opt
      )
    });
  };

  const handleCorrectOptionChange = (optionId: string) => {
    setCurrentQuestion({
      ...currentQuestion,
      correctAnswer: optionId
    });
  };

  const handleMultipleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...multipleAnswers];
    newAnswers[index] = value;
    setMultipleAnswers(newAnswers);
    
    // Add a new empty field if the last one is being filled
    if (index === multipleAnswers.length - 1 && value.trim()) {
      setMultipleAnswers([...newAnswers, ""]);
    }
  };

  const handleRemoveAnswer = (index: number) => {
    if (multipleAnswers.length > 1) {
      const newAnswers = [...multipleAnswers];
      newAnswers.splice(index, 1);
      setMultipleAnswers(newAnswers);
    }
  };

  const handleSubmit = (newStatus?: string) => {
    if (!validateExamDetails()) {
      toast({
        title: "يرجى تعبئة جميع الحقول المطلوبة",
        description: "يرجى التأكد من تعبئة جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("description", description);
    formData.append("duration", duration);
    formData.append("status", newStatus || status);
    
    if (examFile) {
      formData.append("file", examFile);
    }
    
    updateExamMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "حجم الملف كبير جداً",
          description: "يجب ألا يتجاوز حجم الملف 5 ميجابايت",
          variant: "destructive",
        });
        return;
      }
      setExamFile(file);
    }
  };

  if (isExamLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">تعديل الاختبار</h1>
          <p className="text-sm text-gray-500 dark:text-dark-200 flex items-center">
            <Badge variant={
              status === "active" ? "success" : 
              status === "draft" ? "outline" : 
              "secondary"
            }>
              {status === "active" ? "نشط" : status === "draft" ? "مسودة" : "مؤرشف"}
            </Badge>
            <span className="mr-2">- تم الإنشاء: {exam && new Date(exam.createdAt).toLocaleDateString("ar-EG")}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/exams/${examId}`)}>
          العودة للاختبار
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">تفاصيل الاختبار</TabsTrigger>
          <TabsTrigger value="questions">الأسئلة</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاختبار الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الاختبار <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="أدخل عنوان الاختبار"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">المادة <span className="text-red-500">*</span></Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className={errors.subject ? "border-red-500" : ""}>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الرياضيات">الرياضيات</SelectItem>
                    <SelectItem value="العلوم">العلوم</SelectItem>
                    <SelectItem value="اللغة العربية">اللغة العربية</SelectItem>
                    <SelectItem value="اللغة الإنجليزية">اللغة الإنجليزية</SelectItem>
                    <SelectItem value="الاجتماعيات">الاجتماعيات</SelectItem>
                    <SelectItem value="الحاسوب">الحاسوب</SelectItem>
                    <SelectItem value="الفيزياء">الفيزياء</SelectItem>
                    <SelectItem value="الكيمياء">الكيمياء</SelectItem>
                    <SelectItem value="الأحياء">الأحياء</SelectItem>
                    <SelectItem value="التاريخ">التاريخ</SelectItem>
                    <SelectItem value="الجغرافيا">الجغرافيا</SelectItem>
                    <SelectItem value="التربية الدينية">التربية الدينية</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
                {errors.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">وصف الاختبار</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أدخل وصفاً مختصراً للاختبار"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">مدة الاختبار (بالدقائق) <span className="text-red-500">*</span></Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: 60"
                  min="1"
                  className={errors.duration ? "border-red-500" : ""}
                />
                {errors.duration && <p className="text-sm text-red-500">{errors.duration}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file">ملف مرفق (اختياري)</Label>
                {exam?.fileUrl && (
                  <div className="mb-2 text-sm flex items-center text-primary-600 dark:text-primary-500">
                    <span className="material-icons text-sm ml-1">attachment</span>
                    <a href={exam.fileUrl} target="_blank" rel="noopener noreferrer">
                      عرض الملف المرفق حالياً
                    </a>
                  </div>
                )}
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  يمكنك إرفاق ملف بحجم أقصى 5 ميجابايت. سيستبدل الملف الحالي إن وجد.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => navigate(`/exams/${examId}`)}>
                إلغاء
              </Button>
              <div className="space-x-2 space-x-reverse">
                {status !== "draft" && (
                  <Button variant="outline" onClick={() => handleSubmit("draft")}>
                    حفظ كمسودة
                  </Button>
                )}
                {status !== "active" && (
                  <Button onClick={() => handleSubmit("active")}>
                    نشر الاختبار
                  </Button>
                )}
                <Button onClick={() => handleSubmit()}>
                  حفظ التغييرات
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إضافة الأسئلة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question-type">نوع السؤال</Label>
                <Select 
                  value={currentQuestion.type} 
                  onValueChange={(value) => setCurrentQuestion({
                    ...currentQuestion,
                    type: value as QuestionType
                  })}
                >
                  <SelectTrigger id="question-type">
                    <SelectValue placeholder="اختر نوع السؤال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">اختيار من متعدد</SelectItem>
                    <SelectItem value="true_false">صح/خطأ</SelectItem>
                    <SelectItem value="essay">مقالي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="question-text">نص السؤال <span className="text-red-500">*</span></Label>
                <Textarea
                  id="question-text"
                  value={currentQuestion.text}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    text: e.target.value
                  })}
                  placeholder="أدخل نص السؤال"
                  rows={2}
                  className={errors.questionText ? "border-red-500" : ""}
                />
                {errors.questionText && <p className="text-sm text-red-500">{errors.questionText}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="question-points">الدرجة</Label>
                <Input
                  id="question-points"
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    points: parseInt(e.target.value) || 1
                  })}
                  min="1"
                  max="100"
                />
              </div>
              
              {/* Multiple Choice Options */}
              {currentQuestion.type === "multiple_choice" && (
                <div className="space-y-4">
                  <Label>خيارات الإجابة <span className="text-red-500">*</span></Label>
                  {currentQuestion.options?.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 space-x-reverse">
                      <Input
                        type="radio"
                        className="h-4 w-4"
                        checked={currentQuestion.correctAnswer === option.id}
                        onChange={() => handleCorrectOptionChange(option.id)}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        placeholder={`الخيار ${option.id}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  {errors.options && <p className="text-sm text-red-500">{errors.options}</p>}
                  {errors.correctAnswer && <p className="text-sm text-red-500">{errors.correctAnswer}</p>}
                </div>
              )}
              
              {/* True/False Options */}
              {currentQuestion.type === "true_false" && (
                <div className="space-y-4">
                  <Label>الإجابة الصحيحة <span className="text-red-500">*</span></Label>
                  <div className="flex space-x-4 space-x-reverse">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Input
                        type="radio"
                        id="true-option"
                        className="h-4 w-4"
                        checked={currentQuestion.correctAnswer === "true"}
                        onChange={() => setCurrentQuestion({
                          ...currentQuestion,
                          correctAnswer: "true"
                        })}
                      />
                      <Label htmlFor="true-option">صح</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Input
                        type="radio"
                        id="false-option"
                        className="h-4 w-4"
                        checked={currentQuestion.correctAnswer === "false"}
                        onChange={() => setCurrentQuestion({
                          ...currentQuestion,
                          correctAnswer: "false"
                        })}
                      />
                      <Label htmlFor="false-option">خطأ</Label>
                    </div>
                  </div>
                  {errors.trueFalseAnswer && <p className="text-sm text-red-500">{errors.trueFalseAnswer}</p>}
                </div>
              )}
              
              {/* Essay Answer Options */}
              {currentQuestion.type === "essay" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>الإجابات المقبولة <span className="text-red-500">*</span></Label>
                    <div className="text-sm text-gray-500 dark:text-dark-300 flex items-center">
                      <span>يمكن قبول إجابات متعددة</span>
                    </div>
                  </div>
                  
                  {multipleAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center space-x-2 space-x-reverse">
                      <Textarea
                        value={answer}
                        onChange={(e) => handleMultipleAnswerChange(index, e.target.value)}
                        placeholder={`الإجابة ${index + 1}`}
                        className="flex-1"
                        rows={2}
                      />
                      {multipleAnswers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAnswer(index)}
                        >
                          <span className="material-icons text-red-500">remove_circle</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  {errors.essayAnswer && <p className="text-sm text-red-500">{errors.essayAnswer}</p>}
                </div>
              )}
              
              <Button type="button" onClick={handleAddQuestion} className="w-full">
                إضافة السؤال
              </Button>
            </CardContent>
          </Card>
          
          {/* Preview of questions */}
          {isQuestionsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : questions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>الأسئلة ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900 dark:text-dark-100">
                        {index + 1}. {q.text}
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)}>
                        <span className="material-icons text-red-500">delete</span>
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-dark-300 mt-1">
                      {q.type === "multiple_choice" && "اختيار من متعدد"}
                      {q.type === "true_false" && "صح/خطأ"}
                      {q.type === "essay" && "مقالي"}
                      {` - ${q.points} ${q.points === 1 ? "درجة" : "درجات"}`}
                    </div>
                    
                    {q.type === "multiple_choice" && q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.filter(o => o.text).map((option: any) => (
                          <div key={option.id} className="flex items-center">
                            <span className={q.correctAnswer === option.id ? "text-green-500 font-bold" : ""}>
                              {option.text}
                              {q.correctAnswer === option.id && " ✓"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {q.type === "true_false" && (
                      <div className="mt-2">
                        <span className="font-medium">الإجابة الصحيحة: </span>
                        <span>{q.correctAnswer === "true" ? "صح" : "خطأ"}</span>
                      </div>
                    )}
                    
                    {q.type === "essay" && Array.isArray(q.correctAnswer) && (
                      <div className="mt-2">
                        <span className="font-medium">الإجابات المقبولة: </span>
                        <div className="text-sm mt-1">
                          {q.correctAnswer.map((ans: string, i: number) => (
                            <div key={i} className="p-1 bg-gray-50 dark:bg-dark-700 rounded my-1">{ans}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-gray-50 dark:bg-dark-800/50">
              <span className="material-icons text-4xl text-gray-400 dark:text-dark-300 mb-2">quiz</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100">لا توجد أسئلة</h3>
              <p className="text-sm text-gray-500 dark:text-dark-300 mt-1 mb-4">
                قم بإضافة أسئلة للاختبار باستخدام النموذج أعلاه
              </p>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => handleTabChange("details")}>
              العودة للتفاصيل
            </Button>
            <div className="space-x-2 space-x-reverse">
              <Button onClick={() => handleSubmit()}>
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
