"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Loader2,
  AlertCircle,
  X,
  ArrowUpDown,
  BookOpen,
  Eye,
  ClipboardList,
  ExternalLink,
  User,
  Globe,
  Clock,
  UserCheck,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/lib/dateUtils";

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
  enrollmentType: string;
  alias?: string | null;
  language: string;
  startDate: string;
  endDate: string;
  status: number;
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
  message: string;
  professor: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: Enrollment[];
  total: number;
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

export default function ProfessorClassRegistryPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [substituteEnrollments, setSubstituteEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const handleNavigateToFullDetails = (enrollmentId: string) => {
    setIsQuickViewOpen(false);
    router.push(`/enrollments/${enrollmentId}`);
  };

  const handleNavigateToClassRegistry = (enrollmentId: string) => {
    setIsQuickViewOpen(false);
    router.push(`/professor/class-registry/${enrollmentId}`);
  };

  const fetchEnrollments = async () => {
    if (!user?.id) {
      setError("User ID not found. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch enrollments regulares y sustitutos en paralelo
      const [regularResponse, substituteResponse] = await Promise.all([
        apiClient(`api/professors/${user.id}/enrollments`).catch(() => ({ enrollments: [] })) as Promise<ProfessorEnrollmentsResponse>,
        apiClient(`api/professors/${user.id}/substitute-enrollments`).catch(() => ({ enrollments: [] })) as Promise<SubstituteEnrollmentsResponse>,
      ]);
      
      console.log("response: ", regularResponse);
      console.log("substitute enrollments response: ", substituteResponse);
      
      setEnrollments(regularResponse.enrollments || []);
      setSubstituteEnrollments(substituteResponse.enrollments || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollments. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Solo hacer fetch si el usuario está autenticado y es profesor
    if (!isAuthLoading && user?.id && user?.role?.toLowerCase() === "professor") {
      fetchEnrollments();
    } else if (!isAuthLoading && (!user || user?.role?.toLowerCase() !== "professor")) {
      setError("You must be logged in as a professor to view enrollments.");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  const stringLocaleSort =
    (locale = "es") =>
    (rowA: { getValue: (columnId: string) => unknown }, rowB: { getValue: (columnId: string) => unknown }, columnId: string): number => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  // Combinar enrollments regulares y sustitutos para mostrar
  const allEnrollments = [...enrollments, ...substituteEnrollments];

  const columns: ColumnDef<Enrollment>[] = [
    {
      id: "students",
      accessorFn: (row) => {
        // Función para extraer los nombres de estudiantes como string para búsqueda
        return row.studentIds.map((s) => s.studentId.name).join(" ");
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Students
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const studentNames = row.original.studentIds.map(
          (s) => s.studentId.name
        );
        const isSubstitute = !!row.original.substituteInfo;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              {studentNames.map((name, index) => (
                <span key={index} className="text-sm font-semibold text-foreground">
                  {name}
                  {index < studentNames.length - 1 && (
                    <span className="text-foreground">, </span>
                  )}
                </span>
              ))}
            </div>
            {isSubstitute && (
              <Badge variant="outline" className="text-xs w-fit">
                <UserCheck className="h-3 w-3 mr-1" />
                Substitute
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "plan",
      accessorFn: (row) => {
        // Función para extraer el nombre del plan como string para búsqueda
        return row.planId?.name || "";
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Plan
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const isSubstitute = !!row.original.substituteInfo;
        return (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">{row.original.planId.name}</span>
            {isSubstitute && row.original.substituteInfo && (
              <div className="text-xs text-muted-foreground">
                {row.original.substituteInfo.assignedDate !== "sin fecha asignada" ? (
                  <>
                    Assigned: {formatDateForDisplay(row.original.substituteInfo.assignedDate)}
                  </>
                ) : null}
                {row.original.substituteInfo.expiryDate !== "sin fecha asignada" && (
                  <>
                    {row.original.substituteInfo.assignedDate !== "sin fecha asignada" ? " • " : ""}
                    Expires: {formatDateForDisplay(row.original.substituteInfo.expiryDate)}
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedEnrollment(row.original);
              setIsQuickViewOpen(true);
            }}
            className="text-secondary border-secondary/50 hover:bg-secondary/10"
          >
            <Eye className="h-4 w-4 mr-2" />
            Quick View
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-primary border-primary/50 hover:bg-primary/10"
          >
            <Link href={`/enrollments/${row.original._id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Full Details
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-primary border-primary/50 hover:bg-primary/10"
          >
            <Link href={`/professor/class-registry/${row.original._id}`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Class Registry
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        subtitle="View and manage your enrollments"
      />

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={allEnrollments}
              searchKeys={["students", "plan"]}
              searchPlaceholder="Search by student name or plan..."
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && allEnrollments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No enrollments found. You don&apos;t have any active enrollments assigned.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick View Dialog */}
      <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEnrollment?.alias || selectedEnrollment?.planId.name}
            </DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-6">
              {/* Badge de sustituto si aplica */}
              {selectedEnrollment.substituteInfo && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Substitute Enrollment
                  </Badge>
                </div>
              )}

              {/* Students */}
              <div>
                <Label className="font-semibold text-base mb-2 block">
                  Students
                </Label>
                <div className="space-y-2">
                  {selectedEnrollment.studentIds.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {student.studentId.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({student.studentId.studentCode})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de suplencia si aplica */}
              {selectedEnrollment.substituteInfo && (
                <div>
                  <Label className="font-semibold text-base mb-2 block">
                    Substitute Information
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEnrollment.professor && (
                      <div>
                        <Label className="text-sm text-muted-foreground font-semibold">
                          Main Professor
                        </Label>
                        <p className="text-sm mt-1">{selectedEnrollment.professor.name}</p>
                        {selectedEnrollment.professor.email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedEnrollment.professor.email}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedEnrollment.substituteInfo.assignedDate !== "sin fecha asignada" && (
                      <div>
                        <Label className="text-sm text-muted-foreground font-semibold">
                          Assigned Date
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">
                            {formatDateForDisplay(selectedEnrollment.substituteInfo.assignedDate)}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedEnrollment.substituteInfo.expiryDate !== "sin fecha asignada" && (
                      <div>
                        <Label className="text-sm text-muted-foreground font-semibold">
                          Expiry Date
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">
                            {formatDateForDisplay(selectedEnrollment.substituteInfo.expiryDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enrollment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    Language
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedEnrollment.language}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    Plan
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedEnrollment.planId.name}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    Enrollment Type
                  </Label>
                  <p className="text-sm mt-1 capitalize">
                    {selectedEnrollment.enrollmentType}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    Status
                  </Label>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                      selectedEnrollment.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : selectedEnrollment.status === 2
                        ? "bg-accent-1/20 text-accent-1"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedEnrollment.status === 1
                      ? "Active"
                      : selectedEnrollment.status === 2
                      ? "Inactive"
                      : "Other"}
                  </span>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    Start Date
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {formatDateForDisplay(selectedEnrollment.startDate)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">
                    End Date
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {formatDateForDisplay(selectedEnrollment.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleNavigateToFullDetails(selectedEnrollment._id)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleNavigateToClassRegistry(selectedEnrollment._id)}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Class Registry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

