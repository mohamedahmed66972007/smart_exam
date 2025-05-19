import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Define types for our data
interface Exam {
  id: number;
  title: string;
  subject: string;
  status: string;
  createdAt: string;
  questionsCount?: number;
  duration: number;
}

interface Student {
  id: number;
  name: string;
  grade: string;
  avatar: string;
}

interface ExamResult {
  id: number;
  examTitle: string;
  studentName: string;
  studentImage: string;
  studentGrade: string;
  score: number;
  maxScore: number;
  timeSpent: number;
  date: string;
}

interface GradingRequest {
  id: number;
  student: {
    id: number;
    name: string;
    grade: string;
    avatar: string;
  };
  exam: {
    id: number;
    title: string;
  };
  question: {
    id: number;
    text: string;
  };
  answer: {
    id: number;
    answer: string;
  };
  date: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  // Fetch exams
  const { data: exams } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Fetch results
  const { data: results } = useQuery<any>({
    queryKey: ["/api/results"],
  });

  // Fetch grading requests (only for teachers)
  const { data: gradingRequests } = useQuery<GradingRequest[]>({
    queryKey: ["/api/grading-requests"],
    enabled: isTeacher,
  });

  // Get some statistics
  const activeExams = exams?.filter(exam => exam.status === "active")?.length || 0;
  const totalStudents = 345; // This would be fetched from the API in a real scenario
  const pendingRequests = gradingRequests?.length || 0;
  const successRate = results ? Math.round((results?.filter((r: any) => r.score / r.maxScore >= 0.7).length / results.length) * 100) : 78;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Main Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-dark-700">
          <nav className="-mb-px flex space-x-6 space-x-reverse">
            <a href="#" className="tab-active">لوحة التحكم</a>
            <a href="/exams" className="tab-inactive">الاختبارات</a>
            {isTeacher && <a href="/students" className="tab-inactive">نتائج الطلاب</a>}
            {isTeacher && <a href="/grading-requests" className="tab-inactive">طلبات مراجعة التصحيح</a>}
          </nav>
        </div>
      </div>
      
      {/* Dashboard Summary */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">مرحباً في لوحة التحكم</h1>
        <p className="mt-1 text-gray-500 dark:text-dark-200">نظرة عامة على الاختبارات والنتائج</p>
        
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stats Cards */}
          <div className="stat-card">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-md p-3">
                  <span className="material-icons text-primary-600 dark:text-primary-500">quiz</span>
                </div>
                <div className="mr-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-200 truncate">اختبارات نشطة</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-dark-100">{activeExams}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-800/80 px-5 py-3 border-t border-gray-200 dark:border-dark-700">
              <Link href="/exams" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض جميع الاختبارات</Link>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-md p-3">
                  <span className="material-icons text-green-600 dark:text-green-500">group</span>
                </div>
                <div className="mr-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-200 truncate">إجمالي المختبرين</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-dark-100">{totalStudents}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-800/80 px-5 py-3 border-t border-gray-200 dark:border-dark-700">
              <Link href="/students" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض جميع المختبرين</Link>
            </div>
          </div>
          
          {isTeacher && (
            <div className="stat-card">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 rounded-md p-3">
                    <span className="material-icons text-amber-600 dark:text-amber-500">grading</span>
                  </div>
                  <div className="mr-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-dark-200 truncate">طلبات تصحيح معلقة</p>
                    <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-dark-100">{pendingRequests}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-dark-800/80 px-5 py-3 border-t border-gray-200 dark:border-dark-700">
                <Link href="/grading-requests" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">مراجعة الطلبات</Link>
              </div>
            </div>
          )}
          
          <div className="stat-card">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-violet-100 dark:bg-violet-900/30 rounded-md p-3">
                  <span className="material-icons text-violet-600 dark:text-violet-500">insights</span>
                </div>
                <div className="mr-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-dark-200 truncate">معدل النجاح</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-dark-100">{successRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-800/80 px-5 py-3 border-t border-gray-200 dark:border-dark-700">
              <Link href="/reports" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض الإحصائيات</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Exams & Creation */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Exams */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-dark-100">أحدث الاختبارات</h2>
            <Link href="/exams" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض الكل</Link>
          </div>
          
          <div className="bg-white dark:bg-dark-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-dark-700">
              {exams?.slice(0, 3).map((exam) => (
                <li key={exam.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-md bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="material-icons text-primary-600 dark:text-primary-500">description</span>
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-500">{exam.title}</div>
                        <div className="text-sm text-gray-500 dark:text-dark-200">
                          <span className="ml-2">{exam.questionsCount || 10} أسئلة</span>
                          <span>مدة: {exam.duration} دقيقة</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge variant={exam.status === "active" ? "success" : exam.status === "draft" ? "outline" : "secondary"}>
                        {exam.status === "active" ? "نشط" : exam.status === "draft" ? "مسودة" : "مؤرشف"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-dark-200">
                      <span>تم الإنشاء: {new Date(exam.createdAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="sm" className="ml-2" asChild>
                        <Link href={`/exams/${exam.id}/edit`}>
                          <span className="material-icons text-sm">edit</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <span className="material-icons text-sm">share</span>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <span className="material-icons text-sm">more_vert</span>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
              
              {!exams?.length && (
                <li className="px-6 py-4 text-center text-gray-500 dark:text-dark-200">
                  لا توجد اختبارات حالياً. قم بإنشاء أول اختبار.
                </li>
              )}
            </ul>
          </div>
        </div>
        
        {/* Create New Exam */}
        <div>
          <div className="bg-white dark:bg-dark-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100">إنشاء اختبار جديد</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">ابدأ بإنشاء اختبار جديد للطلاب</p>
            </div>
            
            <div className="px-6 py-5">
              <form action="/exams/create">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="exam-title" className="block text-sm font-medium text-gray-700 dark:text-dark-200">عنوان الاختبار</label>
                    <input 
                      type="text" 
                      id="exam-title" 
                      name="exam-title" 
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                      placeholder="أدخل عنوان الاختبار"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="exam-subject" className="block text-sm font-medium text-gray-700 dark:text-dark-200">المادة</label>
                    <select id="exam-subject" name="exam-subject" className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                      <option>اختر المادة</option>
                      <option>الرياضيات</option>
                      <option>العلوم</option>
                      <option>اللغة العربية</option>
                      <option>اللغة الإنجليزية</option>
                      <option>الاجتماعيات</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="exam-duration" className="block text-sm font-medium text-gray-700 dark:text-dark-200">مدة الاختبار (بالدقائق)</label>
                    <input 
                      type="number" 
                      id="exam-duration" 
                      name="exam-duration" 
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                      placeholder="مثال: 60"
                    />
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button type="button" variant="outline" className="ml-3">
                      حفظ كمسودة
                    </Button>
                    <Button type="submit">
                      متابعة الإنشاء
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-6 bg-white dark:bg-dark-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100">إجراءات سريعة</h3>
            </div>
            
            <div className="px-6 py-5">
              <ul className="divide-y divide-gray-200 dark:divide-dark-700">
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-primary-500 ml-3">file_download</span>
                    <span className="text-sm text-gray-700 dark:text-dark-200">تصدير اختبار إلى PDF</span>
                  </div>
                  <Button variant="link" className="text-primary-600 dark:text-primary-500 hover:text-primary-800 text-sm font-medium">
                    تصدير
                  </Button>
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-primary-500 ml-3">file_present</span>
                    <span className="text-sm text-gray-700 dark:text-dark-200">تصدير اختبار إلى Word</span>
                  </div>
                  <Button variant="link" className="text-primary-600 dark:text-primary-500 hover:text-primary-800 text-sm font-medium">
                    تصدير
                  </Button>
                </li>
                <li className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-primary-500 ml-3">upload_file</span>
                    <span className="text-sm text-gray-700 dark:text-dark-200">استيراد اختبار من ملف</span>
                  </div>
                  <Button variant="link" className="text-primary-600 dark:text-primary-500 hover:text-primary-800 text-sm font-medium">
                    استيراد
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Student Results */}
      {isTeacher && results && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-dark-100">أحدث نتائج الطلاب</h2>
            <Link href="/students" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض جميع النتائج</Link>
          </div>
          
          <div className="bg-white dark:bg-dark-800 shadow overflow-hidden border-b border-gray-200 dark:border-dark-700 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
              <thead className="bg-gray-50 dark:bg-dark-800/80">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                    الطالب
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                    الاختبار
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                    الدرجة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                    الوقت المستغرق
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">إجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                {results?.slice(0, 4).map((attempt: any) => (
                  <tr key={attempt.attempt.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full" src={`https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`} alt="صورة الطالب" />
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-dark-100">{attempt.student?.name || 'طالب'}</div>
                          <div className="text-sm text-gray-500 dark:text-dark-300">الصف العاشر</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-200">
                      {attempt.exam?.title || 'اختبار غير معروف'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        attempt.attempt.score / attempt.attempt.maxScore >= 0.7 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : attempt.attempt.score / attempt.attempt.maxScore >= 0.5
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {attempt.attempt.score}/{attempt.attempt.maxScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-200">
                      {attempt.attempt.timeSpent ? `${Math.floor(attempt.attempt.timeSpent / 60)} دقيقة` : 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-200">
                      {attempt.attempt.completedAt ? new Date(attempt.attempt.completedAt).toLocaleDateString("ar-EG") : 'غير مكتمل'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={`/attempts/${attempt.attempt.id}`} className="text-primary-600 dark:text-primary-500 hover:text-primary-900">عرض التفاصيل</a>
                    </td>
                  </tr>
                ))}
                
                {(!results || results.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-dark-200">
                      لا توجد نتائج حتى الآن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Grading Requests */}
      {isTeacher && gradingRequests && gradingRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-dark-100">طلبات مراجعة التصحيح</h2>
            <a href="/grading-requests" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700">عرض جميع الطلبات</a>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gradingRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="bg-white dark:bg-dark-800 shadow rounded-lg overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <img className="h-10 w-10 rounded-full" src={request.student.avatar || "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} alt="صورة الطالب" />
                      <div className="mr-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-dark-100">{request.student.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-dark-300">{request.student.grade}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">معلق</Badge>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">الاختبار:</h4>
                    <p className="text-sm text-gray-900 dark:text-dark-100">{request.exam.title}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">السؤال:</h4>
                    <p className="text-sm text-gray-900 dark:text-dark-100">{request.question.text}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">إجابة الطالب:</h4>
                    <p className="text-sm text-gray-900 dark:text-dark-100 line-clamp-3">{request.answer.answer}</p>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-dark-300 mb-4">
                    تاريخ الطلب: {new Date(request.date).toLocaleDateString("ar-EG")}
                  </div>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">
                      رفض
                    </Button>
                    <Button size="sm">
                      مراجعة وتصحيح
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
