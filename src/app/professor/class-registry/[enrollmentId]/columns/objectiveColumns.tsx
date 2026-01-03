"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Loader2, X, Save, Pencil } from "lucide-react";
import { formatDateForDisplay, extractDatePart, dateStringToISO } from "@/lib/dateUtils";
import type { ClassObjective, ContentClass } from "../types";
import {
  EditableObjectiveCell,
  EditableTeachersNoteCell,
  EditableObjectiveDateCell,
  EditableCategoryCell,
  EditableAchievedCell,
} from "../components/EditableFields/EditableObjectiveFields";

interface UseObjectiveColumnsParams {
  editingObjectiveId: string | null;
  initialEditingData: Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>;
  editingDataRef: React.MutableRefObject<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>;
  contentClasses: ContentClass[];
  handleUpdateObjective: (objectiveId: string, data: {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string | null;
    objectiveAchieved: boolean;
  }) => Promise<boolean>;
  savingObjectiveId: string | null;
  setInitialEditingData: React.Dispatch<React.SetStateAction<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>>;
  setEditingObjectiveId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useObjectiveColumns = ({
  editingObjectiveId,
  initialEditingData,
  editingDataRef,
  contentClasses,
  handleUpdateObjective,
  savingObjectiveId,
  setInitialEditingData,
  setEditingObjectiveId,
}: UseObjectiveColumnsParams): ColumnDef<ClassObjective>[] => {
  return useMemo(() => [
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

        const currentValue =
          (isEditing && initialData
            ? initialData.objectiveAchieved
            : objective.objectiveAchieved) ?? false;

        return (
          <div className="flex items-center justify-center">
            <EditableAchievedCell
              key={`achieved-${objective._id}`}
              initialValue={currentValue}
              onUpdate={async (newValue) => {
                // Asegurar que el ref tenga datos base
                if (!editingDataRef.current[objective._id]) {
                  editingDataRef.current[objective._id] = {
                    category: objective.category._id,
                    objective: objective.objective || "",
                    objectiveDate: extractDatePart(objective.objectiveDate),
                    teachersNote: objective.teachersNote || "",
                    objectiveAchieved: newValue,
                  };
                } else {
                  editingDataRef.current[objective._id].objectiveAchieved = newValue;
                }

                // Actualizar modelo local inmediatamente
                if (initialEditingData[objective._id]) {
                  initialEditingData[objective._id].objectiveAchieved = newValue;
                }

                // Para objetivos ya persistidos, llamar al endpoint de actualización inmediatamente
                if (!objective._id.startsWith("temp-")) {
                  const editData = editingDataRef.current[objective._id];
                  await handleUpdateObjective(objective._id, {
                    category: editData.category,
                    objective: editData.objective,
                    objectiveDate: dateStringToISO(editData.objectiveDate),
                    teachersNote: editData.teachersNote || null,
                    objectiveAchieved: newValue,
                  });
                }
              }}
            />
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
  ], [editingObjectiveId, initialEditingData, editingDataRef, contentClasses, handleUpdateObjective, savingObjectiveId, setInitialEditingData, setEditingObjectiveId]);
};

