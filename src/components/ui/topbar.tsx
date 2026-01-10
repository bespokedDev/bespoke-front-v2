"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Moon, Sun, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";

interface NotificationCategory {
  _id: string;
  category_notification_description: string;
}

interface NotificationPenalization {
  _id: string;
  name: string;
  description?: string | null;
}

interface NotificationEnrollment {
  _id: string;
  alias?: string | null;
  language: string;
  enrollmentType: string;
}

interface NotificationProfessor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface NotificationStudent {
  _id: string;
  name: string;
  studentCode: string;
  email: string;
  phone?: string;
}

interface Notification {
  _id: string;
  idCategoryNotification: NotificationCategory;
  notification_description: string;
  idPenalization?: NotificationPenalization | null;
  idEnrollment?: NotificationEnrollment | null;
  idProfessor?: NotificationProfessor | null;
  idStudent?: NotificationStudent | NotificationStudent[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  message: string;
  count: number;
  notifications: Notification[];
}

export function Topbar() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const prefersDark = document.documentElement.classList.contains("dark");
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const { user, logout } = useAuth();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      setNotificationsError(null);
      // Use the endpoint for authenticated users to get their own notifications
      const response: NotificationsResponse = await apiClient("api/notifications/user/my-notifications");
      setNotifications(response.notifications || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load notifications. Please try again."
      );
      setNotificationsError(errorMessage);
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isNotificationsOpen) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotificationsOpen]);

  // Count active notifications
  const activeNotificationsCount = notifications.filter((n) => n.isActive).length;

  // Función para obtener las iniciales del usuario
  const getUserInitials = (name?: string): string => {
    if (!name || name.trim() === "") {
      return "U"; // Fallback si no hay nombre
    }

    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      // Si solo hay una palabra, toma las dos primeras letras
      return nameParts[0].substring(0, 2).toUpperCase();
    } else {
      // Si hay múltiples palabras, toma la primera letra de cada una (máximo 2)
      return nameParts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
  };

  const userInitials = getUserInitials(user?.name);

  return (
    <header className="flex items-center justify-center relative px-4 sm:px-6 py-2 bg-white dark:bg-white">
      {/* Logo centrado */}
      <div className="flex items-center absolute left-1/2 transform -translate-x-1/2">
        <Image
          src="/logo-alt.png"
          alt="Bespoke Logo"
          width={160}
          height={40}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>
      
      {/* Botones a la derecha */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        {/* Botón de Tema con tu lógica original */}
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeNotificationsCount > 9 ? "9+" : activeNotificationsCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Notifications</h3>
                {activeNotificationsCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {activeNotificationsCount} active
                  </span>
                )}
              </div>

              {isLoadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : notificationsError ? (
                <div className="py-4 text-center text-sm text-destructive">
                  {notificationsError}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`rounded-lg border p-3 space-y-2 ${
                        notification.isActive
                          ? "bg-card border-border"
                          : "bg-muted/50 border-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary">
                              {notification.idCategoryNotification?.category_notification_description || "Notification"}
                            </span>
                            {!notification.isActive && (
                              <span className="text-xs text-muted-foreground">(Inactive)</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground">
                            {notification.notification_description}
                          </p>
                        </div>
                      </div>

                      {/* Related information */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        {notification.idPenalization && (
                          <div>
                            <span className="font-medium">Penalty: </span>
                            {notification.idPenalization.name}
                          </div>
                        )}
                        {notification.idEnrollment && (
                          <div>
                            <span className="font-medium">Enrollment: </span>
                            {notification.idEnrollment.alias || `${notification.idEnrollment.language} (${notification.idEnrollment.enrollmentType})`}
                          </div>
                        )}
                        {notification.idProfessor && (
                          <div>
                            <span className="font-medium">Professor: </span>
                            {notification.idProfessor.name}
                          </div>
                        )}
                        {notification.idStudent && (
                          <div>
                            <span className="font-medium">Student{Array.isArray(notification.idStudent) && notification.idStudent.length > 1 ? "s" : ""}: </span>
                            {Array.isArray(notification.idStudent)
                              ? notification.idStudent.map((s) => s.name).join(", ")
                              : notification.idStudent.name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                          {formatDateForDisplay(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="w-8 h-8 cursor-pointer">
              {/* AvatarFallback ahora es dinámico con fondo morado y texto blanco */}
              <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer"
            >
              My Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Se añade el onClick para el logout */}
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
