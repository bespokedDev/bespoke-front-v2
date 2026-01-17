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
  CheckCircle2,
  X,
  Target,
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
import { ObjectivesTable } from "@/app/professor/class-registry/[enrollmentId]/ObjectivesTable";
import { EnrollmentInfoCard } from "@/app/professor/class-registry/[enrollmentId]/components/Sections/EnrollmentInfoCard";
import { useStudentEnrollmentData } from "./hooks/useStudentEnrollmentData";
import type {
  ClassRegistry,
  EvaluationWithClassDate,
  ClassObjective,
} from "@/app/professor/class-registry/[enrollmentId]/types";

export default function StudentClassRegistryPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const { user } = useAuth();
  const isStudent = user?.role?.toLowerCase() === "student";

  // Estado local para el tab activo
  const [activeTab, setActiveTab] = useState("classes");
  // Estado para el modo de período (current period o all history)
  const [periodMode, setPeriodMode] = useState<"current" | "all">("current");

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
  const [objectives, setObjectives] = useState<ClassObjective[]>([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);

  // Función para extraer evaluations de los registros
  const extractEvaluations = useCallback((registries: ClassRegistry[]) => {
    const allEvaluations: EvaluationWithClassDate[] = [];
    registries.forEach((registry: ClassRegistry) => {
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
  }, []);

  // Fetch class registries del período actual usando el endpoint /range
  const fetchCurrentPeriodClasses = useCallback(async () => {
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
      extractEvaluations(sortedRegistries);
    } catch (err: unknown) {
      console.error("Error fetching current period classes:", err);
    } finally {
      setIsLoadingRegistries(false);
    }
  }, [enrollmentId, enrollment, extractEvaluations]);

  // Fetch todas las clases (historial completo)
  const fetchAllClasses = useCallback(async () => {
    try {
      setIsLoadingRegistries(true);
      const response = await apiClient(
        `api/class-registry?enrollmentId=${enrollmentId}`
      );
      console.log("response all class registries", response);
      const registries = response.classes || [];
      
      // Ordenar de la más vieja a la más nueva (ascendente por fecha)
      const sortedRegistries = [...registries].sort((a, b) => {
        const dateA = new Date(a.classDate).getTime();
        const dateB = new Date(b.classDate).getTime();
        return dateA - dateB;
      });
      
      setClassRegistries(sortedRegistries);
      extractEvaluations(sortedRegistries);
    } catch (err: unknown) {
      console.error("Error fetching all classes:", err);
    } finally {
      setIsLoadingRegistries(false);
    }
  }, [enrollmentId, extractEvaluations]);

  // Fetch objectives
  const fetchObjectives = useCallback(async () => {
    if (!enrollmentId) return;

    try {
      setIsLoadingObjectives(true);
      const response = await apiClient(
        `api/class-objectives?enrollmentId=${enrollmentId}`
      );
      console.log("response objectives", response);
      const objectivesData = response.objectives || [];
      setObjectives(objectivesData);
    } catch (err: unknown) {
      console.error("Error fetching objectives:", err);
    } finally {
      setIsLoadingObjectives(false);
    }
  }, [enrollmentId]);

  // Load class registries when enrollment data is loaded or period mode changes
  useEffect(() => {
    if (!isLoadingEnrollment && enrollment) {
      fetchObjectives();
      if (periodMode === "current") {
        fetchCurrentPeriodClasses();
      } else if (periodMode === "all") {
        fetchAllClasses();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingEnrollment, enrollment, periodMode]);

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
      id: "classTime",
      header: "Class Time",
      cell: ({ row }) => {
        const registry = row.original;
        return (
          <span className="text-sm font-medium">
            {registry.classTime || "—"}
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

  // Columnas de Objetivos (read-only para estudiantes)
  const objectiveColumns: ColumnDef<ClassObjective>[] = useMemo(() => [
    {
      id: "objective",
      header: "Objective",
      size: 200,
      maxSize: 200,
      cell: ({ row }) => {
        const objective = row.original;
        return (
          <div
            className="text-sm max-w-[200px] break-words [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ul]:ml-4 [&_ol]:my-1 [&_ol]:ml-4 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: objective.objective || "-" }}
          />
        );
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        return <span className="text-sm">{row.original.category.name}</span>;
      },
    },
    {
      id: "teachersNote",
      header: "Teacher's Note",
      size: 200,
      maxSize: 200,
      cell: ({ row }) => {
        const objective = row.original;
        return (
          <div
            className="text-sm max-w-[200px] break-words [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ul]:ml-4 [&_ol]:my-1 [&_ol]:ml-4 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: objective.teachersNote || "-" }}
          />
        );
      },
    },
    {
      id: "objectiveDate",
      header: "Objective Date",
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {formatDateForDisplay(row.original.objectiveDate)}
          </span>
        );
      },
    },
    {
      id: "achieved",
      header: "Achieved",
      cell: ({ row }) => {
        const objective = row.original;
        return (
          <div className="flex items-center justify-left">
            {objective.objectiveAchieved ? (
              <CheckCircle2 className="h-5 w-5 text-secondary ml-4" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground ml-4" />
            )}
          </div>
        );
      },
    },
  ], []);

  // Agrupar reschedules para el historial (similar a ClassesHistorySection)
  const sortedAndGroupedRegistries = useMemo(() => {
    // Separar clases originales y reschedules
    const originalClasses: ClassRegistry[] = [];
    const reschedules: ClassRegistry[] = [];

    classRegistries.forEach((registry) => {
      if (registry.originalClassId !== null && registry.originalClassId !== undefined) {
        reschedules.push(registry);
      } else {
        originalClasses.push(registry);
      }
    });

    // Ordenar clases originales del más nuevo al más viejo
    originalClasses.sort((a, b) => {
      const dateA = new Date(a.classDate).getTime();
      const dateB = new Date(b.classDate).getTime();
      return dateB - dateA;
    });

    // Crear un mapa para acceso rápido a reschedules por clase original
    const reschedulesByOriginal = new Map<string, ClassRegistry[]>();
    reschedules.forEach((reschedule) => {
      const originalId = reschedule.originalClassId?._id || "";
      if (originalId && !reschedulesByOriginal.has(originalId)) {
        reschedulesByOriginal.set(originalId, []);
      }
      if (originalId) {
        reschedulesByOriginal.get(originalId)!.push(reschedule);
      }
    });

    // Ordenar reschedules dentro de cada grupo del más nuevo al más viejo
    reschedulesByOriginal.forEach((rescheduleList) => {
      rescheduleList.sort((a, b) => {
        const dateA = new Date(a.classDate).getTime();
        const dateB = new Date(b.classDate).getTime();
        return dateB - dateA;
      });
    });

    // Construir resultado: clase original seguida de sus reschedules
    const result: ClassRegistry[] = [];
    originalClasses.forEach((originalClass) => {
      result.push(originalClass);
      const rescheduleList = reschedulesByOriginal.get(originalClass._id) || [];
      result.push(...rescheduleList);
    });

    return result;
  }, [classRegistries]);

  // Crear columnas con tabulación para reschedules en el historial
  const historyColumns: ColumnDef<ClassRegistry>[] = useMemo(() => {
    return registryColumns.map((column) => {
      const originalCell = column.cell;
      const isClassDateColumn = 
        ("accessorKey" in column && column.accessorKey === "classDate") ||
        ("id" in column && column.id === "classDate");
      
      return {
        ...column,
        cell: (context) => {
          const registry = context.row.original;
          const isReschedule = !!registry.originalClassId;
          
          if (isClassDateColumn) {
            return (
              <div className={`flex items-center ${isReschedule ? "pl-8" : ""}`}>
                {isReschedule && (
                  <span className="text-muted-foreground mr-2">↳</span>
                )}
                <span className="text-sm font-medium">
                  {formatDateForDisplay(registry.classDate)}
                </span>
              </div>
            );
          }
          
          if (originalCell && typeof originalCell === "function") {
            const cellContent = originalCell(context);
            return (
              <div className={isReschedule ? "pl-8" : ""}>
                {cellContent}
              </div>
            );
          }
          
          return <div className={isReschedule ? "pl-8" : ""}></div>;
        },
      };
    });
  }, [registryColumns]);

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


  // Solo mostrar loader completo durante la carga inicial del enrollment
  if (isLoadingEnrollment) {
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

        {/* Objectives Section - Right Side - Read Only */}
        <div className="md:col-span-2 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Class Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingObjectives ? (
                <p className="text-muted-foreground text-sm">
                  Loading objectives...
                </p>
              ) : (() => {
                // Filtrar objetivos que no están logrados (objectiveAchieved === false)
                const unachievedObjectives = objectives.filter((obj) => !obj.objectiveAchieved);
                return unachievedObjectives.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">
                    No unachieved objectives found.
                  </p>
                ) : (
                  <ObjectivesTable
                    columns={objectiveColumns}
                    data={unachievedObjectives}
                  />
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Period Mode Tabs - Outside Card */}
      <Tabs
        value={periodMode}
        onValueChange={(value) =>
          setPeriodMode(value as "current" | "all")
        }
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="all">Classes History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Registries</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="classes">Classes</TabsTrigger>
                  <TabsTrigger value="objectives">Objectives</TabsTrigger>
                  <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
                </TabsList>
                <TabsContent value="classes" className="space-y-4">
                  {isLoadingRegistries ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : classRegistries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No class registries found for the current period.
                    </p>
                  ) : (
                    <RegistriesTable
                      columns={registryColumns}
                      data={classRegistries}
                    />
                  )}
                </TabsContent>
                <TabsContent value="objectives" className="space-y-4">
                  {isLoadingObjectives ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : objectives.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No objectives for this enrollment.
                    </p>
                  ) : (
                    <ObjectivesTable
                      columns={objectiveColumns}
                      data={objectives}
                      enablePagination={true}
                    />
                  )}
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
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Classes History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRegistries ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sortedAndGroupedRegistries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No class registries found.
                </p>
              ) : (
                <RegistriesTable
                  columns={historyColumns}
                  data={sortedAndGroupedRegistries}
                  enablePagination={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

