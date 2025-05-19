import { useLocation } from "wouter";
import { useAuth } from "@/lib/useAuth";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/', label: 'لوحة التحكم', icon: 'dashboard' },
    { path: '/exams', label: 'الاختبارات', icon: 'quiz' },
    { path: '/students', label: 'المختبرون', icon: 'group' },
    { path: '/reports', label: 'التقارير', icon: 'analytics' },
    { path: '/settings', label: 'الإعدادات', icon: 'settings' },
  ];

  if (user?.role === 'teacher') {
    navItems.splice(3, 0, { path: '/grading-requests', label: 'طلبات التصحيح', icon: 'grading' });
  }

  return (
    <div className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 shadow-sm transition-colors duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-500">منصة الاختبارات</h1>
        <p className="text-sm text-gray-500 dark:text-dark-200">
          مرحباً، {user?.name || 'المستخدم'}
        </p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <a 
                href={item.path} 
                className={`sidebar-item ${isActive(item.path) ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              >
                <span className="material-icons ml-3 text-primary-500">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <button 
          onClick={logout}
          className="flex items-center text-sm text-gray-700 dark:text-dark-200 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <span className="material-icons ml-2 text-gray-400 dark:text-dark-300">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
