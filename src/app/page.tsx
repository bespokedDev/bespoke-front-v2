"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { AssignmentsTable } from "@/components/dashboard/AssignmentsTable";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const summary = [
    { title: "Estudiantes", count: 120, color: "secondary" },
    { title: "Profesores", count: 25, color: "primary" },
    { title: "Planes Activos", count: 8, color: "accent-2" },
    { title: "Asignaciones Hoy", count: 15, color: "accent-1" },
  ];

  // Redirigir según el rol si no es admin
  useEffect(() => {
    if (!isLoading && user) {
      const role = user.role?.toLowerCase();
      if (role === "professor") {
        router.replace("/professor/dashboard");
      } else if (role === "student") {
        router.replace("/student/dashboard");
      }
    }
  }, [user, isLoading, router]);

  // Mostrar loader mientras se verifica el rol
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si el usuario no es admin, no mostrar nada (ya se redirigió)
  if (user) {
    const role = user.role?.toLowerCase();
    if (role === "professor" || role === "student") {
      return null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard"/>
      {user && (
        <p className="text-muted-foreground">
          Welcome, {user.name}!
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            count={item.count}
            color={item.color}
          />
        ))}
      </div>

      <AnalyticsChart />

      <AssignmentsTable />
    </div>
  );
}
