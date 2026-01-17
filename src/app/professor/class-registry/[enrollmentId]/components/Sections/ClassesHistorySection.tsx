"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { ClassRegistry } from "../../types";
import { RegistriesTable } from "../../RegistriesTable";
import type { ColumnDef } from "@tanstack/react-table";

interface ClassesHistorySectionProps {
  classRegistries: ClassRegistry[];
  registryColumns: ColumnDef<ClassRegistry>[];
  registrySuccessMessage: string | null;
  registryErrorMessage: string | null;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

export function ClassesHistorySection({
  classRegistries,
  registryColumns,
  registrySuccessMessage,
  registryErrorMessage,
  onDismissSuccess,
  onDismissError,
}: ClassesHistorySectionProps) {
  // Ordenar registros del más nuevo al más viejo y agrupar reschedules
  const sortedAndGroupedRegistries = useMemo(() => {
    // Separar clases originales y reschedules
    const originalClasses: ClassRegistry[] = [];
    const reschedules: ClassRegistry[] = [];

    classRegistries.forEach((registry) => {
      if (registry.originalClassId !== null && registry.originalClassId !== undefined) {
        // Es un reschedule
        reschedules.push(registry);
      } else {
        // Es una clase original
        originalClasses.push(registry);
      }
    });

    // Ordenar clases originales del más nuevo al más viejo
    originalClasses.sort((a, b) => {
      const dateA = new Date(a.classDate).getTime();
      const dateB = new Date(b.classDate).getTime();
      return dateB - dateA; // Más nuevo primero
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
      const relatedReschedules = reschedulesByOriginal.get(originalClass._id) || [];
      result.push(...relatedReschedules);
    });

    // Agregar reschedules huérfanos (si los hay) al final
    const orphanReschedules = reschedules.filter(
      (r) => r.originalClassId && !originalClasses.some((oc) => oc._id === r.originalClassId?._id)
    );
    orphanReschedules.sort((a, b) => {
      const dateA = new Date(a.classDate).getTime();
      const dateB = new Date(b.classDate).getTime();
      return dateB - dateA;
    });
    result.push(...orphanReschedules);

    return result;
  }, [classRegistries]);

  // Crear columnas con tabulación para reschedules
  const historyColumns: ColumnDef<ClassRegistry>[] = useMemo(() => {
    return registryColumns.map((column) => {
      const originalCell = column.cell;
      // Verificar si es la columna de fecha de forma segura
      const isClassDateColumn = 
        ("accessorKey" in column && column.accessorKey === "classDate") ||
        ("id" in column && column.id === "classDate");
      
      // Verificar si es la columna de fecha original
      const isOriginalDateColumn = 
        ("id" in column && column.id === "originalDate");
      
      return {
        ...column,
        cell: (context) => {
          const registry = context.row.original;
          const isReschedule = !!registry.originalClassId;
          
          // Para la columna de fecha, mostrar con tabulación especial
          if (isClassDateColumn) {
            return (
              <div className={`flex items-center ${isReschedule ? "pl-8" : ""}`}>
                <span className="text-sm font-medium">
                  {formatDateForDisplay(registry.classDate)}
                </span>
              </div>
            );
          }
          
          // Para la columna de fecha original, usar directamente originalClassId.classDate
          if (isOriginalDateColumn && isReschedule && registry.originalClassId) {
            return (
              <div className="pl-8">
                <span className="text-sm text-muted-foreground">
                  {formatDateForDisplay(registry.originalClassId.classDate)}
                </span>
              </div>
            );
          }
          
          // Para otras columnas, aplicar tabulación pero mantener la lógica original
          if (originalCell && typeof originalCell === "function") {
            const cellContent = originalCell(context);
            return (
              <div className={isReschedule ? "pl-8" : ""}>
                {cellContent}
              </div>
            );
          }
          
          // Fallback si no hay cell definido
          return <div className={isReschedule ? "pl-8" : ""}></div>;
        },
      };
    });
  }, [registryColumns]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classes History</CardTitle>
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
        {sortedAndGroupedRegistries.length === 0 ? (
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
  );
}

