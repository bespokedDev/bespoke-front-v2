"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDateForDisplay, extractDatePart } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RegistriesTable } from "@/app/professor/class-registry/[enrollmentId]/RegistriesTable";
import { EnrollmentInfoCard } from "@/app/professor/class-registry/[enrollmentId]/components/Sections/EnrollmentInfoCard";
import { useStudentEnrollmentData } from "./hooks/useStudentEnrollmentData";
import type {
  ClassRegistry,
  EvaluationWithClassDate,
} from "@/app/professor/class-registry/[enrollmentId]/types";

export default function StudentClassRegistryPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const { user } = useAuth();
  const isStudent = user?.role?.toLowerCase() === "student";

  // Estado local para el tab activo
  const [activeTab, setActiveTab] = useState("classes");

  // Custom hooks
  const {
    enrollment,
    isLoading: isLoadingEnrollment,
    error,
  } = useStudentEnrollmentData(enrollmentId);

  // Estado para class registries
  const [classRegistries, setClassRegistries] = useState<ClassRegistry[]>([]);
  const [isLoadingRegistries, setIsLoadingRegistries] = useState(true);
  const [evaluations, setEvaluations] = useState<EvaluationWithClassDate[]>([]);
  const [isLoadingEvaluations] = useState(false);

  // Fetch class registries usando el endpoint /range con las fechas del enrollment
  const fetchClassRegistries = useCallback(async () => {
    if (!enrollment || !enrollment.startDate || !enrollment.endDate) {
      return;
    }

    try {
      setIsLoadingRegistries(true);
      // Extraer solo la fecha (YYYY-MM-DD) de las fechas del enrollment
      const fromDate = extractDatePart(enrollment.startDate);
      const toDate = extractDatePart(enrollment.endDate);

      const response = await apiClient(
        `api/class-registry/range?enrollmentId=${enrollmentId}&from=${fromDate}&to=${toDate}`
      );
      console.log("response class registries range", response);
      const registries = response.classes || [];
      
      // Ordenar de la más vieja a la más nueva (ascendente por fecha)
      const sortedRegistries = [...registries].sort((a, b) => {
        const dateA = new Date(a.classDate).getTime();
        const dateB = new Date(b.classDate).getTime();
        return dateA - dateB;
      });
      
      setClassRegistries(sortedRegistries);

      // Extraer evaluations de los registros
      const allEvaluations: EvaluationWithClassDate[] = [];
      sortedRegistries.forEach((registry: ClassRegistry) => {
        if (registry.evaluations && registry.evaluations.length > 0) {
          registry.evaluations.forEach((evaluation) => {
            allEvaluations.push({
              ...evaluation,
              classDate: registry.classDate,
            });
          });
        }
      });
      setEvaluations(allEvaluations);
    } catch (err: unknown) {
      console.error("Error fetching class registries:", err);
    } finally {
      setIsLoadingRegistries(false);
    }
  }, [enrollmentId, enrollment]);

  // Load class registries when enrollment data is loaded
  useEffect(() => {
    if (!isLoadingEnrollment && enrollment) {
      fetchClassRegistries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingEnrollment, enrollment]);

  // Columnas simplificadas para estudiantes (sin studentMood, note, reschedule status, actions)
  const registryColumns: ColumnDef<ClassRegistry>[] = useMemo(() => [
    {
      id: "classDate",
      header: "Date",
      cell: ({ row }) => {
        const registry = row.original;
        return (
          <span className="text-sm font-medium">
            {formatDateForDisplay(registry.classDate)}
          </span>
        );
      },
    },
    {
      id: "minutesViewed",
      header: "Minutes Viewed",
      cell: ({ row }) => {
        const registry = row.original;
        return (
          <span className="text-sm font-medium">
            {registry.minutesViewed ?? "—"}
          </span>
        );
      },
    },
    {
      id: "classType",
      header: "Class Type",
      cell: ({ row }) => {
        const registry = row.original;
        const classTypeNames = registry.classType.map((t) => t.name).join(", ");
        return (
          <span className="text-sm">
            {classTypeNames || "—"}
          </span>
        );
      },
    },
    {
      id: "contentType",
      header: "Content Type",
      cell: ({ row }) => {
        const registry = row.original;
        const contentTypeNames = registry.contentType.map((t) => t.name).join(", ");
        return (
          <span className="text-sm">
            {contentTypeNames || "—"}
          </span>
        );
      },
    },
    {
      id: "vocabularyContent",
      header: "Class Content",
      cell: ({ row }) => {
        const registry = row.original;
        return (
          <span className="text-sm font-medium">
            {registry.vocabularyContent || "—"}
          </span>
        );
      },
    },
    {
      id: "homework",
      header: "Homework",
      cell: ({ row }) => {
        const registry = row.original;
        return (
          <span className="text-sm font-medium">
            {registry.homework || "—"}
          </span>
        );
      },
    },
  ], []);

  // Columnas de Evaluaciones (read-only para estudiantes)
  const evaluationColumns: ColumnDef<EvaluationWithClassDate>[] = useMemo(() => [
    {
      id: "classDate",
      header: "Class Date",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm">
            {formatDateForDisplay(evaluation.classDate)}
          </span>
        );
      },
    },
    {
      id: "fecha",
      header: "Evaluation Date",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm">
            {evaluation.fecha || "—"}
          </span>
        );
      },
    },
    {
      id: "temasEvaluados",
      header: "Topics Evaluated",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm">
            {evaluation.temasEvaluados || "—"}
          </span>
        );
      },
    },
    {
      id: "skillEvaluada",
      header: "Skill Evaluated",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm">
            {evaluation.skillEvaluada || "—"}
          </span>
        );
      },
    },
    {
      id: "puntuacion",
      header: "Score",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm font-medium">
            {evaluation.puntuacion || "—"}
          </span>
        );
      },
    },
    {
      id: "comentario",
      header: "Comment",
      cell: ({ row }) => {
        const evaluation = row.original;
        return (
          <span className="text-sm">
            {evaluation.comentario || "—"}
          </span>
        );
      },
    },
  ], []);

  // Componente EvaluationsTable
  const EvaluationsTable = ({ evaluations }: {
    evaluations: EvaluationWithClassDate[];
  }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const table = useReactTable({
      data: evaluations,
      columns: evaluationColumns,
      getCoreRowModel: getCoreRowModel(),
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      state: {
        sorting,
      },
      manualPagination: true,
      pageCount: 1,
    });

    return (
      <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={evaluationColumns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };


  if (isLoadingEnrollment || isLoadingRegistries) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => router.push("/student/profile?tab=enrollments")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Enrollment not found"}</span>
        </div>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>You must be logged in as a student to view this page.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/student/profile?tab=enrollments")}
            size="sm"
            className="sm:size-default"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="Class Registry"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Enrollment Card - Left Side - Sticky */}
        <EnrollmentInfoCard enrollment={enrollment} />
      </div>

      {/* Class Registries Table - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Class Registries</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            </TabsList>
            <TabsContent value="classes" className="space-y-4">
              <RegistriesTable
                columns={registryColumns}
                data={classRegistries}
              />
            </TabsContent>
            <TabsContent value="evaluations" className="space-y-4">
              {isLoadingEvaluations ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No evaluations for this enrollment.
                </p>
              ) : (
                <EvaluationsTable
                  evaluations={evaluations}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

