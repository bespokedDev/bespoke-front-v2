// En: components/auth/AuthGuard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Esperar a que el contexto termine de cargar
    if (isAuthContextLoading) {
      return;
    }

    // Si no hay autenticación, redirigir a login
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthContextLoading, isAuthenticated, router]);

  // Mostrar loader mientras el contexto carga
  if (isAuthContextLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-light-background dark:bg-dark-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay autenticación, no renderizar nada (ya se redirigió)
  if (!isAuthenticated) {
    return null;
  }

  // Si todo está correcto, renderizar el contenido protegido
  // La verificación real del token se hará automáticamente cuando el usuario
  // haga cualquier petición a la API. Si el token es inválido, el apiClient
  // manejará los errores 401/403 y redirigirá al login.
  return <>{children}</>;
}
