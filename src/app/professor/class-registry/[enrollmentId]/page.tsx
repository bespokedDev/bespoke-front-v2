"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDateForDisplay, extractDatePart } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronsUpDown,
  Pencil,
  Calendar,
  MoreVertical,
  ClipboardList,
  Save,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import type { ClassRegistry, EvaluationWithClassDate } from "./types";
import {
  EditableMinutesViewedField,
  EditableVocabularyContentField,
  EditableStudentMoodField,
  EditableHomeworkField,
  EditableClassTimeField,
} from "./components/EditableFields/EditableRegistryFields";
import { useObjectiveColumns } from "./columns/objectiveColumns";
import { useEvaluationColumns } from "./columns/evaluationColumns";
import { RescheduleDialog } from "./components/Dialogs/RescheduleDialog";
import { NoteDialog } from "./components/Dialogs/NoteDialog";
import { CreateEvaluationDialog } from "./components/Dialogs/CreateEvaluationDialog";
import { EnrollmentInfoCard } from "./components/Sections/EnrollmentInfoCard";
import { ObjectivesSection } from "./components/Sections/ObjectivesSection";
import { ObjectivesHistorySection } from "./components/Sections/ObjectivesHistorySection";
import { ClassRegistriesSection } from "./components/Sections/ClassRegistriesSection";
import { ClassesHistorySection } from "./components/Sections/ClassesHistorySection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEnrollmentData } from "./hooks/useEnrollmentData";
import { useObjectives } from "./hooks/useObjectives";
import { useClassRegistries } from "./hooks/useClassRegistries";
import { useEvaluations } from "./hooks/useEvaluations";

export default function ClassRegistryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const { user } = useAuth();
  const isProfessor = user?.role?.toLowerCase() === "professor";
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // Estado local para el tab activo (necesario para useEvaluations)
  const [activeTab, setActiveTab] = useState("classes");
  // Estado para el modo de período (current period, all history, o objectives history)
  const [periodMode, setPeriodMode] = useState<
    "current" | "all" | "objectives-history"
  >("current");

  // Custom hooks
  const {
    enrollment,
    contentClasses,
    classTypes,
    isLoading: isLoadingEnrollment,
    error,
  } = useEnrollmentData(enrollmentId);

  // Extract dates from enrollment for current period
  const startDate = enrollment?.startDate
    ? extractDatePart(enrollment.startDate)
    : undefined;
  const endDate = enrollment?.endDate
    ? extractDatePart(enrollment.endDate)
    : undefined;

  // Note: We need to initialize classRegistriesHook first, but we'll update the evaluation cache later
  const classRegistriesHook = useClassRegistries(
    enrollmentId,
    periodMode,
    startDate,
    endDate
  );

  const objectivesHook = useObjectives(
    enrollmentId,
    enrollment,
    contentClasses
  );

  const evaluationsHook = useEvaluations(
    enrollmentId,
    activeTab,
    (message) => classRegistriesHook.setRegistrySuccessMessage(message),
    (message) => classRegistriesHook.setRegistryErrorMessage(message),
    classRegistriesHook.fetchClassRegistries
  );

  // Load class registries when enrollment data is loaded or period mode changes
  useEffect(() => {
    if (!isLoadingEnrollment && enrollment) {
      // Only fetch if we have dates for current period, or if mode is "all"
      // Skip fetching if mode is "objectives-history" (only show objectives history)
      if (
        periodMode === "all" ||
        (periodMode === "current" && startDate && endDate)
      ) {
        classRegistriesHook.fetchClassRegistries();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingEnrollment, enrollment, periodMode, startDate, endDate]);

  // Update evaluation cache when class registries are loaded (only update ref to avoid re-renders)
  // This effect is only needed to sync the cache when registries change
  // The cache is primarily updated in fetchClassRegistries, but we also update it here
  // to ensure consistency when registries are updated from other sources
  useEffect(() => {
    if (classRegistriesHook.classRegistries.length > 0) {
      const newCache: Record<string, boolean> = {};
      classRegistriesHook.classRegistries.forEach((registry) => {
        const hasEvaluation = !!(
          registry.evaluations && registry.evaluations.length > 0
        );
        newCache[registry._id] = hasEvaluation;
      });

      // Only update ref, not state, to avoid triggering re-renders
      // The cache is read from the ref in checkClassHasEvaluation
      evaluationsHook.evaluationCacheRef.current = newCache;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRegistriesHook.classRegistries.length]);

  const objectiveColumns = useObjectiveColumns({
    editingObjectiveId: objectivesHook.editingObjectiveId,
    initialEditingData: objectivesHook.initialEditingData,
    editingDataRef: objectivesHook.editingDataRef,
    contentClasses,
    handleUpdateObjective: objectivesHook.handleUpdateObjective,
    savingObjectiveId: objectivesHook.savingObjectiveId,
    setInitialEditingData: objectivesHook.setInitialEditingData,
    setEditingObjectiveId: objectivesHook.setEditingObjectiveId,
  });

  // Columnas de Evaluaciones
  const evaluationColumns = useEvaluationColumns({
    editingEvaluationId: evaluationsHook.editingEvaluationId,
    editingEvaluationDataRef: evaluationsHook.editingEvaluationDataRef,
    handleUpdateEvaluation: evaluationsHook.handleUpdateEvaluation,
    setEditingEvaluationId: evaluationsHook.setEditingEvaluationId,
  });

  // Componente EvaluationsTable
  const EvaluationsTable = ({
    evaluations,
  }: {
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

  // Función helper para sincronizar el ref al estado para un registro específico
  const syncRefToState = useCallback(
    (registryId: string) => {
      const refData =
        classRegistriesHook.editingRegistryDataRef.current[registryId];
      if (refData) {
        classRegistriesHook.setEditingRegistryData((prev) => ({
          ...prev,
          [registryId]: refData,
        }));
      }
    },
    [classRegistriesHook]
  );

  // Guardar un registro individual con validaciones y reglas por rol
  const handleSaveRegistry = useCallback(
    async (registry: ClassRegistry) => {
      const registryId = registry._id;

      // Obtener datos de edición actuales (ref > estado > valor original)
      const editDataRef =
        classRegistriesHook.editingRegistryDataRef.current[registryId];
      const editDataState = classRegistriesHook.editingRegistryData[registryId];

      const isReschedule =
        registry.originalClassId !== null &&
        registry.originalClassId !== undefined;

      const base = editDataRef ||
        editDataState || {
          minutesViewed: registry.minutesViewed?.toString() || "",
          classType: registry.classType.map((t) => t._id),
          contentType: registry.contentType.map((t) => t._id),
          vocabularyContent: registry.vocabularyContent || "",
          studentMood: registry.studentMood || "",
          note: registry.note || null,
          homework: registry.homework || "",
          reschedule: registry.reschedule,
          classTime: registry.classTime || "",
          ...(isReschedule && {
            classDate: extractDatePart(registry.classDate),
          }),
        };

      const minutesNumber =
        base.minutesViewed === "" ? 0 : Number(base.minutesViewed);
      const rescheduleValue = base.reschedule ?? registry.reschedule;

      // Determinar si el classType es "no show"
      const selectedTypeId = base.classType[0];
      const selectedType = classTypes.find((t) => t._id === selectedTypeId);
      const isNoShow =
        selectedType?.name?.toLowerCase().includes("no show") || false;

      // Calcular classViewed automáticamente basado en minutesViewed y classType
      let classViewedValue: number;
      if (minutesNumber === 0 || isNoShow) {
        // No Show: minutesViewed === 0 o classType es "no show"
        classViewedValue = 3;
      } else if (minutesNumber === 60) {
        // Viewed: exactamente 60 minutos
        classViewedValue = 1;
      } else if (minutesNumber > 0 && minutesNumber < 60) {
        // Partially Viewed: entre 0 y 60 minutos
        classViewedValue = 2;
        // Validación: si minutos < 60 y no hay reschedule
        if (rescheduleValue === 0) {
          window.alert(
            "This class has less than 60 minutes and no reschedule. Please create a reschedule before saving."
          );
          return;
        }
      } else {
        // Fallback: si minutesViewed > 60, consideramos como Viewed
        classViewedValue = 1;
      }

      // Confirmación para profesores: después de guardar no podrá editar (porque classViewed será diferente de 0)
      // Nota: classViewed: 4 (Class Lost) solo puede ser asignado por cronjob, no manualmente
      if (isProfessor && classViewedValue !== 0 && classViewedValue !== 4) {
        const confirmed = window.confirm(
          "After saving this class registry, you will not be able to edit it again because the class will be marked as viewed. Do you want to continue?"
        );
        if (!confirmed) {
          return;
        }
      }

      try {
        const updatePayload: {
          minutesViewed: number | null;
          classType: string[];
          contentType: string[];
          vocabularyContent: string | null;
          studentMood: string | null;
          note: {
            content: string | null;
            visible: {
              admin: number;
              student: number;
              professor: number;
            };
          } | null;
          homework: string | null;
          classTime: string | null;
          classViewed: number;
          classDate?: string;
        } = {
          minutesViewed:
            base.minutesViewed === "" ? null : Number(base.minutesViewed),
          classType: base.classType,
          contentType: base.contentType,
          vocabularyContent: base.vocabularyContent || null,
          studentMood: base.studentMood || null,
          note: base.note,
          homework: base.homework || null,
          classTime: base.classTime || null,
          classViewed: classViewedValue,
        };

        // Incluir classDate si es un reschedule y existe en el ref
        if (isReschedule && base.classDate) {
          updatePayload.classDate = base.classDate;
        }

        await classRegistriesHook.handleUpdateRegistry(
          registryId,
          updatePayload
        );

        // Si es un reschedule, mostrar alerta recordando guardar la clase original
        if (isReschedule && registry.originalClassId) {
          const originalDate = formatDateForDisplay(
            registry.originalClassId.classDate
          );
          window.alert(
            `Reschedule saved successfully. Remember to save the information for the original class dated ${originalDate}.`
          );
        }

        // Después de guardar exitosamente, los datos ya se refrescaron desde el servidor
        // El useEffect en useClassRegistries reinicializará editingRegistryData con los valores actualizados
        // incluyendo el nuevo classViewed, lo que hará que los campos dejen de ser editables
      } catch {
        // El propio hook ya maneja y muestra el error apropiado
      }
    },
    [classRegistriesHook, isProfessor, classTypes]
  );

  const registryColumns: ColumnDef<ClassRegistry>[] = useMemo(
    () => [
      {
        accessorKey: "classDate",
        header: "Class Date",
        cell: ({ row }) => {
          const registry = row.original;
          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;

          if (isReschedule) {
            // Para reschedules, hacer la fecha editable
            const editData =
              classRegistriesHook.editingRegistryData[registry._id];
            const isLocked =
              isProfessor &&
              registry.classViewed !== 0 &&
              registry.classViewed !== null &&
              registry.classViewed !== undefined;

            if (isLocked) {
              return (
                <span className="text-sm font-medium">
                  {formatDateForDisplay(registry.classDate)}
                </span>
              );
            }

            const dateValue =
              editData?.classDate ?? extractDatePart(registry.classDate);

            // Inicializar el ref si no existe
            if (
              !classRegistriesHook.editingRegistryDataRef.current[registry._id]
            ) {
              classRegistriesHook.editingRegistryDataRef.current[registry._id] =
                {
                  minutesViewed: registry.minutesViewed?.toString() || "",
                  classType: registry.classType.map((t) => t._id),
                  contentType: registry.contentType.map((t) => t._id),
                  vocabularyContent: registry.vocabularyContent || "",
                  studentMood: registry.studentMood || "",
                  note: registry.note || null,
                  homework: registry.homework || "",
                  reschedule: registry.reschedule,
                  classViewed: registry.classViewed,
                  classDate: extractDatePart(registry.classDate),
                  classTime: registry.classTime || "",
                };
            }

            return (
              <Input
                type="date"
                max="9999-12-31"
                value={dateValue}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (
                    classRegistriesHook.editingRegistryDataRef.current[
                      registry._id
                    ]
                  ) {
                    classRegistriesHook.editingRegistryDataRef.current[
                      registry._id
                    ].classDate = newDate;
                  }
                  // Actualizar el estado para reflejar el cambio
                  classRegistriesHook.setEditingRegistryData((prev) => ({
                    ...prev,
                    [registry._id]: {
                      ...(prev[registry._id] || {
                        minutesViewed: registry.minutesViewed?.toString() || "",
                        classType: registry.classType.map((t) => t._id),
                        contentType: registry.contentType.map((t) => t._id),
                        vocabularyContent: registry.vocabularyContent || "",
                        studentMood: registry.studentMood || "",
                        note: registry.note || null,
                        homework: registry.homework || "",
                        reschedule: registry.reschedule,
                        classViewed: registry.classViewed,
                        classDate: extractDatePart(registry.classDate),
                      }),
                      classDate: newDate,
                    },
                  }));
                }}
                className={`w-auto min-w-[140px] border-0 border-b border-input focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none ${
                  isReschedule ? "bg-white" : "bg-transparent"
                }`}
              />
            );
          }

          // Para clases normales, mostrar solo texto
          return (
            <span className="text-sm font-medium">
              {formatDateForDisplay(registry.classDate)}
            </span>
          );
        },
      },
      {
        id: "originalDate",
        header: "Original Date",
        cell: ({ row }) => {
          const registry = row.original;
          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;

          if (isReschedule && registry.originalClassId) {
            // El originalClassId contiene directamente la información de la clase original
            return (
              <span className="text-sm text-muted-foreground">
                {formatDateForDisplay(registry.originalClassId.classDate)}
              </span>
            );
          }

          // Para clases normales, no mostrar nada
          return null;
        },
      },
      {
        id: "classTime",
        header: "Class Time",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const initialValue =
            editData?.classTime ?? (registry.classTime || "");

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: initialValue,
            };
          }

          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return (
              <span className="text-sm font-medium">
                {registry.classTime || "—"}
              </span>
            );
          }

          return (
            <EditableClassTimeField
              registryId={registry._id}
              initialValue={initialValue}
              onUpdate={(newValue) => {
                if (
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ]
                ) {
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ].classTime = newValue;
                }
              }}
              isReschedule={isReschedule}
            />
          );
        },
      },
      {
        id: "minutesViewed",
        header: "Minutes Viewed",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const initialValue =
            editData?.minutesViewed ??
            (registry.minutesViewed?.toString() || "");

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: initialValue,
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return (
              <span className="text-sm font-medium">
                {registry.minutesViewed ?? "—"}
              </span>
            );
          }

          return (
            <EditableMinutesViewedField
              registryId={registry._id}
              initialValue={initialValue}
              onUpdate={(newValue) => {
                if (
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ]
                ) {
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ].minutesViewed = newValue;
                }
              }}
              isReschedule={isReschedule}
            />
          );
        },
      },
      {
        id: "classType",
        header: "Class Type",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const selectedIds =
            editData?.classType ??
            classRegistriesHook.editingRegistryDataRef.current[registry._id]
              ?.classType ??
            registry.classType.map((t) => t._id);
          const popoverKey = `classType-${registry._id}`;
          const open =
            classRegistriesHook.openPopovers[popoverKey]?.classType || false;

          // Obtener el nombre del tipo seleccionado (solo uno)
          const selectedTypeId = selectedIds[0];
          const selectedName =
            classTypes.find((t) => t._id === selectedTypeId)?.name || "";

          const displayText = selectedName || "Select...";
          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return <span className="text-sm font-medium">{displayText}</span>;
          }

          return (
            <Popover
              open={open}
              onOpenChange={(isOpen) => {
                classRegistriesHook.setOpenPopovers(
                  (
                    prev: Record<
                      string,
                      { classType: boolean; contentType: boolean }
                    >
                  ) => ({
                    ...prev,
                    [popoverKey]: {
                      ...(prev[popoverKey] || {
                        classType: false,
                        contentType: false,
                      }),
                      classType: isOpen,
                    },
                  })
                );
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={`w-full justify-between ${
                    isReschedule ? "bg-white" : ""
                  }`}
                >
                  <span className="truncate text-left flex-1">
                    {displayText}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search class types..." />
                  <CommandEmpty>No class type found.</CommandEmpty>
                  <CommandGroup>
                    {classTypes.map((type) => (
                      <CommandItem
                        key={type._id}
                        value={type._id}
                        onSelect={() => {
                          // Solo un tipo seleccionado a la vez
                          const newSelectedIds = [type._id];

                          // Inicializar el ref si no existe
                          if (
                            !classRegistriesHook.editingRegistryDataRef.current[
                              registry._id
                            ]
                          ) {
                            classRegistriesHook.editingRegistryDataRef.current[
                              registry._id
                            ] = {
                              minutesViewed:
                                registry.minutesViewed?.toString() || "",
                              classType: registry.classType.map((t) => t._id),
                              contentType: registry.contentType.map(
                                (t) => t._id
                              ),
                              vocabularyContent:
                                registry.vocabularyContent || "",
                              studentMood: registry.studentMood || "",
                              note: registry.note || null,
                              homework: registry.homework || "",
                              reschedule: registry.reschedule,
                              classViewed: registry.classViewed,
                              classTime: registry.classTime || "",
                            };
                          }

                          // Actualizar el ref
                          classRegistriesHook.editingRegistryDataRef.current[
                            registry._id
                          ].classType = newSelectedIds;

                          // Actualizar el estado para que se refleje en el UI (solo para mostrar)
                          classRegistriesHook.setEditingRegistryData(
                            (prev) => ({
                              ...prev,
                              [registry._id]: {
                                ...(prev[registry._id] || {
                                  minutesViewed:
                                    registry.minutesViewed?.toString() || "",
                                  classType: registry.classType.map(
                                    (t) => t._id
                                  ),
                                  contentType: registry.contentType.map(
                                    (t) => t._id
                                  ),
                                  vocabularyContent:
                                    registry.vocabularyContent || "",
                                  studentMood: registry.studentMood || "",
                                  note: registry.note || null,
                                  homework: registry.homework || "",
                                  reschedule: registry.reschedule,
                                  classViewed: registry.classViewed,
                                }),
                                classType: newSelectedIds,
                              },
                            })
                          );

                          // Cerrar el popover después de seleccionar
                          classRegistriesHook.setOpenPopovers(
                            (
                              prev: Record<
                                string,
                                { classType: boolean; contentType: boolean }
                              >
                            ) => ({
                              ...prev,
                              [popoverKey]: {
                                ...(prev[popoverKey] || {
                                  classType: false,
                                  contentType: false,
                                }),
                                classType: false,
                              },
                            })
                          );
                        }}
                      >
                        <CheckCircle2
                          className={`mr-2 h-4 w-4 ${
                            selectedTypeId === type._id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        {type.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        id: "contentType",
        header: "Content Type",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const selectedIds =
            editData?.contentType ??
            classRegistriesHook.editingRegistryDataRef.current[registry._id]
              ?.contentType ??
            registry.contentType.map((t) => t._id);
          const popoverKey = `contentType-${registry._id}`;
          const open =
            classRegistriesHook.openPopovers[popoverKey]?.contentType || false;

          // Obtener los nombres de los tipos seleccionados
          const selectedNames = selectedIds
            .map((id) => contentClasses.find((t) => t._id === id)?.name)
            .filter((name): name is string => name !== undefined);

          const displayText =
            selectedNames.length > 0 ? selectedNames.join(", ") : "Select...";
          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return <span className="text-sm font-medium">{displayText}</span>;
          }

          return (
            <Popover
              open={open}
              onOpenChange={(isOpen) => {
                classRegistriesHook.setOpenPopovers(
                  (
                    prev: Record<
                      string,
                      { classType: boolean; contentType: boolean }
                    >
                  ) => ({
                    ...prev,
                    [popoverKey]: {
                      ...(prev[popoverKey] || {
                        classType: false,
                        contentType: false,
                      }),
                      contentType: isOpen,
                    },
                  })
                );
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={`w-full justify-between max-w-[300px] min-h-[2.5rem] h-auto py-2 ${
                    isReschedule ? "bg-white" : ""
                  }`}
                >
                  <span className="text-left flex-1 break-words whitespace-normal leading-relaxed pr-2">
                    {displayText}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 self-start mt-0.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search content types..." />
                  <CommandEmpty>No content type found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {contentClasses.map((type) => (
                      <CommandItem
                        key={type._id}
                        value={type._id}
                        onSelect={() => {
                          const newSelectedIds = selectedIds.includes(type._id)
                            ? selectedIds.filter(
                                (id: string) => id !== type._id
                              )
                            : [...selectedIds, type._id];

                          // Inicializar el ref si no existe
                          if (
                            !classRegistriesHook.editingRegistryDataRef.current[
                              registry._id
                            ]
                          ) {
                            classRegistriesHook.editingRegistryDataRef.current[
                              registry._id
                            ] = {
                              minutesViewed:
                                registry.minutesViewed?.toString() || "",
                              classType: registry.classType.map((t) => t._id),
                              contentType: registry.contentType.map(
                                (t) => t._id
                              ),
                              vocabularyContent:
                                registry.vocabularyContent || "",
                              studentMood: registry.studentMood || "",
                              note: registry.note || null,
                              homework: registry.homework || "",
                              reschedule: registry.reschedule,
                              classViewed: registry.classViewed,
                              classTime: registry.classTime || "",
                            };
                          }

                          // Actualizar el ref
                          classRegistriesHook.editingRegistryDataRef.current[
                            registry._id
                          ].contentType = newSelectedIds;

                          // Actualizar el estado para que se refleje en el UI (solo para mostrar)
                          classRegistriesHook.setEditingRegistryData(
                            (prev) => ({
                              ...prev,
                              [registry._id]: {
                                ...(prev[registry._id] || {
                                  minutesViewed:
                                    registry.minutesViewed?.toString() || "",
                                  classType: registry.classType.map(
                                    (t) => t._id
                                  ),
                                  contentType: registry.contentType.map(
                                    (t) => t._id
                                  ),
                                  vocabularyContent:
                                    registry.vocabularyContent || "",
                                  studentMood: registry.studentMood || "",
                                  note: registry.note || null,
                                  homework: registry.homework || "",
                                  reschedule: registry.reschedule,
                                  classViewed: registry.classViewed,
                                }),
                                contentType: newSelectedIds,
                              },
                            })
                          );
                        }}
                      >
                        <CheckCircle2
                          className={`mr-2 h-4 w-4 ${
                            selectedIds.includes(type._id)
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        {type.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        id: "vocabularyContent",
        header: "Class Content",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const initialValue =
            editData?.vocabularyContent ?? (registry.vocabularyContent || "");

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: initialValue,
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return (
              <div className="text-sm font-medium max-w-[400px] break-words">
                {registry.vocabularyContent || "—"}
              </div>
            );
          }

          return (
            <EditableVocabularyContentField
              registryId={registry._id}
              initialValue={initialValue}
              onUpdate={(newValue) => {
                if (
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ]
                ) {
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ].vocabularyContent = newValue;
                }
              }}
              isReschedule={isReschedule}
            />
          );
        },
      },
      {
        accessorKey: "studentMood",
        header: "Student Mood",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const initialValue =
            editData?.studentMood ?? (registry.studentMood || "");

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: initialValue,
              note: registry.note || null,
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            // Opciones de estado de ánimo para mostrar
            const moodOptions: Record<
              string,
              { emoji: string; label: string }
            > = {
              "😊": { emoji: "😊", label: "Happy" },
              "😐": { emoji: "😐", label: "Neutral" },
              "☹️": { emoji: "☹️", label: "Sad" },
            };
            const currentMood = registry.studentMood
              ? moodOptions[registry.studentMood]
              : null;
            return (
              <span className="text-sm font-medium">
                {currentMood ? (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{currentMood.emoji}</span>
                    <span>{currentMood.label}</span>
                  </span>
                ) : (
                  "—"
                )}
              </span>
            );
          }

          return (
            <EditableStudentMoodField
              registryId={registry._id}
              initialValue={initialValue}
              onUpdate={(newValue) => {
                if (
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ]
                ) {
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ].studentMood = newValue;
                }
              }}
              isReschedule={isReschedule}
            />
          );
        },
      },
      {
        accessorKey: "note",
        header: "Note",
        size: 200,
        maxSize: 200,
        cell: ({ row }) => {
          const registry = row.original;
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          // Leer la nota del estado local primero, luego del registro original
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const noteFromState =
            editData?.note ||
            classRegistriesHook.editingRegistryDataRef.current[registry._id]
              ?.note;
          const noteContent =
            noteFromState?.content || registry.note?.content || "";
          const hasNote = noteContent.trim().length > 0;

          // Crear una versión de texto plano para el tooltip (remover HTML tags)
          const plainText = noteContent.replace(/<[^>]*>/g, "").trim();

          return (
            <div className="flex items-center gap-2 min-w-[150px] md:min-w-[200px] max-w-[400px]">
              {hasNote ? (
                <>
                  <div
                    className="text-sm flex-1 max-w-[400px] break-words [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-0.5 [&_ul]:ml-4 [&_ol]:my-0.5 [&_ol]:ml-4 [&_li]:my-0 [&_strong]:font-semibold [&_em]:italic line-clamp-2"
                    title={plainText}
                    dangerouslySetInnerHTML={{ __html: noteContent }}
                  />
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        syncRefToState(registry._id);
                        const currentNote =
                          classRegistriesHook.editingRegistryData[registry._id]
                            ?.note ||
                          classRegistriesHook.editingRegistryDataRef.current[
                            registry._id
                          ]?.note ||
                          registry.note;
                        classRegistriesHook.setNoteModalData({
                          content: currentNote?.content || "",
                          visible: {
                            admin: true, // Always visible to admin
                            student: (currentNote?.visible?.student || 0) === 1,
                            professor: true, // Always visible to professor
                          },
                        });
                        classRegistriesHook.setEditingNoteRegistryId(
                          registry._id
                        );
                      }}
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                !isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      syncRefToState(registry._id);
                      classRegistriesHook.setNoteModalData({
                        content: "",
                        visible: {
                          admin: true,
                          student: false,
                          professor: true,
                        },
                      });
                      classRegistriesHook.setEditingNoteRegistryId(
                        registry._id
                      );
                    }}
                    className="h-8 text-xs"
                  >
                    + Add Note
                  </Button>
                )
              )}
              {!hasNote && isLocked && (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: "homework",
        header: "Homework",
        cell: ({ row }) => {
          const registry = row.original;
          const editData =
            classRegistriesHook.editingRegistryData[registry._id];
          const initialValue = editData?.homework ?? (registry.homework || "");

          // Inicializar el ref si no existe
          if (
            !classRegistriesHook.editingRegistryDataRef.current[registry._id]
          ) {
            classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              note: registry.note || null,
              homework: initialValue,
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
            };
          }

          const isReschedule =
            registry.originalClassId !== null &&
            registry.originalClassId !== undefined;
          // Bloquear si es profesor y classViewed !== 0 (incluye 1, 2, 3, 4)
          // classViewed: 4 (Class Lost) está siempre bloqueado (asignado por cronjob)
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          if (isLocked) {
            return (
              <span className="text-sm font-medium">
                {registry.homework || "—"}
              </span>
            );
          }

          return (
            <EditableHomeworkField
              registryId={registry._id}
              initialValue={initialValue}
              onUpdate={(newValue) => {
                if (
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ]
                ) {
                  classRegistriesHook.editingRegistryDataRef.current[
                    registry._id
                  ].homework = newValue;
                }
              }}
              isReschedule={isReschedule}
            />
          );
        },
      },
      {
        id: "reschedule",
        header: "Reschedule Status",
        cell: ({ row }) => {
          const registry = row.original;
          const rescheduleValue = registry.reschedule;

          let displayText: string;
          if (rescheduleValue === 0) {
            displayText = "Not made";
          } else if (rescheduleValue === 1) {
            displayText = "In reschedule";
          } else if (rescheduleValue === 2) {
            displayText = "Reschedule viewed";
          } else {
            displayText = "Normal";
          }

          return <span className="text-sm">{displayText}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const registry = row.original;
          const canReschedule = registry.reschedule === 0;
          const hasEvaluationInCache =
            evaluationsHook.evaluationCache[registry._id] ?? false;
          const isMenuOpen =
            evaluationsHook.openMenuRegistryId === registry._id;
          // Un registro está bloqueado si es profesor y classViewed es diferente de 0
          const isLocked =
            isProfessor &&
            registry.classViewed !== 0 &&
            registry.classViewed !== null &&
            registry.classViewed !== undefined;

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  syncRefToState(registry._id);
                  void handleSaveRegistry(registry);
                }}
                disabled={isLocked}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <DropdownMenu
                open={isMenuOpen}
                onOpenChange={async (open) => {
                  evaluationsHook.setOpenMenuRegistryId(
                    open ? registry._id : null
                  );
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canReschedule && (
                    <DropdownMenuItem
                      onClick={() => {
                        syncRefToState(registry._id);
                        classRegistriesHook.setRescheduleRegistryId(
                          registry._id
                        );
                        classRegistriesHook.setRescheduleDate("");
                        evaluationsHook.setOpenMenuRegistryId(null);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Reschedule
                    </DropdownMenuItem>
                  )}
                  {canReschedule && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => {
                      syncRefToState(registry._id);
                      evaluationsHook.setSelectedClassRegistryForEvaluation(
                        registry
                      );
                      evaluationsHook.setEvaluationFormData({
                        fecha: new Date().toISOString().split("T")[0],
                        temasEvaluados: "",
                        skillEvaluada: "",
                        linkMaterial: "",
                        capturePrueba: null,
                        puntuacion: "",
                        comentario: "",
                      });
                      evaluationsHook.setOpenCreateEvaluationDialog(true);
                      evaluationsHook.setOpenMenuRegistryId(null);
                    }}
                    disabled={hasEvaluationInCache}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {hasEvaluationInCache
                      ? "Already has evaluation"
                      : "Create Evaluation"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [
      syncRefToState,
      classRegistriesHook.editingRegistryData,
      classRegistriesHook.openPopovers,
      evaluationsHook.evaluationCache,
      evaluationsHook.openMenuRegistryId,
      classTypes,
      contentClasses,
      isProfessor,
      handleSaveRegistry,
    ]
  );

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
          onClick={() =>
            router.push(
              isAdmin
                ? `/enrollments/${enrollmentId}`
                : "/professor/class-registry"
            )
          }
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Enrollments
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Enrollment not found"}</span>
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
            onClick={() =>
              router.push(
                isAdmin
                  ? `/enrollments/${enrollmentId}`
                  : "/professor/class-registry"
              )
            }
            size="sm"
            className="sm:size-default"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader title="Class Registry" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Enrollment Card - Left Side - Sticky */}
        <EnrollmentInfoCard enrollment={enrollment} />

        {/* Objectives Section - Right Side */}
        <div className="md:col-span-2 lg:col-span-3">
          <ObjectivesSection
            objectives={objectivesHook.objectives}
            columns={objectiveColumns}
            contentClasses={contentClasses}
            objectiveSuccessMessage={objectivesHook.objectiveSuccessMessage}
            objectiveErrorMessage={objectivesHook.objectiveErrorMessage}
            onDismissSuccess={() =>
              objectivesHook.setObjectiveSuccessMessage(null)
            }
            onDismissError={() => objectivesHook.setObjectiveErrorMessage(null)}
            onAddObjective={objectivesHook.addNewObjective}
          />
        </div>
      </div>

      {/* Period Mode Tabs - Outside Card */}
      <Tabs
        value={periodMode}
        onValueChange={(value) =>
          setPeriodMode(value as "current" | "all" | "objectives-history")
        }
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="all">Classes History</TabsTrigger>
          <TabsTrigger value="objectives-history">
            Objectives History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <ClassRegistriesSection
            classRegistries={classRegistriesHook.classRegistries}
            registryColumns={registryColumns}
            evaluations={evaluationsHook.evaluations}
            EvaluationsTable={EvaluationsTable}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            periodMode={periodMode}
            registrySuccessMessage={classRegistriesHook.registrySuccessMessage}
            registryErrorMessage={classRegistriesHook.registryErrorMessage}
            isLoadingEvaluations={evaluationsHook.isLoadingEvaluations}
            onDismissSuccess={() =>
              classRegistriesHook.setRegistrySuccessMessage(null)
            }
            onDismissError={() =>
              classRegistriesHook.setRegistryErrorMessage(null)
            }
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <ClassesHistorySection
            classRegistries={classRegistriesHook.classRegistries}
            registryColumns={registryColumns}
            registrySuccessMessage={classRegistriesHook.registrySuccessMessage}
            registryErrorMessage={classRegistriesHook.registryErrorMessage}
            onDismissSuccess={() =>
              classRegistriesHook.setRegistrySuccessMessage(null)
            }
            onDismissError={() =>
              classRegistriesHook.setRegistryErrorMessage(null)
            }
          />
        </TabsContent>

        <TabsContent value="objectives-history" className="space-y-4">
          <ObjectivesHistorySection
            objectives={objectivesHook.objectives}
            objectiveSuccessMessage={objectivesHook.objectiveSuccessMessage}
            objectiveErrorMessage={objectivesHook.objectiveErrorMessage}
            onDismissSuccess={() =>
              objectivesHook.setObjectiveSuccessMessage(null)
            }
            onDismissError={() => objectivesHook.setObjectiveErrorMessage(null)}
          />
        </TabsContent>
      </Tabs>

      {/* Reschedule Modal */}
      <RescheduleDialog
        open={classRegistriesHook.rescheduleRegistryId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            classRegistriesHook.setRescheduleRegistryId(null);
            classRegistriesHook.setRescheduleDate("");
          }
        }}
        registryId={classRegistriesHook.rescheduleRegistryId}
        rescheduleDate={classRegistriesHook.rescheduleDate}
        onRescheduleDateChange={classRegistriesHook.setRescheduleDate}
        onCreateReschedule={classRegistriesHook.handleCreateReschedule}
        isCreating={classRegistriesHook.isCreatingReschedule}
        errorMessage={classRegistriesHook.registryErrorMessage}
      />

      {/* Note Modal */}
      <NoteDialog
        open={classRegistriesHook.editingNoteRegistryId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            classRegistriesHook.setEditingNoteRegistryId(null);
            classRegistriesHook.setNoteModalData({
              content: "",
              visible: {
                admin: true,
                student: false,
                professor: true,
              },
            });
          }
        }}
        registryId={classRegistriesHook.editingNoteRegistryId}
        classRegistries={classRegistriesHook.classRegistries}
        noteData={classRegistriesHook.noteModalData}
        onNoteDataChange={classRegistriesHook.setNoteModalData}
        onSave={async (registryId, noteObject) => {
          const registry = classRegistriesHook.classRegistries.find(
            (r) => r._id === registryId
          );
          if (!registry) return;

          // Sincronizar ref a estado primero para tener todos los datos actualizados
          syncRefToState(registryId);

          // Update the editing data (estado)
          classRegistriesHook.setEditingRegistryData((prev) => ({
            ...prev,
            [registryId]: {
              ...(prev[registryId] || {
                minutesViewed: registry.minutesViewed?.toString() || "",
                classType: registry.classType.map((t) => t._id),
                contentType: registry.contentType.map((t) => t._id),
                vocabularyContent: registry.vocabularyContent || "",
                studentMood: registry.studentMood || "",
                homework: registry.homework || "",
                reschedule: registry.reschedule,
                classViewed: registry.classViewed,
              }),
              note: noteObject,
            },
          }));

          // Update the ref también
          if (classRegistriesHook.editingRegistryDataRef.current[registryId]) {
            classRegistriesHook.editingRegistryDataRef.current[
              registryId
            ].note = noteObject;
          } else {
            classRegistriesHook.editingRegistryDataRef.current[registryId] = {
              minutesViewed: registry.minutesViewed?.toString() || "",
              classType: registry.classType.map((t) => t._id),
              contentType: registry.contentType.map((t) => t._id),
              vocabularyContent: registry.vocabularyContent || "",
              studentMood: registry.studentMood || "",
              homework: registry.homework || "",
              reschedule: registry.reschedule,
              classViewed: registry.classViewed,
              classTime: registry.classTime || "",
              note: noteObject,
            };
          }

          // NO llamar al endpoint aquí - la nota se guardará cuando se guarde el registro completo
        }}
      />

      {/* Create Evaluation Modal */}
      <CreateEvaluationDialog
        open={evaluationsHook.openCreateEvaluationDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            evaluationsHook.setOpenCreateEvaluationDialog(false);
            evaluationsHook.setSelectedClassRegistryForEvaluation(null);
            evaluationsHook.setEvaluationFormData({
              fecha: new Date().toISOString().split("T")[0],
              temasEvaluados: "",
              skillEvaluada: "",
              linkMaterial: "",
              capturePrueba: null,
              puntuacion: "",
              comentario: "",
            });
            evaluationsHook.setEvaluationError(null);
          }
        }}
        selectedClassRegistry={
          evaluationsHook.selectedClassRegistryForEvaluation
        }
        formData={evaluationsHook.evaluationFormData}
        onFormDataChange={evaluationsHook.setEvaluationFormData}
        error={evaluationsHook.evaluationError}
        onErrorChange={evaluationsHook.setEvaluationError}
        onSubmit={evaluationsHook.handleCreateEvaluation}
        isSubmitting={evaluationsHook.isSubmittingEvaluation}
      />
    </div>
  );
}
