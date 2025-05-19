import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ExamJoin() {
  const [location, navigate] = useLocation();
  const [shareCode, setShareCode] = useState("");
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`/api/exams/code/${code}`);
      if (!response.ok) {
        throw new Error("لم يتم العثور على اختبار بهذا الرمز");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم العثور على الاختبار",
        description: `تم العثور على اختبار "${data.title}"`,
      });
      navigate(`/exam/${data.id}/take`);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "لم يتم العثور على اختبار بهذا الرمز",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رمز المشاركة",
        variant: "destructive",
      });
      return;
    }
    joinMutation.mutate(shareCode);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">الانضمام إلى اختبار</CardTitle>
            <CardDescription>
              أدخل رمز المشاركة للانضمام إلى الاختبار
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="shareCode" className="block text-sm font-medium text-gray-700 dark:text-dark-300">
                    رمز المشاركة
                  </label>
                  <Input
                    id="shareCode"
                    value={shareCode}
                    onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                    className="w-full text-center text-xl uppercase tracking-widest font-bold"
                    maxLength={8}
                    placeholder="XXXXXX"
                    autoComplete="off"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      جارِ البحث...
                    </>
                  ) : "الانضمام إلى الاختبار"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-center flex-col space-y-2">
            <div className="text-sm text-center text-gray-500 dark:text-dark-400">
              سيتم نقلك إلى صفحة الاختبار بمجرد التحقق من الرمز
            </div>
            <Button 
              variant="link" 
              onClick={() => navigate("/")}
              className="text-sm"
            >
              العودة إلى الرئيسية
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}