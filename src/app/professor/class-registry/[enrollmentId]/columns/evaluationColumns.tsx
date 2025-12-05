"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, Pencil, ExternalLink } from "lucide-react";
import type { EvaluationWithClassDate, Evaluation } from "../types";
import { convertImageToBase64 } from "../utils/imageUtils";
import {
  EditableEvaluationTextField,
  EditableEvaluationTextareaField,
} from "../components/EditableFields/EditableEvaluationFields";

interface UseEvaluationColumnsParams {
  editingEvaluationId: string | null;
  editingEvaluationDataRef: React.MutableRefObject<Record<string, Partial<Evaluation>>>;
  handleUpdateEvaluation: (evaluationId: string, updateData: Partial<Evaluation>) => Promise<void>;
  setEditingEvaluationId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useEvaluationColumns = ({
  editingEvaluationId,
  editingEvaluationDataRef,
  handleUpdateEvaluation,
  setEditingEvaluationId,
}: UseEvaluationColumnsParams): ColumnDef<EvaluationWithClassDate>[] => {
  return useMemo(() => [
    {
      accessorKey: "fecha",
      header: "Evaluation Date",
      cell: ({ row }) => {
        const evaluation = row.original;
        // fecha is in DD/MM/YYYY format and is not editable - it always matches the class date
        return (
          <span className="text-sm font-medium">
            {evaluation.fecha || "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "temasEvaluados",
      header: "Evaluated Topics",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.temasEvaluados !== undefined 
            ? editData.temasEvaluados 
            : (evaluation.temasEvaluados || "");
          
          return (
            <EditableEvaluationTextareaField
              initialValue={currentValue || ""}
              onUpdate={(newValue) => {
                if (!editingEvaluationDataRef.current[evaluation._id]) {
                  editingEvaluationDataRef.current[evaluation._id] = {};
                }
                editingEvaluationDataRef.current[evaluation._id].temasEvaluados = newValue;
              }}
              placeholder="Evaluated topics"
            />
          );
        }
        
        return <span className="text-sm">{evaluation.temasEvaluados || "-"}</span>;
      },
    },
    {
      accessorKey: "skillEvaluada",
      header: "Evaluated Skill",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.skillEvaluada !== undefined 
            ? editData.skillEvaluada 
            : (evaluation.skillEvaluada || "");
          
          return (
            <EditableEvaluationTextField
              initialValue={currentValue || ""}
              onUpdate={(newValue) => {
                if (!editingEvaluationDataRef.current[evaluation._id]) {
                  editingEvaluationDataRef.current[evaluation._id] = {};
                }
                editingEvaluationDataRef.current[evaluation._id].skillEvaluada = newValue;
              }}
              placeholder="Evaluated skill"
            />
          );
        }
        
        return <span className="text-sm">{evaluation.skillEvaluada || "-"}</span>;
      },
    },
    {
      accessorKey: "linkMaterial",
      header: "Material Link",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.linkMaterial !== undefined 
            ? editData.linkMaterial 
            : (evaluation.linkMaterial || "");
          
          return (
            <EditableEvaluationTextField
              initialValue={currentValue || ""}
              onUpdate={(newValue) => {
                if (!editingEvaluationDataRef.current[evaluation._id]) {
                  editingEvaluationDataRef.current[evaluation._id] = {};
                }
                editingEvaluationDataRef.current[evaluation._id].linkMaterial = newValue;
              }}
              placeholder="Material URL"
            />
          );
        }
        
        return evaluation.linkMaterial ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(evaluation.linkMaterial!, "_blank")}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Material
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "capturePrueba",
      header: "Screenshot",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.capturePrueba !== undefined 
            ? editData.capturePrueba 
            : (evaluation.capturePrueba || null);
          
          return (
            <div className="space-y-2">
              {currentValue && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentValue}
                  alt="Test screenshot"
                  className="w-16 h-16 object-cover rounded border"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const base64 = await convertImageToBase64(file);
                      if (!editingEvaluationDataRef.current[evaluation._id]) {
                        editingEvaluationDataRef.current[evaluation._id] = {};
                      }
                      editingEvaluationDataRef.current[evaluation._id].capturePrueba = base64;
                    } catch (err) {
                      console.error("Error converting image:", err);
                    }
                  }
                }}
                className="text-xs"
              />
            </div>
          );
        }
        
        return evaluation.capturePrueba ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={evaluation.capturePrueba}
            alt="Test screenshot"
            className="w-16 h-16 object-cover rounded border cursor-pointer"
            onClick={() => {
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(`<img src="${evaluation.capturePrueba}" style="max-width: 100%; height: auto;" />`);
              }
            }}
          />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "puntuacion",
      header: "Score",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.puntuacion !== undefined 
            ? editData.puntuacion 
            : (evaluation.puntuacion || "");
          
          return (
            <EditableEvaluationTextField
              initialValue={currentValue || ""}
              onUpdate={(newValue) => {
                if (!editingEvaluationDataRef.current[evaluation._id]) {
                  editingEvaluationDataRef.current[evaluation._id] = {};
                }
                editingEvaluationDataRef.current[evaluation._id].puntuacion = newValue;
              }}
              placeholder="Score"
              className="w-full max-w-[120px]"
            />
          );
        }
        
        return <span className="text-sm">{evaluation.puntuacion || "-"}</span>;
      },
    },
    {
      accessorKey: "comentario",
      header: "Comment",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          const editData = editingEvaluationDataRef.current[evaluation._id];
          const currentValue = editData?.comentario !== undefined 
            ? editData.comentario 
            : (evaluation.comentario || "");
          
          return (
            <EditableEvaluationTextareaField
              initialValue={currentValue || ""}
              onUpdate={(newValue) => {
                if (!editingEvaluationDataRef.current[evaluation._id]) {
                  editingEvaluationDataRef.current[evaluation._id] = {};
                }
                editingEvaluationDataRef.current[evaluation._id].comentario = newValue;
              }}
              placeholder="Comment"
            />
          );
        }
        
        return (
          <span className="text-sm line-clamp-2">
            {evaluation.comentario || "-"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const evaluation = row.original;
        const isEditing = editingEvaluationId === evaluation._id;
        
        if (isEditing) {
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const editData = editingEvaluationDataRef.current[evaluation._id];
                  if (editData) {
                    try {
                      await handleUpdateEvaluation(evaluation._id, editData);
                      delete editingEvaluationDataRef.current[evaluation._id];
                      setEditingEvaluationId(null);
                    } catch (err) {
                      console.error("Error updating evaluation:", err);
                    }
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  delete editingEvaluationDataRef.current[evaluation._id];
                  setEditingEvaluationId(null);
                }}
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
              // Inicializar datos de edición (fecha no es editable, siempre coincide con classDate)
              editingEvaluationDataRef.current[evaluation._id] = {
                temasEvaluados: evaluation.temasEvaluados || "",
                skillEvaluada: evaluation.skillEvaluada || "",
                linkMaterial: evaluation.linkMaterial || "",
                capturePrueba: evaluation.capturePrueba || null,
                puntuacion: evaluation.puntuacion || "",
                comentario: evaluation.comentario || "",
              };
              setEditingEvaluationId(evaluation._id);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        );
      },
    },
  ], [editingEvaluationId, editingEvaluationDataRef, handleUpdateEvaluation, setEditingEvaluationId]);
};

