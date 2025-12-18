"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && user) {
      const role = user.role?.toLowerCase();
      if (role === "professor") {
        router.replace("/professor/dashboard");
      } else if (role === "student") {
        router.replace("/student/dashboard");
      } else {
        router.replace("/");
      }
    }
  }, [user, isAuthLoading, router]);

  // Mostrar loader mientras se verifica la autenticación
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-lightBackground dark:bg-darkBackground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si el usuario está autenticado, no mostrar el formulario (ya se redirigió)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      console.log("[Login] Attempting login with email:", email);
      
      const response = await apiClient("api/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAutoRedirect: true, // Evitar redirección automática para poder manejar el error
      });

      console.log("[Login] Response received:", response);

      // Verificar que la respuesta tenga la estructura esperada
      if (!response) {
        console.error("[Login] Empty response from server");
        setError("Login failed: Empty response from server.");
        return;
      }

      if (!response.token) {
        console.error("[Login] No token in response:", response);
        setError("Login failed: No token received from server.");
        return;
      }

      if (!response.user) {
        console.error("[Login] No user data in response:", response);
        setError("Login failed: No user data received from server.");
        return;
      }

      // Verificar que el objeto user tenga los campos requeridos
      if (!response.user.id || !response.user.role) {
        console.error("[Login] Invalid user structure:", response.user);
        setError("Login failed: Invalid user data structure.");
        return;
      }

      console.log("[Login] Login successful, user:", response.user);
      login(response.token, response.user);
    } catch (err: unknown) {
      console.error("[Login] Error during login:", err);
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isUnauthorizedError
          ? "Invalid email or password. Please try again."
          : errorInfo.isValidationError
          ? "Please enter both email and password."
          : "An unexpected error occurred. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-lightBackground dark:bg-darkBackground p-4">
      <Card className="w-full max-w-3xl bg-white dark:bg-darkCard border-lightBorder dark:border-darkBorder overflow-hidden p-1 shadow-[0_10px_40px_rgba(76,84,158,0.3)] dark:shadow-[0_10px_40px_rgba(76,84,158,0.2)]">
        <div className="grid grid-cols-1 md:grid-cols-2 md:items-stretch">
          {/* Lado izquierdo: Imagen */}
          <div className="hidden md:block relative p-2">
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <Image
                src="/art.jpg"
                alt="Login illustration"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 0vw, 50vw"
              />
            </div>
          </div>

          {/* Lado derecho: Formulario de login */}
          <div className="flex flex-col justify-center p-6 md:p-8">
            <CardHeader className="px-0 pt-0 pb-10">
              <CardTitle className="text-2xl text-lightText dark:text-darkText">
                Welcome!
              </CardTitle>
              <CardDescription className="text-lightSubtext dark:text-darkSubtext">
                Enter your username below to login to your account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="grid gap-4 px-0">
                <div className="grid gap-2">
                  <Label
                    htmlFor="email"
                    className="text-lightText dark:text-darkText"
                  >
                    User
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-transparent text-lightText dark:text-darkText border-lightBorder dark:border-darkBorder placeholder:text-lightSubtext/70 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="password"
                    className="text-lightText dark:text-darkText"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-transparent text-lightText dark:text-darkText border-lightBorder dark:border-darkBorder placeholder:text-lightSubtext/70 focus-visible:ring-primary"
                  />
                </div>
                {error && <p className="text-sm text-accent1">{error}</p>}
              </CardContent>
              <CardFooter className="px-0 pb-0 pt-2">
                <Button
                  className="w-full bg-primary text-white hover:bg-primary/90"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </CardFooter>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
