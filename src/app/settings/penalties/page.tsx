/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Pencil,
  Ban,
  Eye,
  ArrowUpDown,
  Loader2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";

interface Penalty {
  _id: string;
  name: string;
  status: number;
  statusText: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatePenaltyData {
  name: string;
}

interface UpdatePenaltyData {
  name: string;
}

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "toggle-status" | "view" | null
  >(null);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch penalties from API
  const fetchPenalties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/penalties");
      setPenalties(data || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load penalties. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new penalty
  const createPenalty = async (penaltyData: CreatePenaltyData) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient("api/penalties", {
        method: "POST",
        body: JSON.stringify(penaltyData),
      });
      
      if (!response || !response.penalizacion) {
        throw new Error("Invalid response structure from server");
      }
      
      setPenalties((prev) => [...prev, response.penalizacion]);
      setSuccessMessage("Penalty created successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Penalty name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to create penalty. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing penalty
  const updatePenalty = async (
    penaltyId: string,
    penaltyData: UpdatePenaltyData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient(`api/penalties/${penaltyId}`, {
        method: "PUT",
        body: JSON.stringify(penaltyData),
      });
      
      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.penalizacion) {
        throw new Error("Invalid response structure from server");
      }
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? response.penalizacion : p
        )
      );
      setSuccessMessage("Penalty updated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Penalty name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else if (errorInfo.isNotFoundError) {
        setFormErrors({ general: errorInfo.message || "Penalty not found" });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to update penalty. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular penalty
  const anularPenalty = async (penaltyId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/penalties/${penaltyId}/anular`,
        {
          method: "PATCH",
        }
      );
      
      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.penalizacion) {
        throw new Error("Invalid response structure from server");
      }
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? response.penalizacion : p
        )
      );
      setSuccessMessage("Penalty anulado successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Penalty not found"
          : errorInfo.isValidationError
          ? "Penalty is already anulado or invalid ID"
          : "Failed to anular penalty. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate penalty
  const activatePenalty = async (penaltyId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/penalties/${penaltyId}/activate`,
        {
          method: "PATCH",
        }
      );
      
      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.penalizacion) {
        throw new Error("Invalid response structure from server");
      }
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? response.penalizacion : p
        )
      );
      setSuccessMessage("Penalty activated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Penalty not found"
          : errorInfo.isValidationError
          ? "Penalty is already active or invalid ID"
          : "Failed to activate penalty. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPenalties();
  }, []);

  // Auto-ocultar mensajes de éxito después de 5 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleOpen = (
    type: "create" | "edit" | "toggle-status" | "view",
    penalty?: Penalty
  ) => {
    setSelectedPenalty(penalty || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedPenalty(null);
    setFormErrors({});
    setError(null);
    setDialogError(null);
    setSuccessMessage(null);
  };

  // Form validation
  const validateForm = (formData: any): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = "Name is required";
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const penaltyData = {
      name: formData.get("name") as string,
    };

    const errors = validateForm(penaltyData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (openDialog === "create") {
      await createPenalty(penaltyData);
    } else if (openDialog === "edit" && selectedPenalty) {
      await updatePenalty(
        selectedPenalty._id,
        penaltyData as UpdatePenaltyData
      );
    }
  };

  const stringLocaleSort =
    (locale = "es") =>
    (rowA: any, rowB: any, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  const columns: ColumnDef<Penalty>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Name
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "statusText",
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
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.original.status === 1
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {row.original.statusText || (row.original.status === 1 ? "Activo" : "Anulado")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="text-secondary border-secondary/50 hover:bg-secondary/10"
            onClick={() => handleOpen("view", row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => handleOpen("edit", row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.original.status === 1 ? (
            <Button
              size="icon"
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => handleOpen("toggle-status", row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpen("toggle-status", row.original)}
              disabled={isSubmitting}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penalties"
        subtitle="Manage penalties for enrollments"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add penalty
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:opacity-80 dark:text-destructive-foreground"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-secondary/10 border border-secondary/20 text-secondary dark:text-secondary-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-secondary hover:opacity-80 dark:text-secondary-foreground"
            aria-label="Close success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={penalties}
              searchKeys={["name"]}
              searchPlaceholder="Search penalties by name..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add penalty"}
              {openDialog === "edit" && "Edit penalty"}
              {openDialog === "view" && "Penalty Details"}
              {openDialog === "toggle-status" &&
                (selectedPenalty?.status === 1
                  ? "Anular penalty"
                  : "Activate penalty")}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Falta de asistencia, Retraso, etc."
                  defaultValue={selectedPenalty?.name || ""}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>
            </form>
          )}

          {openDialog === "view" && selectedPenalty && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Name</Label>
                  <p className="text-sm font-semibold">
                    {selectedPenalty.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedPenalty.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedPenalty.statusText ||
                      (selectedPenalty.status === 1 ? "Activo" : "Anulado")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {openDialog === "toggle-status" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                {selectedPenalty?.status === 1
                  ? "anular"
                  : "activate"}{" "}
                <strong>{selectedPenalty?.name}</strong>?
              </p>
            </div>
          )}

          {((openDialog === "create" || openDialog === "edit") && formErrors.general) ||
          (openDialog === "toggle-status" && dialogError) ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {openDialog === "toggle-status"
                  ? dialogError
                  : formErrors.general}
              </span>
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => handleClose()}
              disabled={isSubmitting}
            >
              {openDialog === "view" ? "Close" : "Cancel"}
            </Button>
            {openDialog !== "view" && (
              <Button
                variant={
                  openDialog === "toggle-status" &&
                  selectedPenalty?.status === 1
                    ? "destructive"
                    : "default"
                }
                disabled={isSubmitting}
                onClick={() => {
                  if (openDialog === "create" || openDialog === "edit") {
                    const form = document.querySelector("form");
                    if (form) form.requestSubmit();
                  } else if (
                    openDialog === "toggle-status" &&
                    selectedPenalty
                  ) {
                    if (selectedPenalty.status === 1) {
                      anularPenalty(selectedPenalty._id);
                    } else {
                      activatePenalty(selectedPenalty._id);
                    }
                  }
                }}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {openDialog === "create" && "Create"}
                {openDialog === "edit" && "Save changes"}
                {openDialog === "toggle-status" &&
                  (selectedPenalty?.status === 1
                    ? "Anular"
                    : "Activate")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

