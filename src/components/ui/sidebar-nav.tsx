// En: components/ui/sidebar-nav.tsx
"use client";

import { useState, useMemo } from "react";
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
  User, // Icono para Profile
} from "lucide-react";

// --- ESTRUCTURA COMPLETA DE NAVEGACIÓN ---
const allNavItems = [
  // Admin items
  { title: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin"] },
  { title: "Teachers", href: "/teachers", icon: UserCircle, roles: ["admin"] },
  { title: "Students", href: "/students", icon: Users, roles: ["admin"] },
  { title: "Enrollments", href: "/enrollments", icon: FileBadge, roles: ["admin"] },
  // Professor items
  { title: "Dashboard", href: "/professor/dashboard", icon: LayoutDashboard, roles: ["professor"] },
  { title: "Enrollments", href: "/professor/class-registry", icon: FileBadge, roles: ["professor"] },
  // Student items
  { title: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, roles: ["student"] },
  { title: "Profile", href: "/student/profile", icon: User, roles: ["student"] },
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
    roles: ["admin"],
    subItems: [
      { title: "Plans", href: "/settings/plans", icon: BookOpen },
      { title: "Payment Methods", href: "/settings/payment-methods", icon: CreditCard },
      { title: "Payment Types", href: "/settings/payment-types", icon: Receipt },
      { title: "Penalties", href: "/settings/penalties", icon: AlertTriangle },
      { title: "Class Content Types", href: "/settings/content-class", icon: BookMarked },
      { title: "Class Types", href: "/settings/class-types", icon: GraduationCap },
      { title: "Income Categories", href: "/settings/category-money", icon: Tags },
      { title: "Class Categories", href: "/settings/category-class", icon: FolderTree },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Sidebar colapsado por defecto
  const [collapsed, setCollapsed] = useState(true);
  // Estado para manejar los submenús abiertos
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    Accounting: false,
    Settings: false, // Settings cerrado por defecto
  });

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

  return (
    <aside
      className={cn(
        "hidden md:block min-h-screen border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {/*<Image src="/logo.png" alt="Logo" width={32} height={32} />*/}
            <span className="font-bold text-lg">Bespoke</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-light-border dark:hover:bg-dark-border"
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) =>
          item.subItems ? (
            // Renderiza un grupo de submenú
            <div key={item.title}>
              <button
                onClick={() => !collapsed && toggleSubmenu(item.title)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-2 text-sm rounded-md transition-colors justify-start",
                  // Lógica para resaltar el padre si un hijo está activo
                  item.subItems.some((sub) => pathname === sub.href)
                    ? "text-primary dark:text-white font-semibold"
                    : "text-light-text hover:bg-primary/10 dark:text-dark-text dark:hover:bg-primary/20",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">
                    {item.title}
                  </span>
                )}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSubmenus[item.title] && "rotate-180"
                    )}
                  />
                )}
              </button>
              {/* Renderiza los sub-ítems si el submenú está abierto y la barra no está colapsada */}
              {!collapsed && openSubmenus[item.title] && (
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
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
