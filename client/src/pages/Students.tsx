import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";

interface Student {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface ExamResult {
  student: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  attempt: {
    id: number;
    examId: number;
    startedAt: string;
    completedAt: string | null;
    score: number | null;
    maxScore: number;
    timeSpent: number | null;
  };
  exam: {
    id: number;
    title: string;
    subject: string;
  };
}

export default function Students() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  
  // Fetch users
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/users"],
    select: (data) => data.filter(user => user.role === "student"),
  });

  // Fetch results
  const { data: results = [], isLoading: isResultsLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
  });
  
  // Filter students by search term
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "email") {
      return a.email.localeCompare(b.email);
    } else if (sortBy === "username") {
      return a.username.localeCompare(b.username);
    }
    return 0;
  });
  
  // Calculate statistics
  const totalStudents = students.length;
  let totalAttempts = 0;
  let totalCompletedAttempts = 0;
  let averageScore = 0;
  
  if (results.length > 0) {
    // Flatten all attempts from all exams
    const allAttempts = results.flatMap((examResult: any) => 
      examResult.attempts || []
    );
    
    totalAttempts = allAttempts.length;
    
    const completedAttempts = allAttempts.filter((attempt: any) => 
      attempt.completedAt !== null
    );
    
    totalCompletedAttempts = completedAttempts.length;
    
    if (completedAttempts.length > 0) {
      const totalScorePercentage = completedAttempts.reduce((sum: number, attempt: any) => {
        if (attempt.score !== null && attempt.maxScore > 0) {
          return sum + (attempt.score / attempt.maxScore) * 100;
        }
        return sum;
      }, 0);
      
      averageScore = totalScorePercentage / completedAttempts.length;
    }
  }
  
  // Define table columns for students
  const studentColumns: ColumnDef<Student>[] = [
    {
      accessorKey: "name",
      header: "الاسم",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "username",
      header: "اسم المستخدم",
    },
    {
      accessorKey: "email",
      header: "البريد الإلكتروني",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const student = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="material-icons">more_vert</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.location.href = `/students/${student.id}`}>
                عرض التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = `/students/${student.id}/results`}>
                عرض النتائج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  
  // Prepare data for results table
  const flattenedResults: ExamResult[] = [];
  
  if (results.length > 0) {
    results.forEach((examResult: any) => {
      const exam = examResult.exam;
      
      if (examResult.attempts) {
        examResult.attempts.forEach((attempt: any) => {
          if (attempt.student) {
            flattenedResults.push({
              student: attempt.student,
              attempt,
              exam,
            });
          }
        });
      }
    });
  }
  
  // Define table columns for results
  const resultsColumns: ColumnDef<ExamResult>[] = [
    {
      accessorKey: "student.name",
      header: "الطالب",
      cell: ({ row }) => <div className="font-medium">{row.getValue("student.name")}</div>,
    },
    {
      accessorKey: "exam.title",
      header: "الاختبار",
    },
    {
      accessorKey: "exam.subject",
      header: "المادة",
    },
    {
      accessorKey: "attempt.score",
      header: "النتيجة",
      cell: ({ row }) => {
        const attempt = row.original.attempt;
        const score = attempt.score;
        const maxScore = attempt.maxScore;
        
        if (attempt.completedAt === null) {
          return <Badge variant="outline">غير مكتمل</Badge>;
        }
        
        if (score === null) {
          return <Badge variant="outline">قيد التصحيح</Badge>;
        }
        
        const percentage = (score / maxScore) * 100;
        
        return (
          <Badge variant={
            percentage >= 70 ? "success" :
            percentage >= 50 ? "warning" :
            "destructive"
          }>
            {score}/{maxScore} ({percentage.toFixed(0)}%)
          </Badge>
        );
      },
    },
    {
      accessorKey: "attempt.timeSpent",
      header: "الوقت المستغرق",
      cell: ({ row }) => {
        const timeSpent = row.original.attempt.timeSpent;
        
        if (timeSpent === null) {
          return "—";
        }
        
        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        
        return `${minutes} دقيقة ${seconds > 0 ? `و ${seconds} ثانية` : ''}`;
      },
    },
    {
      accessorKey: "attempt.completedAt",
      header: "تاريخ الإنجاز",
      cell: ({ row }) => {
        const completedAt = row.original.attempt.completedAt;
        
        if (completedAt === null) {
          return "—";
        }
        
        return new Date(completedAt).toLocaleDateString("ar-EG", {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const result = row.original;
        
        return (
          <Button variant="ghost" size="sm" asChild>
            <a href={`/attempts/${result.attempt.id}`}>
              عرض التفاصيل
            </a>
          </Button>
        );
      },
    },
  ];
  
  if (user?.role !== "teacher") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">صفحة غير متاحة</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">ليس لديك صلاحية لمشاهدة هذه الصفحة</p>
        <Button className="mt-4" onClick={() => window.location.href = "/"}>
          العودة إلى الصفحة الرئيسية
        </Button>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">الطلاب</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">إدارة الطلاب ومراجعة نتائجهم</p>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">إجمالي الطلاب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">محاولات الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">الاختبارات المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedAttempts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">متوسط الدرجات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main content */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">قائمة الطلاب</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
        </TabsList>
        
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>الطلاب ({filteredStudents.length})</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="البحث عن طالب..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <span className="material-icons ml-2 text-sm">sort</span>
                        ترتيب
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortBy("name")}>
                        الاسم
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("username")}>
                        اسم المستخدم
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("email")}>
                        البريد الإلكتروني
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable columns={studentColumns} data={sortedStudents} searchKey="name" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>نتائج الاختبارات ({flattenedResults.length})</CardTitle>
                <Input
                  placeholder="البحث في النتائج..."
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isResultsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable columns={resultsColumns} data={flattenedResults} searchKey="student.name" searchPlaceholder="البحث باسم الطالب..." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
