import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Account settings form schema
const accountSettingsSchema = z.object({
  name: z.string().min(3, "الاسم مطلوب"),
  email: z.string().email("يجب إدخال بريد إلكتروني صحيح"),
});

// Password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمة المرور الجديدة وتأكيدها غير متطابقين",
  path: ["confirmPassword"],
});

// Notification settings form schema
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
  newExamsNotification: z.boolean(),
  gradesNotification: z.boolean(),
});

export default function Settings() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  
  // Account settings form
  const accountForm = useForm<z.infer<typeof accountSettingsSchema>>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });
  
  // Password change form
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Notification settings form
  const notificationForm = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      desktopNotifications: true,
      newExamsNotification: true,
      gradesNotification: true,
    },
  });
  
  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof accountSettingsSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث البيانات",
        description: "تم تحديث بيانات الحساب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل تحديث بيانات الحساب",
        variant: "destructive",
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const response = await apiRequest("POST", `/api/users/${user.id}/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تغيير كلمة المرور",
        description: "تم تغيير كلمة المرور بنجاح",
      });
      passwordForm.reset();
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل تغيير كلمة المرور، تأكد من صحة كلمة المرور الحالية",
        variant: "destructive",
      });
    },
  });
  
  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSettingsSchema>) => {
      if (!user) throw new Error("User not authenticated");
      const response = await apiRequest("PATCH", `/api/users/${user.id}/notifications`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الإشعارات",
        description: "تم تحديث إعدادات الإشعارات بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل تحديث إعدادات الإشعارات",
        variant: "destructive",
      });
    },
  });
  
  // Handle account form submit
  const onAccountSubmit = async (values: z.infer<typeof accountSettingsSchema>) => {
    setIsAccountLoading(true);
    try {
      await updateAccountMutation.mutateAsync(values);
    } finally {
      setIsAccountLoading(false);
    }
  };
  
  // Handle password form submit
  const onPasswordSubmit = async (values: z.infer<typeof passwordChangeSchema>) => {
    setIsPasswordLoading(true);
    try {
      await changePasswordMutation.mutateAsync(values);
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  // Handle notification form submit
  const onNotificationSubmit = async (values: z.infer<typeof notificationSettingsSchema>) => {
    setIsNotificationsLoading(true);
    try {
      await updateNotificationsMutation.mutateAsync(values);
    } finally {
      setIsNotificationsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">غير مصرح لك</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">الرجاء تسجيل الدخول للوصول إلى هذه الصفحة</p>
        <Button className="mt-4" onClick={() => window.location.href = "/"}>
          العودة إلى الصفحة الرئيسية
        </Button>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-100">إعدادات الحساب</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">إدارة معلومات حسابك وتفضيلاتك</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:gap-8">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الحساب</CardTitle>
            <CardDescription>تحديث بياناتك الشخصية</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-6">
                <FormField
                  control={accountForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسمك الكامل" {...field} />
                      </FormControl>
                      <FormDescription>
                        الاسم الذي سيظهر للآخرين في النظام
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="أدخل بريدك الإلكتروني" {...field} />
                      </FormControl>
                      <FormDescription>
                        البريد الإلكتروني الخاص بحسابك
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isAccountLoading}>
                    {isAccountLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                        جاري الحفظ...
                      </span>
                    ) : (
                      "حفظ التغييرات"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>تغيير كلمة المرور</CardTitle>
            <CardDescription>تحديث كلمة المرور الخاصة بك</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور الحالية</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="أدخل كلمة المرور الحالية" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور الجديدة</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="أدخل كلمة المرور الجديدة" {...field} />
                      </FormControl>
                      <FormDescription>
                        يجب أن تكون كلمة المرور 6 أحرف على الأقل
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تأكيد كلمة المرور</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="أعد إدخال كلمة المرور الجديدة" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isPasswordLoading}>
                    {isPasswordLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                        جاري التغيير...
                      </span>
                    ) : (
                      "تغيير كلمة المرور"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الإشعارات</CardTitle>
            <CardDescription>تخصيص إشعاراتك وتنبيهاتك</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                <FormField
                  control={notificationForm.control}
                  name="emailNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">إشعارات البريد الإلكتروني</FormLabel>
                        <FormDescription>
                          استلام الإشعارات عبر البريد الإلكتروني
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={notificationForm.control}
                  name="desktopNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">إشعارات سطح المكتب</FormLabel>
                        <FormDescription>
                          استلام إشعارات في المتصفح عند استخدام النظام
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <FormField
                  control={notificationForm.control}
                  name="newExamsNotification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">اختبارات جديدة</FormLabel>
                        <FormDescription>
                          إشعار عند إضافة اختبارات جديدة
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={notificationForm.control}
                  name="gradesNotification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">تحديثات النتائج</FormLabel>
                        <FormDescription>
                          إشعار عند تحديث نتائج الاختبارات
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isNotificationsLoading}>
                    {isNotificationsLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                        جاري الحفظ...
                      </span>
                    ) : (
                      "حفظ الإعدادات"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>إجراءات الحساب</CardTitle>
            <CardDescription>إجراءات متعلقة بحسابك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200 dark:border-red-900">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">تسجيل الخروج من جميع الأجهزة</h3>
                <p className="text-sm text-gray-500 dark:text-dark-300">
                  تسجيل الخروج من الحساب على جميع الأجهزة والمتصفحات
                </p>
              </div>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                تسجيل الخروج من كل مكان
              </Button>
            </div>
            
            <div className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200 dark:border-red-900">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">تسجيل الخروج</h3>
                <p className="text-sm text-gray-500 dark:text-dark-300">
                  تسجيل الخروج من الحساب على هذا الجهاز
                </p>
              </div>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={logout}>
                تسجيل الخروج
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}