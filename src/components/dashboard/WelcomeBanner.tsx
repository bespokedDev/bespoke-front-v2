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

  // Función para acortar el nombre, manejando apellidos compuestos y nombres compuestos
  const getShortName = (fullName: string): string => {
    if (!fullName || fullName.trim() === "") return "User";
    
    const words = fullName.trim().split(/\s+/);
    
    if (words.length === 0) return "User";
    if (words.length === 1) return words[0];
    
    // Preposiciones, artículos y partículas comunes en nombres/apellidos compuestos
    const particles = new Set([
      "de", "di", "del", "la", "los", "las", "das", "dos", 
      "da", "do", "du", "von", "van", "le", "les", "el",
      "y", "e", "i" // También puede haber "y" o "e" en nombres compuestos
    ]);
    
    // Si la segunda palabra es una partícula, necesitamos tomar más palabras
    if (words.length >= 2 && particles.has(words[1].toLowerCase())) {
      // Empezamos con la primera palabra (nombre)
      let i = 1; // Ya tomamos la palabra 0
      
      // Seguir tomando palabras mientras sean partículas o mientras 
      // la siguiente palabra después de una partícula también sea partícula
      while (i < words.length && particles.has(words[i].toLowerCase())) {
        i++;
      }
      
      // Tomar la palabra siguiente a la última partícula (si existe)
      // Esto captura casos como "maria de los angeles" -> toma "angeles" también
      if (i < words.length) {
        i++; // Incluir la palabra después de las partículas
      }
      
      // Tomar desde el inicio hasta i (sin incluir i, ya que slice es exclusivo en el final)
      const shortName = words.slice(0, i).join(" ");
      
      // Límite de caracteres por seguridad
      const MAX_LENGTH = 35;
      if (shortName.length > MAX_LENGTH) {
        const truncated = shortName.substring(0, MAX_LENGTH);
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > 0) {
          return truncated.substring(0, lastSpace) + "...";
        }
        return truncated + "...";
      }
      
      return shortName;
    } else {
      // Caso normal: tomar primeras 2 palabras (nombre + primer apellido)
      const shortName = words.slice(0, 2).join(" ");
      
      // Límite de caracteres por seguridad
      const MAX_LENGTH = 35;
      if (shortName.length > MAX_LENGTH) {
        const truncated = shortName.substring(0, MAX_LENGTH);
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > 0) {
          return truncated.substring(0, lastSpace) + "...";
        }
        return truncated + "...";
      }
      
      return shortName;
    }
  };

  // Obtener el nombre completo y acortarlo
  const fullName = userName || user?.name || fallbackName || "User";
  const displayName = getShortName(fullName);

  // Seleccionar la imagen según el modo oscuro
  const imageSrc = isDark ? "/hello-dashboard-dark.svg" : "/hello-dashboard.svg";

  return (
    <div className="relative w-full overflow-visible">
      {/* Card con fondo responsive: full en móvil, 3/4 en tablet, 1/2 en desktop */}
      <div className="bg-card rounded-xl border py-10 px-8 mt-6 w-full md:w-3/4 xl:w-1/2 relative z-10">
        <div>
          <h2 className="text-2xl font-medium text-foreground mb-1">
            Hello <span className="font-bold">{displayName}!</span>
          </h2>
          <p className="text-muted-foreground font-semibold">
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
