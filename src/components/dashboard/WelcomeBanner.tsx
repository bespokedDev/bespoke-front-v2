"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface WelcomeBannerProps {
  userName?: string;
  fallbackName?: string;
}

export function WelcomeBanner({ userName, fallbackName }: WelcomeBannerProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  // Detectar el modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    // Verificar al montar el componente
    checkDarkMode();

    // Observar cambios en la clase dark del documento
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Usar userName si se proporciona, sino usar user?.name, sino el fallback
  const displayName = userName || user?.name || fallbackName || "User";

  // Seleccionar la imagen según el modo oscuro
  const imageSrc = isDark ? "/hello-dashboard-dark.svg" : "/hello-dashboard.svg";

  return (
    <div className="relative w-full overflow-visible">
      {/* Card con fondo responsive: full en móvil, 3/4 en tablet, 1/2 en desktop */}
      <div className="bg-card rounded-xl border py-10 px-8 mt-12 w-full md:w-3/4 xl:w-1/2 relative z-10">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-1">
            Hello {displayName}!
          </h2>
          <p className="text-muted-foreground">
            It&apos;s good to see you again.
          </p>
        </div>
      </div>

      {/* Ilustración posicionada de manera que parte se salga del fondo */}
      <div className="absolute left-[70%] md:left-[45%] xl:left-[30%] top-1/3 -translate-y-1/2 hidden md:block z-20">
        <Image
          src={imageSrc}
          alt="Welcome illustration"
          width={160}
          height={160}
          className="object-contain"
        />
      </div>
    </div>
  );
}
