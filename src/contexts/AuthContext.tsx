"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

// Definimos los tipos para el usuario y el contexto
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  userType?: string; // "admin" | "professor" | "student"
  idRol?: string; // ObjectId del rol en la colección roles
  // Campos adicionales según tipo de usuario
  ciNumber?: string; // Solo para professors
  phone?: string; // Para professors y students
  studentCode?: string; // Solo para students
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

// Creamos el contexto con un valor por defecto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Creamos el AuthProvider, que envolverá nuestra aplicación
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Para saber si estamos verificando el estado inicial
  const router = useRouter();

  useEffect(() => {
    // Al cargar la app, intentamos recuperar el token y los datos del usuario del localStorage
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      // Si hay un error, limpiamos el storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    console.log("[AuthContext] Login iniciado, guardando token y datos del usuario");
    
    // Guardamos el token y los datos del usuario en el estado y en localStorage
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    
    // Guardamos el token en las cookies para que el middleware pueda acceder a él
    // Usamos SameSite=Lax para mejor compatibilidad
    if (typeof document !== "undefined") {
      document.cookie = `authToken=${newToken}; path=/; max-age=86400; SameSite=Lax;`;
    }
    
    console.log("[AuthContext] Token y datos guardados, redirigiendo según rol:", userData.role);
    
    // Redirigimos según el rol del usuario usando replace para evitar problemas de navegación
    const role = userData.role?.toLowerCase();
    if (role === "professor") {
      router.replace("/professor/dashboard");
    } else if (role === "student") {
      router.replace("/student/dashboard");
    } else {
      // Admin o cualquier otro rol va al dashboard principal
      router.replace("/");
    }
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout del backend antes del cleanup local
      // Usamos skipAutoRedirect para evitar que redirija automáticamente si falla
      await apiClient("api/users/logout", {
        method: "POST",
        skipAutoRedirect: true,
      });
    } catch (error) {
      // Si falla el logout del backend, continuar con el cleanup local
      // Esto es importante para asegurar que el usuario siempre pueda cerrar sesión
      console.warn("Failed to call logout endpoint, continuing with local cleanup:", error);
    } finally {
      // Limpiamos el estado y el localStorage
      setToken(null);
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        // Eliminamos la cookie
        document.cookie =
          "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      }
      router.push("/login"); // Redirigimos a la página de login
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        user,
        token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación más fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
