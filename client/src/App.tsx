import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/useAuth";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Exams from "@/pages/Exams";
import ExamCreate from "@/pages/ExamCreate";
import ExamEdit from "@/pages/ExamEdit";
import ExamView from "@/pages/ExamView";
import ExamTake from "@/pages/ExamTake";
import ExamJoin from "@/pages/ExamJoin";
import Students from "@/pages/Students";
import Reports from "@/pages/Reports";
import GradingRequests from "@/pages/GradingRequests";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <TooltipProvider>
      <Switch>
        {/* صفحة الانضمام للاختبار بدون قالب Layout لأنها متاحة للمختبرين غير المسجلين */}
        <Route path="/join">
          <ExamJoin />
        </Route>
        
        {/* الصفحات الأخرى المحمية بقالب Layout */}
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/exams" component={Exams} />
              <Route path="/exams/create" component={ExamCreate} />
              <Route path="/exams/:id/edit" component={ExamEdit} />
              <Route path="/exams/:id" component={ExamView} />
              <Route path="/exam/:id/take" component={ExamTake} />
              <Route path="/students" component={Students} />
              <Route path="/reports" component={Reports} />
              <Route path="/grading-requests" component={GradingRequests} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </TooltipProvider>
  );
}

export default App;
