"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { CheckCircle2, AlertCircle, X, Target } from "lucide-react";
import type { ClassObjective } from "../../types";
import { ObjectivesTable } from "../../ObjectivesTable";
import type { ColumnDef } from "@tanstack/react-table";

interface ObjectivesHistorySectionProps {
  objectives: ClassObjective[];
  objectiveSuccessMessage: string | null;
  objectiveErrorMessage: string | null;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

export function ObjectivesHistorySection({
  objectives,
  objectiveSuccessMessage,
  objectiveErrorMessage,
  onDismissSuccess,
  onDismissError,
}: ObjectivesHistorySectionProps) {
  // Mostrar todos los objetivos ordenados del más nuevo al más viejo
  const historicalObjectives = useMemo(() => {
    // Ordenar del más nuevo al más viejo por objectiveDate
    return [...objectives].sort((a, b) => {
      const dateA = new Date(a.objectiveDate).getTime();
      const dateB = new Date(b.objectiveDate).getTime();
      return dateB - dateA; // Más nuevo primero
    });
  }, [objectives]);

  // Crear columnas de solo lectura para el historial
  const historyColumns: ColumnDef<ClassObjective>[] = useMemo(() => [
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
          <div className="flex items-center justify-center">
            {objective.objectiveAchieved ? (
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Objectives History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {objectiveSuccessMessage && (
          <div className="mb-4 bg-secondary/10 border border-secondary/20 text-secondary dark:text-secondary-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{objectiveSuccessMessage}</span>
            </div>
            <button
              onClick={onDismissSuccess}
              className="text-secondary hover:opacity-80 dark:text-secondary-foreground"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {objectiveErrorMessage && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{objectiveErrorMessage}</span>
            </div>
            <button
              onClick={onDismissError}
              className="text-destructive hover:opacity-80 dark:text-destructive-foreground"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {historicalObjectives.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No objectives found.
          </p>
        ) : (
          <ObjectivesTable
            columns={historyColumns}
            data={historicalObjectives}
            enablePagination={true}
          />
        )}
      </CardContent>
    </Card>
  );
}

