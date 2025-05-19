import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/useAuth";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ExamStats {
  examId: number;
  title: string;
  subject: string;
  attempts: number;
  completedAttempts: number;
  averageScore: number;
  averageTime: number;
  highestScore: number;
  lowestScore: number;
  passingRate: number;
}

interface StudentStats {
  studentId: number;
  name: string;
  email: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  bestExamScore: number;
  bestExamTitle: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  
  // Fetch results
  const { data: results = [], isLoading: isResultsLoading } = useQuery<any[]>({
    queryKey: ["/api/results"],
  });
  
  // Fetch exams for categories
  const { data: exams = [], isLoading: isExamsLoading } = useQuery<any[]>({
    queryKey: ["/api/exams"],
  });
  
  if (isResultsLoading || isExamsLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Get unique subjects from exams
  const subjects = ["all", ...new Set(exams.map(exam => exam.subject))];
  
  // Process data for charts
  
  // Top exams by number of attempts
  const topExamsByAttempts = results
    .map(result => ({
      name: result.exam.title,
      attempts: result.attempts ? result.attempts.length : 0
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);
  
  // Average scores per exam
  const averageScoresPerExam = results.map(result => {
    const completedAttempts = result.attempts ? result.attempts.filter((a: any) => a.completedAt && a.score !== null) : [];
    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum: number, a: any) => sum + (a.score / a.maxScore) * 100, 0) / completedAttempts.length
      : 0;
    
    return {
      name: result.exam.title,
      averageScore: parseFloat(averageScore.toFixed(1))
    };
  }).filter(item => item.averageScore > 0);
  
  // Score distribution (histogram)
  const scoreRanges = [
    {name: '0-50%', count: 0},
    {name: '51-60%', count: 0},
    {name: '61-70%', count: 0},
    {name: '71-80%', count: 0},
    {name: '81-90%', count: 0},
    {name: '91-100%', count: 0},
  ];
  
  results.forEach(result => {
    if (result.attempts) {
      result.attempts.forEach((attempt: any) => {
        if (attempt.completedAt && attempt.score !== null) {
          const scorePercentage = (attempt.score / attempt.maxScore) * 100;
          
          if (scorePercentage <= 50) scoreRanges[0].count++;
          else if (scorePercentage <= 60) scoreRanges[1].count++;
          else if (scorePercentage <= 70) scoreRanges[2].count++;
          else if (scorePercentage <= 80) scoreRanges[3].count++;
          else if (scorePercentage <= 90) scoreRanges[4].count++;
          else scoreRanges[5].count++;
        }
      });
    }
  });
  
  // Pass/Fail Rate (pie chart)
  let passCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    if (result.attempts) {
      result.attempts.forEach((attempt: any) => {
        if (attempt.completedAt && attempt.score !== null) {
          const scorePercentage = (attempt.score / attempt.maxScore) * 100;
          
          if (scorePercentage >= 70) {
            passCount++;
          } else {
            failCount++;
          }
        }
      });
    }
  });
  
  const passRateData = [
    { name: 'النجاح', value: passCount },
    { name: 'الرسوب', value: failCount },
  ];
  
  const COLORS = ['#10B981', '#EF4444'];
  
  // Time spent distribution
  const timeRanges = [
    {name: '<25%', count: 0},
    {name: '25-50%', count: 0},
    {name: '50-75%', count: 0},
    {name: '75-100%', count: 0},
  ];
  
  results.forEach(result => {
    if (result.attempts) {
      result.attempts.forEach((attempt: any) => {
        if (attempt.completedAt && attempt.timeSpent !== null) {
          // Calculate what percentage of the allowed time was used
          const timePercentage = (attempt.timeSpent / (result.exam.duration * 60)) * 100;
          
          if (timePercentage < 25) timeRanges[0].count++;
          else if (timePercentage < 50) timeRanges[1].count++;
          else if (timePercentage < 75) timeRanges[2].count++;
          else timeRanges[3].count++;
        }
      });
    }
  });
  
  // Calculate detailed stats per exam
  const examStats: ExamStats[] = results.map(result => {
    const allAttempts = result.attempts || [];
    const completedAttempts = allAttempts.filter((a: any) => a.completedAt !== null);
    const scoredAttempts = completedAttempts.filter((a: any) => a.score !== null);
    
    // Average score calculation
    const totalScorePercentage = scoredAttempts.reduce((sum: number, a: any) => {
      return sum + (a.score / a.maxScore) * 100;
    }, 0);
    
    // Highest and lowest score
    const scores = scoredAttempts.map((a: any) => (a.score / a.maxScore) * 100);
    
    // Average time spent
    const totalTimeSpent = completedAttempts.reduce((sum: number, a: any) => {
      return sum + (a.timeSpent || 0);
    }, 0);
    
    // Passing rate (>=70%)
    const passedAttempts = scoredAttempts.filter((a: any) => (a.score / a.maxScore) * 100 >= 70).length;
    
    return {
      examId: result.exam.id,
      title: result.exam.title,
      subject: result.exam.subject,
      attempts: allAttempts.length,
      completedAttempts: completedAttempts.length,
      averageScore: scoredAttempts.length > 0 ? totalScorePercentage / scoredAttempts.length : 0,
      averageTime: completedAttempts.length > 0 ? totalTimeSpent / completedAttempts.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passingRate: scoredAttempts.length > 0 ? (passedAttempts / scoredAttempts.length) * 100 : 0
    };
  });
  
  // Filter exam stats by subject if needed
  const filteredExamStats = selectedSubject === "all" 
    ? examStats 
    : examStats.filter(stat => stat.subject === selectedSubject);
  
  // Format number with commas for thousands
  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-EG");
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">تقارير وإحصائيات</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">تحليل أداء الطلاب والاختبارات</p>
        </div>
        
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <Label htmlFor="time-range">الفترة الزمنية</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="time-range" className="w-[150px]">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="quarter">آخر 3 أشهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="subject">المادة</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject" className="w-[150px]">
                <SelectValue placeholder="المادة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المواد</SelectItem>
                {subjects.filter(s => s !== "all").map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">إجمالي الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(exams.length)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">إجمالي المحاولات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(results.reduce((sum, result) => sum + (result.attempts ? result.attempts.length : 0), 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">معدل النجاح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {passCount + failCount > 0
                ? `${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-dark-300">متوسط الدرجات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageScoresPerExam.length > 0
                ? `${(averageScoresPerExam.reduce((sum, item) => sum + item.averageScore, 0) / averageScoresPerExam.length).toFixed(1)}%`
                : '0%'
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="mb-2">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="exams">تحليل الاختبارات</TabsTrigger>
          <TabsTrigger value="scores">تحليل الدرجات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>معدل النجاح والرسوب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={passRateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {passRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>الاختبارات الأكثر محاولة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topExamsByAttempts}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="attempts" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>توزيع الدرجات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreRanges}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>توزيع الوقت المستغرق</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeRanges}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>متوسط الدرجات لكل اختبار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={averageScoresPerExam}
                    margin={{ top: 5, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="averageScore" fill="#3b82f6" name="متوسط الدرجة (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات تفصيلية للاختبارات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-dark-700">
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">الاختبار</th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">المادة</th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">المحاولات</th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">متوسط الدرجات</th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">أعلى درجة</th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-dark-300">معدل النجاح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExamStats.map((examStat) => (
                      <tr key={examStat.examId} className="border-b dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-800/50">
                        <td className="p-3 text-gray-900 dark:text-dark-100">{examStat.title}</td>
                        <td className="p-3 text-gray-700 dark:text-dark-200">{examStat.subject}</td>
                        <td className="p-3 text-gray-700 dark:text-dark-200">{examStat.attempts}</td>
                        <td className="p-3 text-gray-700 dark:text-dark-200">
                          {examStat.averageScore.toFixed(1)}%
                        </td>
                        <td className="p-3 text-gray-700 dark:text-dark-200">
                          {examStat.highestScore.toFixed(1)}%
                        </td>
                        <td className="p-3 text-gray-700 dark:text-dark-200">
                          {examStat.passingRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    
                    {filteredExamStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500 dark:text-dark-300">
                          لا توجد بيانات متاحة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scores" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>تطور متوسط الدرجات عبر الوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { month: "يناير", score: 65 },
                        { month: "فبراير", score: 68 },
                        { month: "مارس", score: 72 },
                        { month: "أبريل", score: 75 },
                        { month: "مايو", score: 71 },
                        { month: "يونيو", score: 78 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" name="متوسط الدرجات (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>معدل النجاح حسب المادة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjects.filter(s => s !== "all").map(subject => {
                        const subjectStats = examStats.filter(stat => stat.subject === subject);
                        const avgPassingRate = subjectStats.length > 0
                          ? subjectStats.reduce((sum, stat) => sum + stat.passingRate, 0) / subjectStats.length
                          : 0;
                        
                        return {
                          name: subject,
                          passingRate: parseFloat(avgPassingRate.toFixed(1))
                        };
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="passingRate" fill="#10b981" name="معدل النجاح (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>توزيع الدرجات حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreRanges}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {scoreRanges.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
