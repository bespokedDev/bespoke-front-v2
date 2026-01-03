"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  BookOpen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Enrollment {
  _id: string;
  planId: {
    name: string;
  };
  studentIds: Array<{
    _id: string;
    studentId: {
      _id: string;
      studentCode: string;
      name: string;
      email: string;
    };
  }>;
}

interface ProfessorEnrollmentsResponse {
  message?: string;
  professor?: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: Enrollment[];
  total?: number;
}

export default function ProfessorDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response: ProfessorEnrollmentsResponse = await apiClient(
        `api/professors/${user.id}/enrollments`
      );
      console.log("[ProfessorDashboard] Enrollments response:", response);
      
      // La respuesta tiene la estructura: { message, professor, enrollments, total }
      const enrollmentsArray = response.enrollments || [];
      setEnrollments(enrollmentsArray);
    } catch (err: unknown) {
      console.error("[ProfessorDashboard] Error fetching enrollments:", err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollments. Please try again."
      );
      setError(errorMessage);
      setEnrollments([]); // Asegurar que siempre sea un array
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Calcular estadísticas
  // Nota: El endpoint solo devuelve enrollments activos (status: 1), no necesitamos filtrar
  const totalStudents = enrollments.reduce(
    (acc, e) => acc + (e.studentIds?.length || 0),
    0
  );
  const upcomingClasses = enrollments.length; // Simplificado, podría calcularse con fechas

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <WelcomeBanner fallbackName="Professor" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard
          title="Active Enrollments"
          count={enrollments.length}
          color="secondary"
        />
        <SummaryCard
          title="Total Students"
          count={totalStudents}
          color="primary"
        />
        <SummaryCard
          title="Upcoming Classes"
          count={upcomingClasses}
          color="accent-1"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              My Enrollments
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/professor/class-registry">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active enrollments found.
            </p>
          ) : (
            <div className="space-y-0">
              {enrollments.slice(0, 5).map((enrollment, index) => (
                <div
                  key={enrollment._id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 ${
                    index < enrollments.slice(0, 5).length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Estudiantes - Más prominente */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="h-5 w-5 text-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-wrap">
                          {enrollment.studentIds.map((s, studentIndex) => (
                            <span key={s.studentId._id}>
                              <Link
                                href={`/students/${s.studentId._id}`}
                                className="text-base sm:text-lg font-semibold text-primary hover:underline break-words"
                              >
                                {s.studentId.name}
                              </Link>
                              {studentIndex < enrollment.studentIds.length - 1 && (
                                <span className="text-base sm:text-lg font-semibold text-foreground mx-1">
                                  ,
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-foreground pl-7">
                        {enrollment.studentIds.length} student
                        {enrollment.studentIds.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {/* Plan - Menos prominente */}
                    <div className="flex items-center gap-2 pt-1">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <Label className="text-xs text-foreground font-normal break-words">
                        {enrollment.planId.name}
                      </Label>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
                    <Link href={`/professor/class-registry/${enrollment._id}`}>
                      View Registry
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

