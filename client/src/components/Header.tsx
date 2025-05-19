import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };
  
  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
    // Here we would update the app-wide language state
    document.documentElement.dir = language === "ar" ? "ltr" : "rtl";
    document.documentElement.lang = language === "ar" ? "en" : "ar";
  };

  return (
    <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700 transition-colors duration-300">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center lg:hidden">
          <button 
            type="button" 
            className="text-gray-500 dark:text-dark-200 hover:text-gray-700"
            onClick={toggleMobileSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
          <h1 className="text-lg font-bold text-primary-600 dark:text-primary-500 mr-3">منصة الاختبارات</h1>
        </div>
        
        <div className="flex-1 mx-4 lg:flex hidden">
          <form onSubmit={handleSearch} className="relative max-w-md w-full">
            <Input
              type="text"
              placeholder={language === "ar" ? "بحث عن اختبار أو متقدم..." : "Search for exam or examinee..."}
              className="w-full py-2 px-4 pr-10 rounded-md border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-icons absolute right-3 top-2.5 text-gray-400 dark:text-dark-300">search</span>
          </form>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <ThemeToggle />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleLanguage}
            className="flex items-center"
          >
            {language === "ar" ? "English" : "العربية"}
          </Button>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-dark-700">
          <nav className="py-2">
            <ul className="space-y-1 px-2">
              <li>
                <a 
                  href="/" 
                  className={`sidebar-item ${location === '/' ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="material-icons ml-3">dashboard</span>
                  لوحة التحكم
                </a>
              </li>
              <li>
                <a 
                  href="/exams" 
                  className={`sidebar-item ${location.startsWith('/exams') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="material-icons ml-3">quiz</span>
                  الاختبارات
                </a>
              </li>
              <li>
                <a 
                  href="/students" 
                  className={`sidebar-item ${location.startsWith('/students') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="material-icons ml-3">group</span>
                  الطلاب
                </a>
              </li>
              {user?.role === 'teacher' && (
                <li>
                  <a 
                    href="/grading-requests" 
                    className={`sidebar-item ${location.startsWith('/grading-requests') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <span className="material-icons ml-3">grading</span>
                    طلبات التصحيح
                  </a>
                </li>
              )}
              <li>
                <a 
                  href="/reports" 
                  className={`sidebar-item ${location.startsWith('/reports') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="material-icons ml-3">analytics</span>
                  التقارير
                </a>
              </li>
              <li>
                <a 
                  href="/settings" 
                  className={`sidebar-item ${location.startsWith('/settings') ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="material-icons ml-3">settings</span>
                  الإعدادات
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
