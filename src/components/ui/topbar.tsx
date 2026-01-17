"use client";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { Bell, Moon, Sun, Loader2, Menu } from "lucide-react";
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

interface TopbarProps {
  onMenuClick?: () => void;
}

// Types for BroadcastChannel messages
type BroadcastMessage =
  | { type: "LEADER_ANNOUNCEMENT"; tabId: string; timestamp: number }
  | { type: "LEADER_CHECK"; tabId: string; timestamp: number }
  | { type: "NOTIFICATIONS_UPDATED"; notifications: Notification[]; count: number; timestamp: number }
  | { type: "HEARTBEAT"; tabId: string; timestamp: number };

const CHANNEL_NAME = "notifications-polling";
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutos
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 segundos
const LEADER_CHECK_TIMEOUT = 1000; // 1 segundo para detectar líder existente

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Refs para BroadcastChannel y polling
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isLeaderRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leaderCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random()}`);
  const lastPollingTimeRef = useRef<number>(0);

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
  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingNotifications(true);
      }
      setNotificationsError(null);
      // Use the endpoint for authenticated users to get their own notifications
      const response: NotificationsResponse = await apiClient("api/notifications/user/my-notifications");
      const fetchedNotifications = response.notifications || [];
      setNotifications(fetchedNotifications);
      lastPollingTimeRef.current = Date.now();

      // Si somos líder, broadcast a otras pestañas
      if (isLeaderRef.current && channelRef.current) {
        const activeCount = fetchedNotifications.filter((n) => n.isActive).length;
        const message: BroadcastMessage = {
          type: "NOTIFICATIONS_UPDATED",
          notifications: fetchedNotifications,
          count: activeCount,
          timestamp: Date.now(),
        };
        channelRef.current.postMessage(message);
      }

      return fetchedNotifications;
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load notifications. Please try again."
      );
      setNotificationsError(errorMessage);
      console.error("Error fetching notifications:", err);
      return [];
    } finally {
      if (!silent) {
        setIsLoadingNotifications(false);
      }
    }
  }, []);

  // Inicializar BroadcastChannel o fallback a localStorage
  useEffect(() => {
    // Verificar si BroadcastChannel está disponible
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      // Manejar mensajes del canal
      channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        const message = event.data;

        switch (message.type) {
          case "LEADER_ANNOUNCEMENT":
          case "LEADER_CHECK":
            // Si alguien más es líder, no seremos líder
            if (message.tabId !== tabIdRef.current) {
              isLeaderRef.current = false;
              // Limpiar timeouts de verificación de líder
              if (leaderCheckTimeoutRef.current) {
                clearTimeout(leaderCheckTimeoutRef.current);
                leaderCheckTimeoutRef.current = null;
              }
            }
            break;

          case "NOTIFICATIONS_UPDATED":
            // Actualizar notificaciones sin hacer polling
            setNotifications(message.notifications);
            lastPollingTimeRef.current = message.timestamp;
            break;

          case "HEARTBEAT":
            // El líder sigue vivo
            if (message.tabId !== tabIdRef.current) {
              isLeaderRef.current = false;
            }
            break;
        }
      };

      // Manejar cierre del canal (otra pestaña se cerró)
      channel.onmessageerror = () => {
        console.warn("Error receiving message from BroadcastChannel");
      };

      // Verificar si ya hay un líder
      channel.postMessage({
        type: "LEADER_CHECK",
        tabId: tabIdRef.current,
        timestamp: Date.now(),
      } as BroadcastMessage);

      // Si no hay respuesta en LEADER_CHECK_TIMEOUT, ser líder
      const leaderCheckTimeout = setTimeout(() => {
        if (!isLeaderRef.current) {
          // Nadie respondió, ser líder
          isLeaderRef.current = true;
          channel.postMessage({
            type: "LEADER_ANNOUNCEMENT",
            tabId: tabIdRef.current,
            timestamp: Date.now(),
          } as BroadcastMessage);
        }
        leaderCheckTimeoutRef.current = null;
      }, LEADER_CHECK_TIMEOUT);

      leaderCheckTimeoutRef.current = leaderCheckTimeout;

      // Cleanup
      return () => {
        if (leaderCheckTimeout) {
          clearTimeout(leaderCheckTimeout);
        }
        channel.close();
        channelRef.current = null;
      };
    } else {
      // Fallback a localStorage si BroadcastChannel no está disponible
      console.warn("BroadcastChannel not available, using localStorage fallback");

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "notifications-update" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.notifications) {
              setNotifications(data.notifications);
              lastPollingTimeRef.current = data.timestamp || Date.now();
            }
          } catch (err) {
            console.error("Error parsing storage event:", err);
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);

      // En fallback, todas las pestañas pueden hacer polling (no ideal pero funciona)
      isLeaderRef.current = true;

      return () => {
        window.removeEventListener("storage", handleStorageChange);
      };
    }
  }, []);

  // Polling inteligente (solo líder, visible, popover cerrado)
  useEffect(() => {
    if (!isLeaderRef.current) {
      return; // Solo el líder hace polling
    }

    // Función para verificar si debemos hacer polling
    const shouldPoll = () => {
      return (
        document.visibilityState === "visible" &&
        !isNotificationsOpen &&
        Date.now() - lastPollingTimeRef.current >= POLLING_INTERVAL - 1000 // Margen de 1 segundo
      );
    };

    // Polling periódico
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(() => {
        if (shouldPoll()) {
          fetchNotifications(true); // Silent para no mostrar loader en polling automático
        }
      }, POLLING_INTERVAL);
    };

    // Heartbeat para que otras pestañas sepan que el líder sigue vivo
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (channelRef.current && isLeaderRef.current) {
          channelRef.current.postMessage({
            type: "HEARTBEAT",
            tabId: tabIdRef.current,
            timestamp: Date.now(),
          } as BroadcastMessage);
        }
      }, HEARTBEAT_INTERVAL);
    };

    // Manejar cambios de visibilidad
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldPoll()) {
        // Hacer polling inmediato si es necesario
        if (Date.now() - lastPollingTimeRef.current >= POLLING_INTERVAL) {
          fetchNotifications(true);
        }
        startPolling();
        startHeartbeat();
      } else {
        // Pausar polling cuando la pestaña está en background
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    };

    // Iniciar si la pestaña está visible
    if (document.visibilityState === "visible" && !isNotificationsOpen) {
      // Polling inicial después de un delay (para evitar polling inmediato al montar)
      const initialDelay = Math.max(0, POLLING_INTERVAL - (Date.now() - lastPollingTimeRef.current));
      setTimeout(() => {
        if (shouldPoll()) {
          fetchNotifications(true);
        }
        startPolling();
      }, initialDelay);
      startHeartbeat();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isNotificationsOpen, fetchNotifications]);

  // Pausar polling cuando el popover está abierto
  useEffect(() => {
    if (isNotificationsOpen && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [isNotificationsOpen]);

  // Fetch notifications cuando se abre el popover
  useEffect(() => {
    if (isNotificationsOpen) {
      fetchNotifications(false);
    }
  }, [isNotificationsOpen, fetchNotifications]);

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
    <header className="flex items-center relative px-2 sm:px-4 md:px-6 py-2 bg-card dark:bg-card border-b border-border">
      {/* Sección izquierda: Botón de hamburguesa (móvil) o espaciador (desktop) */}
      <div className="flex items-center flex-shrink-0 w-12 md:w-12">
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Logo siempre centrado */}
      <div className="flex items-center justify-center flex-1 absolute left-0 right-0 pointer-events-none">
        <div className="pointer-events-auto">
          <Image
            src="/logo-alt.png"
            alt="Bespoke Logo"
            width={160}
            height={40}
            className="h-8 sm:h-10 w-auto object-contain max-w-[120px] sm:max-w-none"
            priority
          />
        </div>
      </div>
      
      {/* Botones a la derecha */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0 ml-auto z-10">
        {/* Botón de Tema con tu lógica original */}
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary-foreground">
                  {activeNotificationsCount > 9 ? "9+" : activeNotificationsCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-h-[600px] overflow-y-auto" align="end">
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
