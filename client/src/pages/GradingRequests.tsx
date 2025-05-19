import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface GradingRequest {
  id: number;
  answer: {
    id: number;
    answer: string;
    isCorrect: boolean | null;
    score: number | null;
  };
  student: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  question: {
    id: number;
    text: string;
    points: number;
  };
  exam: {
    id: number;
    title: string;
    subject: string;
  };
  requestedAt: string;
  status: string;
  comment: string | null;
  resolvedAt: string | null;
}

export default function GradingRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<GradingRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewScore, setReviewScore] = useState<string>("0");
  const [reviewComment, setReviewComment] = useState("");
  const [filter, setFilter] = useState("pending"); // pending, approved, rejected, all
  
  // Fetch grading requests
  const { data: requests = [], isLoading } = useQuery<GradingRequest[]>({
    queryKey: ["/api/grading-requests"],
    onSuccess: (data) => {
      // Sort requests by date (newest first)
      return data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    },
  });
  
  // Resolve request mutation
  const resolveRequestMutation = useMutation({
    mutationFn: async ({ id, status, comment, score }: { id: number; status: string; comment: string; score?: number }) => {
      const res = await apiRequest("PUT", `/api/grading-requests/${id}`, {
        status,
        comment,
        score: score ? parseInt(score) : undefined
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grading-requests"] });
      setReviewOpen(false);
      toast({
        title: "تم تحديث طلب المراجعة",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث طلب المراجعة",
        variant: "destructive",
      });
    },
  });
  
  // Filter and search
  const filteredRequests = requests.filter(request => {
    // Filter by status
    if (filter !== "all" && request.status !== filter) {
      return false;
    }
    
    // Search by student name, exam title, or question
    const searchTermLower = searchTerm.toLowerCase();
    return (
      request.student.name.toLowerCase().includes(searchTermLower) ||
      request.exam.title.toLowerCase().includes(searchTermLower) ||
      request.question.text.toLowerCase().includes(searchTermLower)
    );
  });
  
  const handleReviewRequest = (request: GradingRequest) => {
    setSelectedRequest(request);
    setReviewScore(request.answer.score?.toString() || "0");
    setReviewComment("");
    setReviewOpen(true);
  };
  
  const handleApproveRequest = () => {
    if (!selectedRequest) return;
    
    resolveRequestMutation.mutate({
      id: selectedRequest.id,
      status: "approved",
      comment: reviewComment,
      score: parseInt(reviewScore)
    });
  };
  
  const handleRejectRequest = () => {
    if (!selectedRequest) return;
    
    resolveRequestMutation.mutate({
      id: selectedRequest.id,
      status: "rejected",
      comment: reviewComment
    });
  };
  
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">طلبات مراجعة التصحيح</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">مراجعة وتصحيح إجابات الطلاب</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 justify-between">
        <div className="flex gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الطلبات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="approved">تمت الموافقة</SelectItem>
              <SelectItem value="rejected">تم الرفض</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
        
        <Badge variant={filter === "pending" ? "outline" : (filter === "approved" ? "success" : filter === "rejected" ? "destructive" : "secondary")}>
          {filter === "pending" && "قيد الانتظار"}
          {filter === "approved" && "تمت الموافقة"}
          {filter === "rejected" && "تم الرفض"}
          {filter === "all" && "الكل"}
          : {filteredRequests.length}
        </Badge>
      </div>
      
      {/* Requests */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => (
            <Card key={request.id} className={`overflow-hidden ${
              request.status === "pending" ? "border-orange-500 dark:border-orange-700 border-2" :
              request.status === "approved" ? "border-green-500 dark:border-green-700" : 
              "border-red-500 dark:border-red-700"
            }`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>طلب مراجعة</span>
                    <Badge variant={
                      request.status === "pending" ? "outline" :
                      request.status === "approved" ? "success" :
                      "destructive"
                    }>
                      {request.status === "pending" && "قيد الانتظار"}
                      {request.status === "approved" && "تمت الموافقة"}
                      {request.status === "rejected" && "تم الرفض"}
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-gray-500 dark:text-dark-300">
                    {new Date(request.requestedAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-dark-700 flex items-center justify-center">
                    <span className="material-icons text-sm text-gray-600 dark:text-dark-200">
                      person
                    </span>
                  </div>
                  <div className="mr-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-dark-100">{request.student.name}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-300">{request.student.email}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-dark-300 mb-1">الاختبار:</div>
                  <div className="text-sm text-gray-900 dark:text-dark-100">{request.exam.title}</div>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-dark-300 mb-1">السؤال:</div>
                  <div className="text-sm text-gray-900 dark:text-dark-100">{request.question.text}</div>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-dark-300 mb-1">إجابة الطالب:</div>
                  <div className="text-sm text-gray-900 dark:text-dark-100 bg-gray-50 dark:bg-dark-800/50 p-2 rounded max-h-24 overflow-y-auto">
                    {request.answer.answer}
                  </div>
                </div>
                
                {request.status !== "pending" && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-dark-300 mb-1">تعليق المراجعة:</div>
                    <div className="text-sm text-gray-900 dark:text-dark-100 bg-gray-50 dark:bg-dark-800/50 p-2 rounded">
                      {request.comment || "لا يوجد تعليق"}
                    </div>
                  </div>
                )}
                
                {request.status === "approved" && request.answer.score !== null && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-dark-300 mb-1">الدرجة بعد المراجعة:</div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {request.answer.score}/{request.question.points}
                    </div>
                  </div>
                )}
                
                {request.status === "pending" && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => handleReviewRequest(request)}>
                      مراجعة وتصحيح
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-gray-50 dark:bg-dark-800/50">
          <span className="material-icons text-5xl text-gray-400 dark:text-dark-300 mb-3">grading</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-100 mb-1">لا توجد طلبات مراجعة</h3>
          <p className="text-gray-500 dark:text-dark-300 max-w-md mx-auto">
            {filter !== "all" 
              ? `لا توجد طلبات مراجعة بحالة "${
                  filter === "pending" ? "قيد الانتظار" : 
                  filter === "approved" ? "تمت الموافقة" : "تم الرفض"
                }"`
              : "لا توجد طلبات مراجعة في النظام"}
          </p>
        </div>
      )}
      
      {/* Request review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة طلب التصحيح</DialogTitle>
            <DialogDescription>
              مراجعة إجابة الطالب وتحديث الدرجة
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-dark-100">{selectedRequest.student.name}</div>
                <div className="text-xs text-gray-500 dark:text-dark-300">{selectedRequest.exam.title}</div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-dark-800/50 rounded-md">
                <div className="text-sm font-medium text-gray-700 dark:text-dark-200">السؤال:</div>
                <div className="mt-1 text-gray-900 dark:text-dark-100">{selectedRequest.question.text}</div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-dark-800/50 rounded-md">
                <div className="text-sm font-medium text-gray-700 dark:text-dark-200">إجابة الطالب:</div>
                <div className="mt-1 text-gray-900 dark:text-dark-100">{selectedRequest.answer.answer}</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="score">درجة السؤال (من {selectedRequest.question.points}):</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max={selectedRequest.question.points}
                  value={reviewScore}
                  onChange={(e) => setReviewScore(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comment">التعليق (اختياري):</Label>
                <Textarea
                  id="comment"
                  placeholder="أضف تعليقاً للطالب..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  رفض الطلب
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد من رفض الطلب؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم رفض طلب المراجعة ولن يتم تغيير درجة الطالب.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRejectRequest}>
                    تأكيد الرفض
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button onClick={handleApproveRequest}>
              قبول الطلب وتحديث الدرجة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
