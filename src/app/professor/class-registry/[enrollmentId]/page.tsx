"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
import type {
  ClassRegistry,
  EvaluationWithClassDate,
} from "./types";
import {
  EditableMinutesViewedField,
  EditableVocabularyContentField,
  EditableStudentMoodField,
  EditableHomeworkField,
  EditableClassViewedField,
} from "./components/EditableFields/EditableRegistryFields";
import { useObjectiveColumns } from "./columns/objectiveColumns";
import { useEvaluationColumns } from "./columns/evaluationColumns";
import { RescheduleDialog } from "./components/Dialogs/RescheduleDialog";
import { NoteDialog } from "./components/Dialogs/NoteDialog";
import { CreateEvaluationDialog } from "./components/Dialogs/CreateEvaluationDialog";
import { EnrollmentInfoCard } from "./components/Sections/EnrollmentInfoCard";
import { ObjectivesSection } from "./components/Sections/ObjectivesSection";
import { ClassRegistriesSection } from "./components/Sections/ClassRegistriesSection";
import { useEnrollmentData } from "./hooks/useEnrollmentData";
import { useObjectives } from "./hooks/useObjectives";
import { useClassRegistries } from "./hooks/useClassRegistries";
import { useEvaluations } from "./hooks/useEvaluations";

export default function ClassRegistryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;

  // Estado local para el tab activo (necesario para useEvaluations)
  const [activeTab, setActiveTab] = useState("classes");

  // Custom hooks
  const {
    enrollment,
    contentClasses,
    classTypes,
    isLoading: isLoadingEnrollment,
    error,
  } = useEnrollmentData(enrollmentId);

  // Note: We need to initialize classRegistriesHook first, but we'll update the evaluation cache later
  const classRegistriesHook = useClassRegistries(enrollmentId);

  const objectivesHook = useObjectives(enrollmentId, enrollment, contentClasses);

  const evaluationsHook = useEvaluations(
    enrollmentId,
    activeTab,
    (message) => classRegistriesHook.setRegistrySuccessMessage(message),
    (message) => classRegistriesHook.setRegistryErrorMessage(message),
    classRegistriesHook.fetchClassRegistries
  );

  // Load class registries when enrollment data is loaded
  useEffect(() => {
    if (!isLoadingEnrollment && enrollment) {
      classRegistriesHook.fetchClassRegistries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingEnrollment, enrollment]);

  // Update evaluation cache when class registries are loaded (only update ref to avoid re-renders)
  // This effect is only needed to sync the cache when registries change
  // The cache is primarily updated in fetchClassRegistries, but we also update it here
  // to ensure consistency when registries are updated from other sources
  useEffect(() => {
    if (classRegistriesHook.classRegistries.length > 0) {
      const newCache: Record<string, boolean> = {};
      classRegistriesHook.classRegistries.forEach((registry) => {
        const hasEvaluation = !!(registry.evaluations && registry.evaluations.length > 0);
        newCache[registry._id] = hasEvaluation;
      });
      
      // Only update ref, not state, to avoid triggering re-renders
      // The cache is read from the ref in checkClassHasEvaluation
      evaluationsHook.evaluationCacheRef.current = newCache;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRegistriesHook.classRegistries.length]);

  // Componente inline para campo Objective con estado local

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

  // Old definition removed - now using hook
  /* const objectiveColumns: ColumnDef<ClassObjective>[] = useMemo(() => [
    {
      id: "objective",
      header: "Objective",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        const initialData = initialEditingData[objective._id];
        
        if (isEditing && initialData) {
          return (
            <EditableObjectiveCell
              key={`objective-${objective._id}`}
              objectiveId={objective._id}
              initialValue={initialData.objective}
              onUpdate={(newValue) => {
                if (editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id].objective = newValue;
                }
              }}
            />
          );
        }
        return <span className="text-sm">{objective.objective || "-"}</span>;
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        const initialData = initialEditingData[objective._id];
        
        if (isEditing && initialData) {
          return (
            <EditableCategoryCell
              key={`category-${objective._id}`}
              objectiveId={objective._id}
              initialValue={initialData.category}
              contentClasses={contentClasses}
              onUpdate={(newValue) => {
                if (editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id].category = newValue;
                }
              }}
            />
          );
        }
        return <span className="text-sm">{objective.category.name}</span>;
      },
    },
    {
      id: "teachersNote",
      header: "Teacher's Note",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        const initialData = initialEditingData[objective._id];
        
        if (isEditing && initialData) {
          return (
            <EditableTeachersNoteCell
              key={`teachersNote-${objective._id}`}
              objectiveId={objective._id}
              initialValue={initialData.teachersNote}
              onUpdate={(newValue) => {
                if (editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id].teachersNote = newValue;
                }
              }}
            />
          );
        }
        return <span className="text-sm">{objective.teachersNote || "-"}</span>;
      },
    },
    {
      id: "objectiveDate",
      header: "Objective Date",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        const initialData = initialEditingData[objective._id];
        
        if (isEditing && initialData) {
          return (
            <EditableObjectiveDateCell
              key={`objectiveDate-${objective._id}`}
              objectiveId={objective._id}
              initialValue={initialData.objectiveDate}
              onUpdate={(newValue) => {
                if (editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id].objectiveDate = newValue;
                }
              }}
            />
          );
        }
        return (
          <span className="text-sm">
            {formatDateForDisplay(objective.objectiveDate)}
          </span>
        );
      },
    },
    {
      id: "achieved",
      header: "Achieved",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        const initialData = initialEditingData[objective._id];
        
        if (isEditing && initialData) {
          return (
            <EditableAchievedCell
              key={`achieved-${objective._id}`}
              objectiveId={objective._id}
              initialValue={initialData.objectiveAchieved}
              onUpdate={(newValue) => {
                if (editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id].objectiveAchieved = newValue;
                }
              }}
            />
          );
        }
        return (
          <div className="flex items-center justify-center">
            {objective.objectiveAchieved ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <X className="h-5 w-5 text-gray-400" />
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const objective = row.original;
        const isEditing = editingObjectiveId === objective._id;
        
        if (isEditing) {
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const editData = editingDataRef.current[objective._id];
                  if (editData) {
                    const success = await handleUpdateObjective(objective._id, {
                      category: editData.category,
                      objective: editData.objective,
                      objectiveDate: dateStringToISO(editData.objectiveDate),
                      teachersNote: editData.teachersNote || null,
                      objectiveAchieved: editData.objectiveAchieved,
                    });
                    if (success) {
                      delete editingDataRef.current[objective._id];
                      setInitialEditingData((prev) => {
                      const newData = { ...prev };
                      delete newData[objective._id];
                      return newData;
                    });
                  setEditingObjectiveId(null);
                    }
                  }
                }}
                disabled={savingObjectiveId === objective._id}
                title="Save"
              >
                {savingObjectiveId === objective._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  delete editingDataRef.current[objective._id];
                  setInitialEditingData((prev) => {
                    const newData = { ...prev };
                    delete newData[objective._id];
                    return newData;
                  });
                  setEditingObjectiveId(null);
                }}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const initialData = {
                  category: objective.category._id,
                objective: objective.objective || "",
                  objectiveDate: extractDatePart(objective.objectiveDate),
                  teachersNote: objective.teachersNote || "",
                  objectiveAchieved: objective.objectiveAchieved,
              };
              
              // Inicializar el ref y el estado inicial
              editingDataRef.current[objective._id] = { ...initialData };
              setInitialEditingData((prev) => ({
                ...prev,
                [objective._id]: initialData,
              }));
              setEditingObjectiveId(objective._id);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [editingObjectiveId, contentClasses, handleUpdateObjective, savingObjectiveId]); */

  // Componentes inline para campos editables de registros (evitar pérdida de foco)
  // Los refs y estados están ahora en los hooks


  // Columnas de Evaluaciones
  const evaluationColumns = useEvaluationColumns({
    editingEvaluationId: evaluationsHook.editingEvaluationId,
    editingEvaluationDataRef: evaluationsHook.editingEvaluationDataRef,
    handleUpdateEvaluation: evaluationsHook.handleUpdateEvaluation,
    setEditingEvaluationId: evaluationsHook.setEditingEvaluationId,
  });

  // Old evaluationColumns definition removed - now using hook

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

  const registryColumns: ColumnDef<ClassRegistry>[] = useMemo(() => [
    {
      accessorKey: "classDate",
      header: "Class Date",
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
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        const initialValue = editData?.minutesViewed ?? (registry.minutesViewed?.toString() || "");
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        return (
          <EditableMinutesViewedField
            registryId={registry._id}
            initialValue={initialValue}
            onUpdate={(newValue) => {
              if (classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
                classRegistriesHook.editingRegistryDataRef.current[registry._id].minutesViewed = newValue;
              }
            }}
          />
        );
      },
    },
    {
      id: "classType",
      header: "Class Type",
      cell: ({ row }) => {
        const registry = row.original;
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        const selectedIds = editData?.classType ?? classRegistriesHook.editingRegistryDataRef.current[registry._id]?.classType ?? registry.classType.map((t) => t._id);
        const popoverKey = `classType-${registry._id}`;
        const open = classRegistriesHook.openPopovers[popoverKey]?.classType || false;
        
        // Obtener los nombres de los tipos seleccionados
        const selectedNames = selectedIds
          .map((id) => classTypes.find((t) => t._id === id)?.name)
          .filter((name): name is string => name !== undefined);
        
        const displayText = selectedNames.length > 0
          ? selectedNames.join(", ")
          : "Select...";
        
        return (
          <Popover 
            open={open} 
            onOpenChange={(isOpen) => {
              classRegistriesHook.setOpenPopovers((prev: Record<string, { classType: boolean; contentType: boolean }>) => ({
                ...prev,
                [popoverKey]: { ...(prev[popoverKey] || { classType: false, contentType: false }), classType: isOpen },
              }));
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                <span className="truncate text-left flex-1">{displayText}</span>
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
                        const newSelectedIds = selectedIds.includes(type._id)
                            ? selectedIds.filter((id: string) => id !== type._id)
                          : [...selectedIds, type._id];
                        
                        // Inicializar el ref si no existe
                        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
                          };
                        }
                        
                        // Actualizar el ref
                        classRegistriesHook.editingRegistryDataRef.current[registry._id].classType = newSelectedIds;
                        
                        // Actualizar el estado para que se refleje en el UI (solo para mostrar)
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
                            }),
                            classType: newSelectedIds,
                          },
                        }));
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
      id: "contentType",
      header: "Content Type",
      cell: ({ row }) => {
        const registry = row.original;
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        const selectedIds = editData?.contentType ?? classRegistriesHook.editingRegistryDataRef.current[registry._id]?.contentType ?? registry.contentType.map((t) => t._id);
        const popoverKey = `contentType-${registry._id}`;
        const open = classRegistriesHook.openPopovers[popoverKey]?.contentType || false;
        
        // Obtener los nombres de los tipos seleccionados
        const selectedNames = selectedIds
          .map((id) => contentClasses.find((t) => t._id === id)?.name)
          .filter((name): name is string => name !== undefined);
        
        const displayText = selectedNames.length > 0
          ? selectedNames.join(", ")
          : "Select...";
        
        return (
          <Popover 
            open={open} 
            onOpenChange={(isOpen) => {
              classRegistriesHook.setOpenPopovers((prev: Record<string, { classType: boolean; contentType: boolean }>) => ({
                ...prev,
                [popoverKey]: { ...(prev[popoverKey] || { classType: false, contentType: false }), contentType: isOpen },
              }));
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                <span className="truncate text-left flex-1">{displayText}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search content types..." />
                <CommandEmpty>No content type found.</CommandEmpty>
                <CommandGroup>
                  {contentClasses.map((type) => (
                    <CommandItem
                      key={type._id}
                      value={type._id}
                      onSelect={() => {
                        const newSelectedIds = selectedIds.includes(type._id)
                            ? selectedIds.filter((id: string) => id !== type._id)
                          : [...selectedIds, type._id];
                        
                        // Inicializar el ref si no existe
                        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
                          };
                        }
                        
                        // Actualizar el ref
                        classRegistriesHook.editingRegistryDataRef.current[registry._id].contentType = newSelectedIds;
                        
                        // Actualizar el estado para que se refleje en el UI (solo para mostrar)
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
                            }),
                            contentType: newSelectedIds,
                          },
                        }));
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
      header: "Vocabulary Content",
      cell: ({ row }) => {
        const registry = row.original;
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        const initialValue = editData?.vocabularyContent ?? (registry.vocabularyContent || "");
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        return (
          <EditableVocabularyContentField
            registryId={registry._id}
            initialValue={initialValue}
            onUpdate={(newValue) => {
              if (classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
                classRegistriesHook.editingRegistryDataRef.current[registry._id].vocabularyContent = newValue;
              }
            }}
          />
        );
      },
    },
    {
      accessorKey: "studentMood",
      header: "Student Mood",
      cell: ({ row }) => {
        const registry = row.original;
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        const initialValue = editData?.studentMood ?? (registry.studentMood || "");
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        return (
          <EditableStudentMoodField
            registryId={registry._id}
            initialValue={initialValue}
            onUpdate={(newValue) => {
              if (classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
                classRegistriesHook.editingRegistryDataRef.current[registry._id].studentMood = newValue;
              }
            }}
          />
        );
      },
    },
    {
      accessorKey: "note",
      header: "Note",
      cell: ({ row }) => {
        const registry = row.original;
        const noteContent = registry.note?.content || "";
        const hasNote = noteContent.trim().length > 0;
        const truncatedNote = noteContent.length > 50 
          ? `${noteContent.substring(0, 50)}...` 
          : noteContent;
        
        return (
          <div className="flex items-center gap-2 min-w-[150px] md:min-w-[200px]">
            {hasNote ? (
              <>
                <span 
                  className="text-sm flex-1 truncate" 
                  title={noteContent}
                >
                  {truncatedNote}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    classRegistriesHook.setNoteModalData({
                      content: registry.note?.content || "",
                      visible: {
                        admin: (registry.note?.visible.admin || 0) === 1,
                        student: (registry.note?.visible.student || 0) === 1,
                        professor: true, // Always visible to professor
                      },
                    });
                    classRegistriesHook.setEditingNoteRegistryId(registry._id);
                  }}
                  className="h-8 w-8 p-0 shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  classRegistriesHook.setNoteModalData({
                    content: "",
                    visible: {
                      admin: true,
                      student: false,
                      professor: true,
                    },
                  });
                  classRegistriesHook.setEditingNoteRegistryId(registry._id);
                }}
                className="h-8 text-xs"
              >
                + Add Note
              </Button>
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
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        const initialValue = editData?.homework ?? (registry.homework || "");
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
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
          };
        }
        
        return (
          <EditableHomeworkField
            registryId={registry._id}
            initialValue={initialValue}
            onUpdate={(newValue) => {
              if (classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
                classRegistriesHook.editingRegistryDataRef.current[registry._id].homework = newValue;
              }
            }}
          />
        );
      },
    },
    {
      id: "reschedule",
      header: "Reschedule Made",
      cell: ({ row }) => {
        const registry = row.original;
        const rescheduleValue = registry.reschedule;
        
        let displayText: string;
        if (rescheduleValue === 0) {
          displayText = "Normal";
        } else if (rescheduleValue === 1) {
          displayText = "In reschedule";
        } else if (rescheduleValue === 2) {
          displayText = "Reschedule viewed";
        } else {
          displayText = "Normal";
        }
        
        return (
          <span className="text-sm">{displayText}</span>
        );
      },
    },
    {
      id: "classViewed",
      header: "Class Viewed",
      cell: ({ row }) => {
        const registry = row.original;
        const editData = classRegistriesHook.editingRegistryData[registry._id];
        const initialValue = editData?.classViewed ?? registry.classViewed;
        
        // Inicializar el ref si no existe
        if (!classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
          classRegistriesHook.editingRegistryDataRef.current[registry._id] = {
                    minutesViewed: registry.minutesViewed?.toString() || "",
                    classType: registry.classType.map((t) => t._id),
                    contentType: registry.contentType.map((t) => t._id),
                    vocabularyContent: registry.vocabularyContent || "",
                    studentMood: registry.studentMood || "",
                    note: registry.note || null,
                    homework: registry.homework || "",
                    reschedule: registry.reschedule,
            classViewed: initialValue,
          };
        }
        
        return (
          <EditableClassViewedField
            registryId={registry._id}
            initialValue={initialValue}
            onUpdate={(newValue) => {
              if (classRegistriesHook.editingRegistryDataRef.current[registry._id]) {
                classRegistriesHook.editingRegistryDataRef.current[registry._id].classViewed = newValue;
              }
            }}
          />
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const registry = row.original;
        const canReschedule = registry.reschedule === 0;
        const hasEvaluationInCache = evaluationsHook.evaluationCache[registry._id] ?? false;
        const isMenuOpen = evaluationsHook.openMenuRegistryId === registry._id;
        
        return (
          <DropdownMenu 
            open={isMenuOpen} 
            onOpenChange={async (open) => {
              evaluationsHook.setOpenMenuRegistryId(open ? registry._id : null);
              
              // Verificar evaluación cuando se abre el menú si no está en cache
              // El cache se actualiza desde fetchClassRegistries, así que solo verificamos si existe
              // No necesitamos hacer una llamada adicional aquí
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReschedule && (
                <DropdownMenuItem
                  onClick={() => {
                    classRegistriesHook.setRescheduleRegistryId(registry._id);
                    classRegistriesHook.setRescheduleDate("");
                    evaluationsHook.setOpenMenuRegistryId(null);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Reschedule
                </DropdownMenuItem>
              )}
              {canReschedule && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                onClick={() => {
                  evaluationsHook.setSelectedClassRegistryForEvaluation(registry);
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
                {hasEvaluationInCache ? "Already has evaluation" : "Create Evaluation"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [
    classRegistriesHook.editingRegistryData,
    classRegistriesHook.openPopovers,
    evaluationsHook.evaluationCache,
    evaluationsHook.openMenuRegistryId,
    classTypes,
    contentClasses,
  ]);

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
          onClick={() => router.push("/professor/class-registry")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Enrollments
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
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
            onClick={() => router.push("/professor/class-registry")}
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

        {/* Objectives and Registries - Right Side */}
        <div className="md:col-span-2 lg:col-span-3 space-y-4 md:space-y-6">
          {/* Objectives Section */}
          <ObjectivesSection
            objectives={objectivesHook.objectives}
            columns={objectiveColumns}
            contentClasses={contentClasses}
            objectiveSuccessMessage={objectivesHook.objectiveSuccessMessage}
            objectiveErrorMessage={objectivesHook.objectiveErrorMessage}
            onDismissSuccess={() => objectivesHook.setObjectiveSuccessMessage(null)}
            onDismissError={() => objectivesHook.setObjectiveErrorMessage(null)}
          />

          {/* Class Registries Table */}
          <ClassRegistriesSection
            classRegistries={classRegistriesHook.classRegistries}
            registryColumns={registryColumns}
            evaluations={evaluationsHook.evaluations}
            EvaluationsTable={EvaluationsTable}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            registrySuccessMessage={classRegistriesHook.registrySuccessMessage}
            registryErrorMessage={classRegistriesHook.registryErrorMessage}
            isLoadingEvaluations={evaluationsHook.isLoadingEvaluations}
            savingAllRegistries={classRegistriesHook.savingAllRegistries}
            onDismissSuccess={() => classRegistriesHook.setRegistrySuccessMessage(null)}
            onDismissError={() => classRegistriesHook.setRegistryErrorMessage(null)}
            onSaveAll={classRegistriesHook.handleSaveAllRegistries}
          />
        </div>
      </div>

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
          const registry = classRegistriesHook.classRegistries.find(r => r._id === registryId);
          if (!registry) return;

          const editData = classRegistriesHook.editingRegistryData[registryId];
          
          // Update the editing data
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

          // Save to API
          await classRegistriesHook.handleUpdateRegistry(registryId, {
            minutesViewed: editData?.minutesViewed === "" ? null : Number(editData?.minutesViewed || registry.minutesViewed || 0),
            classType: editData?.classType || registry.classType.map((t) => t._id),
            contentType: editData?.contentType || registry.contentType.map((t) => t._id),
            vocabularyContent: editData?.vocabularyContent || registry.vocabularyContent || null,
            studentMood: editData?.studentMood || registry.studentMood || null,
            note: noteObject,
            homework: editData?.homework || registry.homework || null,
          });
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
        selectedClassRegistry={evaluationsHook.selectedClassRegistryForEvaluation}
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


