import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";
import { exportToPDF, exportToWord } from "@/lib/exam-export";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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

export default function Exams() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch exams
  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/exams/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
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
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/exams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "تم حذف الاختبار",
        description: "تم حذف الاختبار بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الاختبار",
        variant: "destructive",
      });
    },
  });

  // Filter exams based on search term
  const filteredExams = exams?.filter((exam) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateStatus = (id: number, status: string) => {
    statusMutation.mutate({ id, status });
  };

  const deleteExam = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الاختبار؟")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportPDF = (exam: Exam) => {
    // Fetch exam details including questions
    const fetchExamDetails = async () => {
      try {
        const res = await fetch(`/api/exams/${exam.id}/questions`);
        const questions = await res.json();
        
        const examWithQuestions = {
          ...exam,
          questions: questions,
        };
        
        exportToPDF(examWithQuestions);
        
        toast({
          title: "تم التصدير بنجاح",
          description: "تم تصدير الاختبار إلى ملف PDF بنجاح",
        });
      } catch (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تصدير الاختبار",
          variant: "destructive",
        });
      }
    };
    
    fetchExamDetails();
  };

  const handleExportWord = (exam: Exam) => {
    // Fetch exam details including questions
    const fetchExamDetails = async () => {
      try {
        const res = await fetch(`/api/exams/${exam.id}/questions`);
        const questions = await res.json();
        
        const examWithQuestions = {
          ...exam,
          questions: questions,
        };
        
        exportToWord(examWithQuestions);
        
        toast({
          title: "تم التصدير بنجاح",
          description: "تم تصدير الاختبار إلى ملف Word بنجاح",
        });
      } catch (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تصدير الاختبار",
          variant: "destructive",
        });
      }
    };
    
    fetchExamDetails();
  };

  const copyExamLink = (examId: number) => {
    const link = `${window.location.origin}/exam/${examId}/take`;
    navigator.clipboard.writeText(link);
    toast({
      title: "تم نسخ الرابط",
      description: "تم نسخ رابط الاختبار إلى الحافظة",
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">الاختبارات</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">
            {isTeacher ? "إدارة الاختبارات الخاصة بك" : "الاختبارات المتاحة لك"}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => navigate("/exams/create")}>
            <span className="material-icons ml-2 text-sm">add</span>
            إنشاء اختبار جديد
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md w-full">
          <Input
            type="text"
            placeholder="بحث عن اختبار..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <span className="material-icons absolute right-3 top-2.5 text-gray-400 dark:text-dark-300">search</span>
        </div>
        
        {isTeacher && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <span className="material-icons ml-2 text-sm">filter_list</span>
                  تصفية
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSearchTerm("")}>الكل</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchTerm("نشط")}>نشط</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchTerm("مسودة")}>مسودة</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSearchTerm("مؤرشف")}>مؤرشف</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <span className="material-icons ml-2 text-sm">sort</span>
                  ترتيب
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>الأحدث</DropdownMenuItem>
                <DropdownMenuItem>الأقدم</DropdownMenuItem>
                <DropdownMenuItem>أبجدي (أ-ي)</DropdownMenuItem>
                <DropdownMenuItem>أبجدي (ي-أ)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="flex justify-center my-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredExams && filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-dark-100">{exam.title}</CardTitle>
                  <Badge variant={exam.status === "active" ? "success" : exam.status === "draft" ? "outline" : "secondary"}>
                    {exam.status === "active" ? "نشط" : exam.status === "draft" ? "مسودة" : "مؤرشف"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-dark-200">{exam.subject}</p>
              </CardHeader>
              <CardContent className="pt-2">
                {exam.description && (
                  <p className="text-sm text-gray-700 dark:text-dark-200 line-clamp-2 mb-2">{exam.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 dark:text-dark-300 mt-1">
                  <span className="material-icons text-sm ml-1">schedule</span>
                  {exam.duration} دقيقة
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-dark-300 mt-1">
                  <span className="material-icons text-sm ml-1">event</span>
                  تم الإنشاء: {new Date(exam.createdAt).toLocaleDateString("ar-EG")}
                </div>
                {exam.fileUrl && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-dark-300 mt-1">
                    <span className="material-icons text-sm ml-1">attachment</span>
                    ملف مرفق
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t border-gray-200 dark:border-dark-700 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(isTeacher ? `/exams/${exam.id}` : `/exam/${exam.id}/take`)}
                >
                  {isTeacher ? "استعراض" : "بدء الاختبار"}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <span className="material-icons">more_vert</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isTeacher && (
                      <>
                        <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/edit`)}>
                          <span className="material-icons ml-2 text-sm">edit</span>
                          تعديل
                        </DropdownMenuItem>
                        {exam.status === "draft" ? (
                          <DropdownMenuItem onClick={() => updateStatus(exam.id, "active")}>
                            <span className="material-icons ml-2 text-sm">publish</span>
                            نشر
                          </DropdownMenuItem>
                        ) : exam.status === "active" ? (
                          <DropdownMenuItem onClick={() => updateStatus(exam.id, "archived")}>
                            <span className="material-icons ml-2 text-sm">archive</span>
                            أرشفة
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => updateStatus(exam.id, "active")}>
                            <span className="material-icons ml-2 text-sm">unarchive</span>
                            إعادة نشر
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => copyExamLink(exam.id)}>
                          <span className="material-icons ml-2 text-sm">share</span>
                          نسخ رابط المشاركة
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPDF(exam)}>
                          <span className="material-icons ml-2 text-sm">picture_as_pdf</span>
                          تصدير كـ PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportWord(exam)}>
                          <span className="material-icons ml-2 text-sm">description</span>
                          تصدير كـ Word
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteExam(exam.id)}
                          className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-500"
                        >
                          <span className="material-icons ml-2 text-sm">delete</span>
                          حذف
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isTeacher && (
                      <DropdownMenuItem onClick={() => navigate(`/exam/${exam.id}/take`)}>
                        <span className="material-icons ml-2 text-sm">start</span>
                        بدء الاختبار
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="material-icons text-5xl text-gray-400 dark:text-dark-300 mb-3">assignment</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100 mb-1">لا توجد اختبارات</h3>
          <p className="text-gray-500 dark:text-dark-200">
            {isTeacher
              ? "لم تقم بإنشاء أي اختبارات بعد. أنشئ أول اختبار من خلال الضغط على زر إنشاء اختبار جديد."
              : "لا توجد اختبارات متاحة لك حالياً."}
          </p>
          {isTeacher && (
            <Button 
              onClick={() => navigate("/exams/create")} 
              className="mt-4"
            >
              <span className="material-icons ml-2 text-sm">add</span>
              إنشاء اختبار جديد
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
