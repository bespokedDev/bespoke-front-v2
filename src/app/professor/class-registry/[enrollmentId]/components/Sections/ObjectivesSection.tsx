"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CheckCircle2, AlertCircle, X } from "lucide-react";
import { ObjectivesTable } from "../../ObjectivesTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { ClassObjective } from "../../types";

interface ObjectivesSectionProps {
  objectives: ClassObjective[];
  columns: ColumnDef<ClassObjective>[];
  contentClasses: Array<{ _id: string; name: string }>;
  objectiveSuccessMessage: string | null;
  objectiveErrorMessage: string | null;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

export function ObjectivesSection({
  objectives,
  columns,
  contentClasses,
  objectiveSuccessMessage,
  objectiveErrorMessage,
  onDismissSuccess,
  onDismissError,
}: ObjectivesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Class Objectives
        </CardTitle>
      </CardHeader>
      <CardContent>
        {objectiveSuccessMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{objectiveSuccessMessage}</span>
            </div>
            <button
              onClick={onDismissSuccess}
              className="text-green-700 hover:text-green-900"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {objectiveErrorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{objectiveErrorMessage}</span>
            </div>
            <button
              onClick={onDismissError}
              className="text-red-700 hover:text-red-900"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {objectives.length === 0 && contentClasses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Loading objectives...
          </p>
        ) : (
          <ObjectivesTable
            columns={columns}
            data={objectives}
          />
        )}
      </CardContent>
    </Card>
  );
}

