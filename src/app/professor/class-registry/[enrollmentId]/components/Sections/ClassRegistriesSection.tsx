"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, X, Loader2, Save } from "lucide-react";
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
  savingAllRegistries: boolean;
  onDismissSuccess: () => void;
  onDismissError: () => void;
  onSaveAll: () => void;
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
  savingAllRegistries,
  onDismissSuccess,
  onDismissError,
  onSaveAll,
}: ClassRegistriesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Registries</CardTitle>
      </CardHeader>
      <CardContent>
        {registrySuccessMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{registrySuccessMessage}</span>
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
        {registryErrorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{registryErrorMessage}</span>
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
            <div className="mt-4 flex justify-end">
              <Button
                onClick={onSaveAll}
                disabled={savingAllRegistries || classRegistries.length === 0}
                className="min-w-[120px]"
              >
                {savingAllRegistries ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Todo
                  </>
                )}
              </Button>
            </div>
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

