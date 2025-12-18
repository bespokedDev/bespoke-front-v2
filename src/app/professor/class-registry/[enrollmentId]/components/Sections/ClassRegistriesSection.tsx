"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { RegistriesTable } from "../../RegistriesTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { ClassRegistry, EvaluationWithClassDate } from "../../types";

interface ClassRegistriesSectionProps {
  classRegistries: ClassRegistry[];
  registryColumns: ColumnDef<ClassRegistry>[];
  evaluations: EvaluationWithClassDate[];
  EvaluationsTable: React.ComponentType<{ evaluations: EvaluationWithClassDate[] }>;
  activeTab: string;
  onTabChange: (value: string) => void;
  registrySuccessMessage: string | null;
  registryErrorMessage: string | null;
  isLoadingEvaluations: boolean;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

export function ClassRegistriesSection({
  classRegistries,
  registryColumns,
  evaluations,
  EvaluationsTable,
  activeTab,
  onTabChange,
  registrySuccessMessage,
  registryErrorMessage,
  isLoadingEvaluations,
  onDismissSuccess,
  onDismissError,
}: ClassRegistriesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Registries</CardTitle>
      </CardHeader>
      <CardContent>
        {registrySuccessMessage && (
          <div className="mb-4 bg-secondary/10 border border-secondary/20 text-secondary dark:text-secondary-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{registrySuccessMessage}</span>
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
        {registryErrorMessage && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{registryErrorMessage}</span>
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
        <Tabs value={activeTab} onValueChange={onTabChange}>
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
  );
}

