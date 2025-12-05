"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <p className="text-muted-foreground">
        Welcome back, {user?.name || "Professor"}!
      </p>

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
            <CardTitle className="flex items-center gap-2">
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
            <div className="space-y-4">
              {enrollments.slice(0, 5).map((enrollment) => (
                <Card key={enrollment._id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <Label className="font-semibold">
                            {enrollment.planId.name}
                          </Label>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {enrollment.studentIds.length} student
                              {enrollment.studentIds.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {enrollment.studentIds
                              .map((s) => s.studentId.name)
                              .join(", ")}
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/professor/class-registry/${enrollment._id}`}>
                          View Registry
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

