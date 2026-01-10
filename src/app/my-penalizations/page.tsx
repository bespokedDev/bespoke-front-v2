"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  Eye,
  ArrowUpDown,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { PenalizationRegistry, PenalizationLevel } from "@/app/penalization-registry/types";

export default function MyPenalizationsPage() {
  const { user } = useAuth();
  const [penalizations, setPenalizations] = useState<PenalizationRegistry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPenalization, setSelectedPenalization] = useState<PenalizationRegistry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch user's penalizations
  const fetchMyPenalizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient("api/penalization-registry/user/my-penalizations");

      // Handle different response structures
      interface PenalizationsResponse {
        penalizations?: PenalizationRegistry[];
      }
      
      if (response && typeof response === "object" && "penalizations" in response) {
        const responseData = response as PenalizationsResponse;
        const penalizationsArray = Array.isArray(responseData.penalizations)
          ? responseData.penalizations
          : [];
        setPenalizations(penalizationsArray);
      } else if (Array.isArray(response)) {
        setPenalizations(response as PenalizationRegistry[]);
      } else {
        setPenalizations([]);
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      if (errorInfo.statusCode === 404) {
        // Endpoint might not be ready yet
        setPenalizations([]);
        setError("No penalizations found or endpoint not available yet.");
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load your penalizations. Please try again."
        );
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyPenalizations();
    }
  }, [user, fetchMyPenalizations]);

  // String locale sort helper
  const stringLocaleSort =
    (locale = "es") =>
    (rowA: Row<PenalizationRegistry>, rowB: Row<PenalizationRegistry>, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  // Define columns
  const columns: ColumnDef<PenalizationRegistry>[] = useMemo(
    () => [
      {
        id: "penalizationType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Penalization Type
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const registry = row.original;
          let penaltyName = "N/A";
          
          if (registry.idPenalizacion) {
            if (typeof registry.idPenalizacion === "object" && registry.idPenalizacion !== null) {
              penaltyName = registry.idPenalizacion.name || "Penalization";
              
              // If there's a selected level, show it
              if (registry.idpenalizationLevel) {
                const levelId = registry.idpenalizationLevel;
                const levels = registry.idPenalizacion.penalizationLevels || [];
                const selectedLevel = levels.find((l: PenalizationLevel) => l._id === levelId);
                if (selectedLevel) {
                  penaltyName += ` - ${selectedLevel.tipo} (Nivel ${selectedLevel.nivel})`;
                }
              }
            }
          }
          
          return penaltyName;
        },
        sortingFn: stringLocaleSort(),
      },
      {
        accessorKey: "penalization_description",
        header: "Description",
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate" title={row.original.penalization_description}>
            {row.original.penalization_description}
          </div>
        ),
      },
      {
        accessorKey: "penalizationMoney",
        header: "Amount",
        cell: ({ row }) => {
          const amount = row.original.penalizationMoney;
          return amount !== null && amount !== undefined
            ? `$${amount.toFixed(2)}`
            : "N/A";
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Status
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              row.original.status === 1
                ? "bg-secondary/20 text-secondary"
                : "bg-accent-1/20 text-accent-1"
            }`}
          >
            {row.original.status === 1 ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Created At
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => formatDateForDisplay(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="icon"
            variant="outline"
            className="text-secondary border-secondary/50 hover:bg-secondary/10"
            onClick={() => {
              setSelectedPenalization(row.original);
              setIsViewDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Penalizations"
        subtitle="View your assigned penalizations"
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : !isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={penalizations}
              searchKeys={["penalization_description"]}
              searchPlaceholder="Search by description..."
            />
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penalization Details</DialogTitle>
            <DialogDescription>
              View detailed information about this penalization.
            </DialogDescription>
          </DialogHeader>

          {selectedPenalization && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Penalization Type</Label>
                  <p className="text-sm mt-1">
                    {(() => {
                      if (selectedPenalization.idPenalizacion) {
                        if (typeof selectedPenalization.idPenalizacion === "object" && selectedPenalization.idPenalizacion !== null) {
                          let name = selectedPenalization.idPenalizacion.name || "N/A";
                          
                          if (selectedPenalization.idpenalizationLevel && selectedPenalization.idPenalizacion.penalizationLevels) {
                            const levelId = selectedPenalization.idpenalizationLevel;
                            const levels = selectedPenalization.idPenalizacion.penalizationLevels;
                            const selectedLevel = levels.find((l: PenalizationLevel) => l._id === levelId);
                            if (selectedLevel) {
                              name += ` - ${selectedLevel.tipo} (Nivel ${selectedLevel.nivel})`;
                              if (selectedLevel.description) {
                                name += `: ${selectedLevel.description}`;
                              }
                            }
                          }
                          
                          return name;
                        }
                      }
                      return "N/A";
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                      selectedPenalization.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedPenalization.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedPenalization.penalization_description}
                  </p>
                </div>
                {selectedPenalization.penalizationMoney !== null &&
                  selectedPenalization.penalizationMoney !== undefined && (
                    <div>
                      <Label className="text-sm font-semibold">Amount</Label>
                      <p className="text-sm mt-1 font-medium">
                        ${selectedPenalization.penalizationMoney.toFixed(2)}
                      </p>
                    </div>
                  )}
                {selectedPenalization.enrollmentId && (
                  <div>
                    <Label className="text-sm font-semibold">Enrollment</Label>
                    <p className="text-sm mt-1">
                      {selectedPenalization.enrollmentId.alias ||
                        `${selectedPenalization.enrollmentId.language} - ${selectedPenalization.enrollmentId.enrollmentType}`}
                    </p>
                  </div>
                )}
                {selectedPenalization.professorId && (
                  <div>
                    <Label className="text-sm font-semibold">Professor</Label>
                    <p className="text-sm mt-1">
                      {selectedPenalization.professorId.name}
                    </p>
                  </div>
                )}
                {selectedPenalization.studentId && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">Student</Label>
                    <p className="text-sm mt-1">
                      {`${selectedPenalization.studentId.name} (${selectedPenalization.studentId.studentCode}) - ${selectedPenalization.studentId.email}`}
                    </p>
                  </div>
                )}
                {selectedPenalization.support_file && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">Support File</Label>
                    <p className="text-sm mt-1 break-words">
                      {selectedPenalization.support_file}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm mt-1">
                    {formatDateForDisplay(selectedPenalization.createdAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Updated At</Label>
                  <p className="text-sm mt-1">
                    {formatDateForDisplay(selectedPenalization.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

