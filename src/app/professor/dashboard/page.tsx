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
import { formatDateForDisplay } from "@/lib/dateUtils";
import { Loader2, AlertCircle, BookOpen, Users, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  // Campos opcionales para enrollments sustitutos
  substituteInfo?: {
    assignedDate: string;
    expiryDate: string;
  };
  professor?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
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

interface SubstituteEnrollmentsResponse {
  message: string;
  professor: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: Enrollment[];
  total: number;
}

export default function ProfessorDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [substituteEnrollments, setSubstituteEnrollments] = useState<
    Enrollment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch enrollments regulares y sustitutos en paralelo
      const [regularResponse, substituteResponse] = await Promise.all([
        apiClient(`api/professors/${user.id}/enrollments`).catch(() => ({
          enrollments: [],
        })) as Promise<ProfessorEnrollmentsResponse>,
        apiClient(`api/professors/${user.id}/substitute-enrollments`).catch(
          () => ({ enrollments: [] })
        ) as Promise<SubstituteEnrollmentsResponse>,
      ]);

      console.log(
        "[ProfessorDashboard] Enrollments response:",
        regularResponse
      );
      console.log(
        "[ProfessorDashboard] Substitute enrollments response:",
        substituteResponse
      );

      const regularArray = regularResponse.enrollments || [];
      const substituteArray = substituteResponse.enrollments || [];

      setEnrollments(regularArray);
      setSubstituteEnrollments(substituteArray);
    } catch (err: unknown) {
      console.error("[ProfessorDashboard] Error fetching enrollments:", err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollments. Please try again."
      );
      setError(errorMessage);
      setEnrollments([]);
      setSubstituteEnrollments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Combinar enrollments regulares y sustitutos para mostrar
  const allEnrollments = [...enrollments, ...substituteEnrollments];

  // Calcular estadísticas
  // Nota: El endpoint solo devuelve enrollments activos (status: 1), no necesitamos filtrar
  const totalStudents = allEnrollments.reduce(
    (acc, e) => acc + (e.studentIds?.length || 0),
    0
  );
  const upcomingClasses = allEnrollments.length; // Simplificado, podría calcularse con fechas

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
          count={enrollments.length + substituteEnrollments.length}
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
              <Link href="/professor/class-registry">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allEnrollments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active enrollments found.
            </p>
          ) : (
            <div className="space-y-0">
              {allEnrollments.slice(0, 5).map((enrollment, index) => {
                const isSubstitute = !!enrollment.substituteInfo;
                return (
                  <div
                    key={enrollment._id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between ${
                      index < allEnrollments.slice(0, 5).length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Badge de sustituto y estudiantes */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSubstitute ? (
                            <UserCheck className="h-5 w-5 text-accent-1 shrink-0" />
                          ) : (
                            <Users className="h-5 w-5 text-foreground shrink-0" />
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {enrollment.studentIds.map((s, studentIndex) => (
                              <span key={s.studentId._id}>
                                <Link
                                  href={`/students/${s.studentId._id}`}
                                  className="text-base sm:text-lg font-semibold text-primary hover:underline break-words"
                                >
                                  {s.studentId.name}
                                </Link>
                                {isSubstitute && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs ml-2"
                                  >
                                    Substitute
                                  </Badge>
                                )}
                                {studentIndex <
                                  enrollment.studentIds.length - 1 && (
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
                        {/* Información de suplencia */}
                        {isSubstitute && enrollment.substituteInfo && (
                          <div className="text-xs text-muted-foreground pl-7">
                            {enrollment.substituteInfo.assignedDate !==
                            "sin fecha asignada" ? (
                              <>
                                Assigned:{" "}
                                {formatDateForDisplay(
                                  enrollment.substituteInfo.assignedDate
                                )}{" "}
                                • Expires:{" "}
                                {enrollment.substituteInfo.expiryDate !==
                                "sin fecha asignada"
                                  ? formatDateForDisplay(
                                      enrollment.substituteInfo.expiryDate
                                    )
                                  : "No expiry date"}
                              </>
                            ) : (
                              <>
                                Expires:{" "}
                                {enrollment.substituteInfo.expiryDate !==
                                "sin fecha asignada"
                                  ? formatDateForDisplay(
                                      enrollment.substituteInfo.expiryDate
                                    )
                                  : "No expiry date"}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Plan - Menos prominente */}
                      <div className="flex items-center gap-2 pl-7">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <Label className="text-xs text-foreground font-normal break-words">
                          {enrollment.planId.name}
                        </Label>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto shrink-0"
                    >
                      <Link
                        href={`/professor/class-registry/${enrollment._id}`}
                      >
                        View Registry
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
