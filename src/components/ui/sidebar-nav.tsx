// En: components/ui/sidebar-nav.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Menu,
  ChevronLeft,
  ChevronDown,
  FileBadge,
  CircleDollarSign,
  Landmark, // Icono para Contabilidad
  ArrowRightLeft,
  FileChartColumn, // Icono para Ingresos
  BookOpen, // Icono para Plans
  CreditCard, // Icono para Payment Methods
  Settings, // Icono para Settings
  Receipt, // Icono para Payment Types
  AlertTriangle, // Icono para Penalties
  BookMarked, // Icono para Content Class
  GraduationCap, // Icono para Class Types
  Tags, // Icono para Income Categories
  FolderTree, // Icono para Class Categories
  Bell, // Icono para Category Notifications
  User, // Icono para Profile
  ClipboardList, // Icono para Penalization Registry
  X, // Icono para cerrar en móvil
} from "lucide-react";

// --- ESTRUCTURA COMPLETA DE NAVEGACIÓN ---
const allNavItems = [
  // Admin items
  { title: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "admin-jr"] },
  { title: "Teachers", href: "/teachers", icon: UserCircle, roles: ["admin", "admin-jr"] },
  { title: "Students", href: "/students", icon: Users, roles: ["admin", "admin-jr"] },
  { title: "Enrollments", href: "/enrollments", icon: FileBadge, roles: ["admin", "admin-jr"] },
  { title: "Penalization Registry", href: "/penalization-registry", icon: ClipboardList, roles: ["admin", "admin-jr"] },
  // Professor items
  { title: "Dashboard", href: "/professor/dashboard", icon: LayoutDashboard, roles: ["professor"] },
  { title: "Enrollments", href: "/professor/class-registry", icon: FileBadge, roles: ["professor"] },
  { title: "My Penalizations", href: "/my-penalizations", icon: ClipboardList, roles: ["professor"] },
  // Student items
  { title: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, roles: ["student"] },
  { title: "Profile", href: "/student/profile", icon: User, roles: ["student"] },
  { title: "My Penalizations", href: "/my-penalizations", icon: ClipboardList, roles: ["student"] },
  // Nuevo grupo para Contabilidad (solo admin)
  {
    title: "Accounting",
    icon: Landmark,
    roles: ["admin"],
    subItems: [
      { title: "Incomes", href: "/incomes", icon: ArrowRightLeft },
      { title: "Accounting Report", href: "/accounting/report", icon: FileChartColumn },
      { title: "Payouts", href: "/payouts", icon: CircleDollarSign },
    ],
  },
  // Nuevo grupo para Settings (solo admin)
  {
    title: "Settings",
    icon: Settings,
    roles: ["admin", "admin-jr"],
    subItems: [
      { title: "Plans", href: "/settings/plans", icon: BookOpen },
      { title: "Payment Methods", href: "/settings/payment-methods", icon: CreditCard },
      { title: "Payment Types", href: "/settings/payment-types", icon: Receipt },
      { title: "Penalties", href: "/settings/penalties", icon: AlertTriangle },
      { title: "Class Content Types", href: "/settings/content-class", icon: BookMarked },
      { title: "Class Types", href: "/settings/class-types", icon: GraduationCap },
      { title: "Professor Types", href: "/settings/professor-types", icon: UserCircle },
      { title: "Income Categories", href: "/settings/category-money", icon: Tags },
      { title: "Class Categories", href: "/settings/category-class", icon: FolderTree },
      { title: "Notification Categories", href: "/settings/category-notifications", icon: Bell },
      { title: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
];

interface SidebarNavProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function SidebarNav({ isMobileOpen = false, onMobileClose }: SidebarNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  // Sidebar colapsado por defecto
  const [collapsed, setCollapsed] = useState(true);
  // Estado para manejar los submenús abiertos
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    Accounting: false,
    Settings: false, // Settings cerrado por defecto
  });

  // Cerrar sidebar móvil cuando cambia la ruta
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Filtrar items según el rol del usuario
  const navItems = useMemo(() => {
    if (!user?.role) return [];
    
    const userRole = user.role.toLowerCase();
    
    return allNavItems.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.some((role) => role.toLowerCase() === userRole);
    });
  }, [user?.role]);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Función helper para renderizar el contenido del nav
  const renderNavContent = (isMobile = false) => (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) =>
        item.subItems ? (
          // Renderiza un grupo de submenú
          <div key={item.title}>
            <button
              onClick={() => {
                if (isMobile || !collapsed) {
                  toggleSubmenu(item.title);
                }
              }}
              className={cn(
                "flex items-center w-full gap-3 px-4 py-2 text-sm rounded-md transition-colors justify-start",
                // Lógica para resaltar el padre si un hijo está activo
                item.subItems.some((sub) => pathname === sub.href)
                  ? "text-primary dark:text-white font-semibold"
                  : "text-light-text hover:bg-primary/10 dark:text-dark-text dark:hover:bg-primary/20",
                !isMobile && collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate flex-1 text-left">
                  {item.title}
                </span>
              )}
              {(!collapsed || isMobile) && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    openSubmenus[item.title] && "rotate-180"
                  )}
                />
              )}
            </button>
            {/* Renderiza los sub-ítems si el submenú está abierto */}
            {((!collapsed || isMobile) && openSubmenus[item.title]) && (
              <div className="flex flex-col gap-1 pt-1 pl-6">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors",
                      pathname === subItem.href
                        ? "bg-secondary text-white hover:bg-secondary/90"
                        : "text-light-text hover:bg-primary hover:text-white dark:text-dark-text dark:hover:text-white"
                    )}
                  >
                    <subItem.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{subItem.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Renderiza un ítem de enlace normal
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-primary/10 transition-colors",
              "justify-start",
              // Verificar si la ruta coincide exactamente o si es una sub-ruta
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-secondary text-white hover:bg-secondary/90"
                : "text-light-text hover:bg-primary hover:text-white dark:text-dark-text dark:hover:text-white",
              !isMobile && collapsed && "justify-center"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span className="truncate">{item.title}</span>}
          </Link>
        )
      )}
    </nav>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden md:block min-h-screen border-r border-border bg-card dark:bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {/*<Image src="/logo.png" alt="Logo" width={32} height={32} />*/}
            <span className="font-bold text-lg text-card-foreground">Bespoke</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-accent/10"
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
        {renderNavContent(false)}
      </aside>

      {/* Sidebar Mobile - Overlay y Drawer */}
      {isMobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside
            className={cn(
              "fixed left-0 top-0 h-full w-64 bg-card dark:bg-card border-r border-border z-50 md:hidden transition-transform duration-300",
              isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-card-foreground">Bespoke</span>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 rounded-md hover:bg-accent/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
