"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, X, Plus } from "lucide-react";
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
  onAddObjective: () => void;
}

export function ObjectivesSection({
  objectives,
  columns,
  contentClasses,
  objectiveSuccessMessage,
  objectiveErrorMessage,
  onDismissSuccess,
  onDismissError,
  onAddObjective,
}: ObjectivesSectionProps) {
  // Filtrar objetivos que no están logrados (objectiveAchieved === false)
  const unachievedObjectives = objectives.filter((obj) => !obj.objectiveAchieved);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Class Objectives
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddObjective}
            disabled={contentClasses.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Objective
          </Button>
        </div>
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
        {unachievedObjectives.length === 0 && contentClasses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Loading objectives...
          </p>
        ) : unachievedObjectives.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            No unachieved objectives found.
          </p>
        ) : (
          <ObjectivesTable
            columns={columns}
            data={unachievedObjectives}
          />
        )}
      </CardContent>
    </Card>
  );
}

