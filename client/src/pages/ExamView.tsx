import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";
import { exportToPDF, exportToWord } from "@/lib/exam-export";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

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
  shareCode?: string;
  isPublic?: boolean;
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
  student?: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
}

export default function ExamView() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const examId = parseInt(location.split("/")[2]);
  const [activeTab, setActiveTab] = useState("details");
  
  // Fetch exam details
  const { data: exam, isLoading: isExamLoading } = useQuery<Exam>({
    queryKey: [`/api/exams/${examId}`],
  });
  
  // Fetch questions
  const { data: questions, isLoading: isQuestionsLoading } = useQuery<Question[]>({
    queryKey: [`/api/exams/${examId}/questions`],
  });
  
  // Fetch attempts
  const { data: attempts, isLoading: isAttemptsLoading } = useQuery<Attempt[]>({
    queryKey: [`/api/exams/${examId}/attempts`],
  });
  
  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PUT", `/api/exams/${examId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      toast({
        title: "تم تحديث حالة الاختبار",
        description: "تم تغيير حالة الاختبار بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الاختبار",
        variant: "destructive",
      });
    },
  });
  
  // Delete exam mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/exams/${examId}`);
    },
    onSuccess: () => {
      toast({
        title: "تم حذف الاختبار",
        description: "تم حذف الاختبار بنجاح",
      });
      navigate("/exams");
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الاختبار",
        variant: "destructive",
      });
    },
  });
  
  const handleExportPDF = () => {
    if (exam && questions) {
      const examWithQuestions = {
        ...exam,
        questions,
      };
      
      exportToPDF(examWithQuestions);
      
      toast({
        title: "تم التصدير بنجاح",
        description: "تم تصدير الاختبار إلى ملف PDF بنجاح",
      });
    }
  };
  
  const handleExportWord = () => {
    if (exam && questions) {
      const examWithQuestions = {
        ...exam,
        questions,
      };
      
      exportToWord(examWithQuestions);
      
      toast({
        title: "تم التصدير بنجاح",
        description: "تم تصدير الاختبار إلى ملف Word بنجاح",
      });
    }
  };
  
  const copyExamLink = () => {
    const link = `${window.location.origin}/exam/${examId}/take`;
    navigator.clipboard.writeText(link);
    toast({
      title: "تم نسخ الرابط",
      description: "تم نسخ رابط الاختبار إلى الحافظة",
    });
  };
  
  const copyShareCode = () => {
    if (exam?.shareCode) {
      navigator.clipboard.writeText(exam.shareCode);
      toast({
        title: "تم نسخ رمز المشاركة",
        description: "تم نسخ رمز المشاركة إلى الحافظة",
      });
    }
  };
  
  const changeStatus = (status: string) => {
    statusMutation.mutate(status);
  };
  
  const deleteExam = () => {
    deleteMutation.mutate();
  };
  
  if (isExamLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!exam) {
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
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">{exam.title}</h1>
          <div className="flex items-center mt-1 flex-wrap gap-2">
            <Badge variant={
              exam.status === "active" ? "success" : 
              exam.status === "draft" ? "outline" : 
              "secondary"
            }>
              {exam.status === "active" ? "نشط" : exam.status === "draft" ? "مسودة" : "مؤرشف"}
            </Badge>
            <span className="text-sm text-gray-500 dark:text-dark-200">
              {exam.subject}
            </span>
            <span className="text-sm text-gray-500 dark:text-dark-200">
              <span className="material-icons text-sm ml-1 inline-flex items-center">schedule</span>
              {exam.duration} دقيقة
            </span>
            <span className="text-sm text-gray-500 dark:text-dark-200">
              <span className="material-icons text-sm ml-1 inline-flex items-center">event</span>
              {new Date(exam.createdAt).toLocaleDateString("ar-EG")}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/exams")}>
            العودة للاختبارات
          </Button>
          
          <Button variant="outline" onClick={() => navigate(`/exams/${examId}/edit`)}>
            <span className="material-icons ml-2 text-sm">edit</span>
            تعديل الاختبار
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <span className="material-icons ml-2 text-sm">delete</span>
                حذف الاختبار
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد من حذف الاختبار؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف الاختبار وجميع الأسئلة والإجابات المرتبطة به بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={deleteExam} className="bg-red-600 hover:bg-red-700">
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">حالة الاختبار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {exam.status === "draft" && (
                <Button onClick={() => changeStatus("active")} className="w-full justify-start">
                  <span className="material-icons ml-2 text-sm">publish</span>
                  نشر الاختبار
                </Button>
              )}
              
              {exam.status === "active" && (
                <Button onClick={() => changeStatus("archived")} variant="outline" className="w-full justify-start">
                  <span className="material-icons ml-2 text-sm">archive</span>
                  أرشفة الاختبار
                </Button>
              )}
              
              {exam.status === "archived" && (
                <Button onClick={() => changeStatus("active")} className="w-full justify-start">
                  <span className="material-icons ml-2 text-sm">unarchive</span>
                  إعادة نشر الاختبار
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">مشاركة الاختبار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button onClick={copyExamLink} variant="outline" className="w-full justify-start">
                <span className="material-icons ml-2 text-sm">share</span>
                نسخ رابط المشاركة
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">تصدير الاختبار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button onClick={handleExportPDF} variant="outline" className="w-full justify-start">
                <span className="material-icons ml-2 text-sm">picture_as_pdf</span>
                تصدير كـ PDF
              </Button>
              
              <Button onClick={handleExportWord} variant="outline" className="w-full justify-start">
                <span className="material-icons ml-2 text-sm">description</span>
                تصدير كـ Word
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">تفاصيل الاختبار</TabsTrigger>
          <TabsTrigger value="questions">الأسئلة</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الاختبار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exam.description && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-100 mb-2">وصف الاختبار:</h3>
                  <p className="text-gray-700 dark:text-dark-200">{exam.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-900 dark:text-dark-100 mb-2">معلومات الاختبار:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-dark-300">المادة:</p>
                    <p className="text-gray-700 dark:text-dark-200">{exam.subject}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-dark-300">مدة الاختبار:</p>
                    <p className="text-gray-700 dark:text-dark-200">{exam.duration} دقيقة</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-dark-300">تاريخ الإنشاء:</p>
                    <p className="text-gray-700 dark:text-dark-200">{new Date(exam.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-dark-300">عدد الأسئلة:</p>
                    <p className="text-gray-700 dark:text-dark-200">{questions?.length || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* قسم مشاركة الاختبار */}
              <div className="mt-6 border-t border-gray-200 dark:border-dark-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-dark-100 mb-3">مشاركة الاختبار:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-dark-300">رمز المشاركة:</p>
                    <div className="flex items-center">
                      <code className="bg-gray-100 dark:bg-dark-800 px-3 py-1 rounded text-lg font-bold text-primary-600 dark:text-primary-400 mr-2">
                        {exam.shareCode || "غير متاح"}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={copyShareCode}
                        title="نسخ رمز المشاركة"
                      >
                        <span className="material-icons text-sm">content_copy</span>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-400">يمكن للمختبرين استخدام هذا الرمز للدخول إلى الاختبار</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-dark-300">رابط مباشر:</p>
                    <div className="flex items-center">
                      <Button 
                        onClick={copyExamLink}
                        className="w-full justify-center"
                      >
                        <span className="material-icons text-sm ml-1">link</span>
                        نسخ رابط الاختبار
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-400">يمكنك مشاركة هذا الرابط مباشرة مع المختبرين</p>
                  </div>
                </div>
              </div>
              
              {exam.fileUrl && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 dark:text-dark-100 mb-2">الملف المرفق:</h3>
                  <a 
                    href={exam.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-primary-600 dark:text-primary-500 hover:underline"
                  >
                    <span className="material-icons ml-2">attachment</span>
                    عرض الملف المرفق
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أسئلة الاختبار ({questions?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isQuestionsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : questions && questions.length > 0 ? (
                questions.sort((a, b) => a.order - b.order).map((question, index) => (
                  <div key={question.id} className="border p-4 rounded-md">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900 dark:text-dark-100">
                        {index + 1}. {question.text}
                      </h3>
                      <Badge variant="outline">
                        {question.points} {question.points === 1 ? "درجة" : "درجات"}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-dark-300 mt-1">
                      {question.type === "multiple_choice" && "اختيار من متعدد"}
                      {question.type === "true_false" && "صح/خطأ"}
                      {question.type === "essay" && "مقالي"}
                    </div>
                    
                    {question.type === "multiple_choice" && question.options && (
                      <div className="mt-2 space-y-1">
                        {question.options.filter((o: any) => o.text).map((option: any) => (
                          <div key={option.id} className="flex items-center">
                            <span className={question.correctAnswer === option.id ? "text-green-500 font-bold" : ""}>
                              {option.text}
                              {question.correctAnswer === option.id && " ✓"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.type === "true_false" && (
                      <div className="mt-2">
                        <span className="font-medium">الإجابة الصحيحة: </span>
                        <span>{question.correctAnswer === "true" ? "صح" : "خطأ"}</span>
                      </div>
                    )}
                    
                    {question.type === "essay" && Array.isArray(question.correctAnswer) && (
                      <div className="mt-2">
                        <span className="font-medium">الإجابات المقبولة: </span>
                        <div className="text-sm mt-1">
                          {question.correctAnswer.map((ans, i) => (
                            <div key={i} className="p-1 bg-gray-50 dark:bg-dark-700 rounded my-1">{ans}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border rounded-lg bg-gray-50 dark:bg-dark-800/50">
                  <span className="material-icons text-4xl text-gray-400 dark:text-dark-300 mb-2">quiz</span>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100">لا توجد أسئلة</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-300 mt-1 mb-4">
                    لم تتم إضافة أي أسئلة إلى هذا الاختبار بعد
                  </p>
                  <Button onClick={() => navigate(`/exams/${examId}/edit`)}>
                    إضافة أسئلة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نتائج الطلاب ({attempts?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isAttemptsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : attempts && attempts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          اسم الطالب
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          الدرجة
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          الوقت المستغرق
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          تاريخ الإنجاز
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          <span className="sr-only">إجراءات</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                      {attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-dark-700 flex items-center justify-center">
                                <span className="material-icons text-sm text-gray-600 dark:text-dark-200">
                                  person
                                </span>
                              </div>
                              <div className="mr-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-100">
                                  {attempt.student?.name || "طالب غير معروف"}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-dark-300">
                                  {attempt.student?.email || ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {attempt.completedAt ? (
                              <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                                !attempt.score ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                attempt.score / attempt.maxScore >= 0.7 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : attempt.score / attempt.maxScore >= 0.5
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {attempt.score === null ? "قيد التصحيح" : `${attempt.score}/${attempt.maxScore}`}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                غير مكتمل
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">
                            {attempt.timeSpent ? (
                              `${Math.floor(attempt.timeSpent / 60)} دقيقة و ${attempt.timeSpent % 60} ثانية`
                            ) : (
                              "غير منتهي"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">
                            {attempt.completedAt ? (
                              new Date(attempt.completedAt).toLocaleDateString("ar-EG", {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : (
                              "غير منتهي"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge variant={attempt.completedAt ? "success" : "secondary"}>
                              {attempt.completedAt ? "منتهي" : "قيد التقدم"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/attempts/${attempt.id}`}>
                                عرض التفاصيل
                              </a>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg bg-gray-50 dark:bg-dark-800/50">
                  <span className="material-icons text-4xl text-gray-400 dark:text-dark-300 mb-2">school</span>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100">لا توجد نتائج بعد</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-300 mt-1 mb-4">
                    لم يقم أي طالب بمحاولة هذا الاختبار بعد
                  </p>
                  <Button onClick={copyExamLink}>
                    نسخ رابط الاختبار للمشاركة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
