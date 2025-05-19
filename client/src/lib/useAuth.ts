import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "teacher" | "student";
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  name: string;
  email: string;
  role: "teacher" | "student";
}

export function useAuth() {
  const { toast } = useToast();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في منصة الاختبارات",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (userData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم التسجيل بنجاح",
        description: "يمكنك الآن تسجيل الدخول",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل التسجيل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      queryClient.clear();
      toast({
        title: "تم تسجيل الخروج بنجاح",
        description: "إلى اللقاء!",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تسجيل الخروج",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = (credentials: LoginData) => {
    loginMutation.mutate(credentials);
  };

  const register = (userData: RegisterData) => {
    registerMutation.mutate(userData);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}
