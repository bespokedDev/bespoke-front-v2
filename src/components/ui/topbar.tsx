"use client";import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext"; // Importamos el hook de autenticación
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Moon, Sun } from "lucide-react";

export function Topbar() {
  // Se mantiene tu lógica original para el modo oscuro
  const [isDark, setIsDark] = useState(false);

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

  // Se añade la lógica para el logout y el usuario
  const { user, logout } = useAuth();

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
    <header className="flex items-center justify-end px-4 sm:px-6 py-2 border-b border-light-border dark:border-dark-border">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Botón de Tema con tu lógica original */}
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="w-8 h-8 cursor-pointer">
              {/* AvatarFallback ahora es dinámico con fondo morado y texto blanco */}
              <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
