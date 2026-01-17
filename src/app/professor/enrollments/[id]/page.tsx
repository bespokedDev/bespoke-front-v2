"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  User,
  BookOpen,
  Users,
  Globe,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface PlanDetail {
  _id: string;
  name: string;
  weeklyClasses: number;
  weeks?: number;
  planType: number;
}

interface StudentDetail {
  _id: string;
  studentId: {
    _id: string;
    studentCode: string;
    name: string;
    email: string;
  };
  preferences?: string;
  firstTimeLearningLanguage?: string;
  previousExperience?: string;
  goals?: string;
  dailyLearningTime?: string;
  learningType?: string;
  idealClassType?: string;
  learningDifficulties?: string;
  languageLevel?: string;
}

interface ScheduledDay {
  _id: string;
  day: string;
}

interface EnrollmentDetail {
  _id: string;
  planId: PlanDetail;
  studentIds: StudentDetail[];
  professorId: string;
  enrollmentType: string;
  classCalculationType: number;
  alias?: string | null;
  language: string;
  scheduledDays: ScheduledDay[];
  purchaseDate: string;
  startDate: string;
  endDate: string;
  monthlyClasses: number;
  disolve_reason?: string | null;
  substituteProfessor?: {
    professorId: string;
    status: number;
    assignedDate: string;
    expiryDate: string;
  } | null;
  cancellationPaymentsEnabled: boolean;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface EnrollmentDetailResponse {
  message: string;
  professor: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: EnrollmentDetail[];
  total: number;
}

interface EnrollmentStatistics {
  totalClasses: number;
  rescheduleTime: {
    totalAvailableMinutes: number;
    totalAvailableHours: number;
    details: Array<{
      classRegistryId: string;
      classDate: string;
      classTime: string | null;
      minutesClassDefault: number;
      minutesViewed: number;
      availableMinutes: number;
      availableHours: string;
    }>;
  };
  rescheduleClasses: {
    total: number;
    details: Array<{
      classRegistryId: string;
  classDate: string;
      classTime: string | null;
  reschedule: number;
    }>;
  };
  viewedClasses: {
    total: number;
    details: Array<{
      classRegistryId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  pendingClasses: {
    total: number;
    details: Array<{
      classRegistryId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  noShowClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  lostClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      classDate: string;
      classTime: string | null;
      enrollmentEndDate: string;
    }>;
  };
}

interface EnrollmentWithStatistics {
  enrollment: EnrollmentDetail;
  classes: unknown[];
  statistics: EnrollmentStatistics;
}

export default function EnrollmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.id as string;

  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [statistics, setStatistics] = useState<EnrollmentStatistics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollmentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  const fetchEnrollmentDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Primero obtener el enrollment básico para tener los studentIds
      const response: EnrollmentDetailResponse = await apiClient(
        `api/enrollments/${enrollmentId}/detail`
      );

      if (!response.enrollments || response.enrollments.length === 0) {
        setError("Enrollment not found");
        return;
      }

      const enrollmentData = response.enrollments[0];
      setEnrollment(enrollmentData);

      // Obtener estadísticas detalladas usando el nuevo endpoint
      // Usamos el primer estudiante del enrollment
      if (enrollmentData.studentIds && enrollmentData.studentIds.length > 0) {
        const firstStudentId = enrollmentData.studentIds[0].studentId._id;

        try {
          const enrollmentWithStats: EnrollmentWithStatistics = await apiClient(
            `api/students/${firstStudentId}/enrollment/${enrollmentId}`
        );
          console.log("enrollmentWithStats", enrollmentWithStats);
          if (enrollmentWithStats.statistics) {
            setStatistics(enrollmentWithStats.statistics);
        }
        } catch (statsErr) {
          console.warn("Could not fetch enrollment statistics:", statsErr);
          // Continuar sin estadísticas si falla
        }
      }
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollment details. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return null;
  }

  const enrollmentTypeLabels: Record<string, string> = {
    single: "Individual",
    couple: "Pareja",
    group: "Grupo",
  };

  const statusLabels: Record<number, string> = {
    1: "Active",
    2: "Inactive",
    0: "Disolved",
  };

  const planTypeLabels: Record<number, string> = {
    1: "Monthly",
    2: "Weekly",
  };

  // Usar estadísticas del endpoint si están disponibles
  const stats = statistics
    ? {
        viewed: statistics.viewedClasses.total,
        pending: statistics.pendingClasses.total,
        reschedules: statistics.rescheduleClasses.total,
        noShows: statistics.noShowClasses?.total || 0,
        total: statistics.totalClasses,
        rescheduleTime: {
          hours: statistics.rescheduleTime.totalAvailableHours,
          minutes: statistics.rescheduleTime.totalAvailableMinutes,
        },
      }
    : {
        viewed: 0,
        pending: 0,
        reschedules: 0,
        noShows: 0,
        total: 0,
        rescheduleTime: {
          hours: 0,
          minutes: 0,
        },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          className="mr-8"
          onClick={() => router.back()}
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={
            enrollment.alias ||
            enrollment.studentIds.map((s) => s.studentId.name).join(", ") ||
            "Enrollment"
          }
          subtitle="Enrollment Details"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Class Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Classes Viewed
                  </Label>
                  <p className="text-2xl font-bold text-secondary">
                    {stats.viewed}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Classes Pending
                  </Label>
                  <p className="text-2xl font-bold text-accent-2">
                    {stats.pending}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Reschedule hours
                  </Label>
                  <p className="text-2xl font-bold text-primary">
                  {stats.rescheduleTime.hours.toFixed(2)}h
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    No Shows
                  </Label>
                  <p className="text-2xl font-bold text-accent-1">
                    {stats.noShows}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Total Classes
                  </Label>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estudiantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({enrollment.studentIds.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {enrollment.studentIds.map((studentInfo, index) => (
                <div
                  key={studentInfo._id}
                  className={`flex items-start justify-between py-4 ${
                    index < enrollment.studentIds.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-lg">
                        {studentInfo.studentId.name}
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-muted-foreground">
                          Student Code
                        </Label>
                        <p>{studentInfo.studentId.studentCode}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Email
                        </Label>
                        <p>{studentInfo.studentId.email}</p>
                      </div>
                      {studentInfo.languageLevel && (
                        <div>
                          <Label className="text-muted-foreground">
                            Language Level
                          </Label>
                          <p>{studentInfo.languageLevel}</p>
                        </div>
                      )}
                      {studentInfo.learningType && (
                        <div>
                          <Label className="text-muted-foreground">
                            Learning Type
                          </Label>
                          <p>{studentInfo.learningType}</p>
                        </div>
                      )}
                      {studentInfo.goals && (
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">
                            Goals
                          </Label>
                          <p>{studentInfo.goals}</p>
                        </div>
                      )}
                      {studentInfo.preferences && (
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">
                            Preferences
                          </Label>
                          <p>{studentInfo.preferences}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="ml-4"
                  >
                    <Link href={`/students/${studentInfo.studentId._id}`}>
                      <User className="h-4 w-4 mr-2" />
                      View Student
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Plan & Schedule Information - Combined */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Plan & Schedule Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Information */}
                <div>
                  <Label className="text-muted-foreground">Plan Name</Label>
                  <p className="font-medium">{enrollment.planId.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan Type</Label>
                  <p className="font-medium">
                    {planTypeLabels[enrollment.planId.planType] || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Weekly Classes
                  </Label>
                  <p className="font-medium">
                    {enrollment.planId.weeklyClasses}
                  </p>
                </div>
                {enrollment.planId.weeks && (
                  <div>
                    <Label className="text-muted-foreground">Weeks</Label>
                    <p className="font-medium">{enrollment.planId.weeks}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">
                    Enrollment Type
                  </Label>
                  <p className="font-medium">
                    {enrollmentTypeLabels[enrollment.enrollmentType] ||
                      enrollment.enrollmentType}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">
                    {statusLabels[enrollment.status] || "Unknown"}
                  </p>
                </div>
                {/* Schedule Information */}
                <div>
                  <Label className="text-muted-foreground">Language</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {enrollment.language}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Scheduled Days
                  </Label>
                  <p className="font-medium">
                    {enrollment.scheduledDays.map((day) => day.day).join(", ")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {formatDateForDisplay(enrollment.startDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {formatDateForDisplay(enrollment.endDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Total Classes
                  </Label>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {enrollment.monthlyClasses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar con Acciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="default" className="w-full" asChild>
                <Link href={`/professor/class-registry/${enrollmentId}`}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View Class Registry
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
