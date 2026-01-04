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

interface ProfessorType {
  _id: string;
  name: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  status: number;
  statusText?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateProfessorTypeData {
  name: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
}

interface UpdateProfessorTypeData {
  name?: string;
  rates?: {
    single: number;
    couple: number;
    group: number;
  };
}

export default function ProfessorTypesPage() {
  const [professorTypes, setProfessorTypes] = useState<ProfessorType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "toggle-status" | "view" | null
  >(null);
  const [selectedProfessorType, setSelectedProfessorType] =
    useState<ProfessorType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch professor types from API
  const fetchProfessorTypes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/professor-types");
      setProfessorTypes(data || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load professor types. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new professor type
  const createProfessorType = async (
    professorTypeData: CreateProfessorTypeData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient("api/professor-types", {
        method: "POST",
        body: JSON.stringify(professorTypeData),
      });
      
      if (!response || !response.professorType) {
        throw new Error("Invalid response structure from server");
      }
      
      setProfessorTypes((prev) => [...prev, response.professorType]);
      setSuccessMessage("Professor type created successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Professor type name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to create professor type. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing professor type
  const updateProfessorType = async (
    professorTypeId: string,
    professorTypeData: UpdateProfessorTypeData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient(
        `api/professor-types/${professorTypeId}`,
        {
          method: "PUT",
          body: JSON.stringify(professorTypeData),
        }
      );
      
      if (!response || !response.professorType) {
        throw new Error("Invalid response structure from server");
      }
      
      setProfessorTypes((prev) =>
        prev.map((pt) =>
          pt._id === professorTypeId ? response.professorType : pt
        )
      );
      setSuccessMessage("Professor type updated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Professor type name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else if (errorInfo.isNotFoundError) {
        setFormErrors({ general: errorInfo.message || "Professor type not found" });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to update professor type. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular professor type
  const anularProfessorType = async (professorTypeId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/professor-types/${professorTypeId}/anular`,
        {
          method: "PATCH",
        }
      );
      
      if (!response || !response.professorType) {
        throw new Error("Invalid response structure from server");
      }
      
      setProfessorTypes((prev) =>
        prev.map((pt) =>
          pt._id === professorTypeId ? response.professorType : pt
        )
      );
      setSuccessMessage("Professor type anulado successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Professor type not found"
          : errorInfo.isValidationError
          ? "Professor type is already anulado or invalid ID"
          : "Failed to anular professor type. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate professor type
  const activateProfessorType = async (professorTypeId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/professor-types/${professorTypeId}/activate`,
        {
          method: "PATCH",
        }
      );
      
      if (!response || !response.professorType) {
        throw new Error("Invalid response structure from server");
      }
      
      setProfessorTypes((prev) =>
        prev.map((pt) =>
          pt._id === professorTypeId ? response.professorType : pt
        )
      );
      setSuccessMessage("Professor type activated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Professor type not found"
          : errorInfo.isValidationError
          ? "Professor type is already active or invalid ID"
          : "Failed to activate professor type. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProfessorTypes();
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
    professorType?: ProfessorType
  ) => {
    setSelectedProfessorType(professorType || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedProfessorType(null);
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

    if (!formData.rates) {
      errors.rates = "Rates are required";
    } else {
      if (formData.rates.single === undefined || formData.rates.single === null || formData.rates.single === "") {
        errors.single = "Single rate is required";
      } else if (isNaN(Number(formData.rates.single)) || Number(formData.rates.single) < 0) {
        errors.single = "Single rate must be a number greater than or equal to 0";
      }

      if (formData.rates.couple === undefined || formData.rates.couple === null || formData.rates.couple === "") {
        errors.couple = "Couple rate is required";
      } else if (isNaN(Number(formData.rates.couple)) || Number(formData.rates.couple) < 0) {
        errors.couple = "Couple rate must be a number greater than or equal to 0";
      }

      if (formData.rates.group === undefined || formData.rates.group === null || formData.rates.group === "") {
        errors.group = "Group rate is required";
      } else if (isNaN(Number(formData.rates.group)) || Number(formData.rates.group) < 0) {
        errors.group = "Group rate must be a number greater than or equal to 0";
      }
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const professorTypeData = {
      name: formData.get("name") as string,
      rates: {
        single: Number(formData.get("single")),
        couple: Number(formData.get("couple")),
        group: Number(formData.get("group")),
      },
    };

    const errors = validateForm(professorTypeData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (openDialog === "create") {
      await createProfessorType(professorTypeData as CreateProfessorTypeData);
    } else if (openDialog === "edit" && selectedProfessorType) {
      // En edición, solo enviar los campos que se proporcionaron
      const updateData: UpdateProfessorTypeData = {};
      if (professorTypeData.name !== selectedProfessorType.name) {
        updateData.name = professorTypeData.name;
      }
      if (
        professorTypeData.rates.single !== selectedProfessorType.rates.single ||
        professorTypeData.rates.couple !== selectedProfessorType.rates.couple ||
        professorTypeData.rates.group !== selectedProfessorType.rates.group
      ) {
        updateData.rates = professorTypeData.rates;
      }
      
      // Se requiere al menos name o rates
      if (Object.keys(updateData).length === 0) {
        setFormErrors({ general: "No changes detected" });
        return;
      }
      
      await updateProfessorType(selectedProfessorType._id, updateData);
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

  const columns: ColumnDef<ProfessorType>[] = [
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
      id: "rates",
      header: "Rates",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-sm">
          <span>Single: ${row.original.rates.single.toFixed(2)}</span>
          <span>Couple: ${row.original.rates.couple.toFixed(2)}</span>
          <span>Group: ${row.original.rates.group.toFixed(2)}</span>
        </div>
      ),
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
              className="text-red-600 border-red-600/50 hover:bg-red-600/10"
              onClick={() => handleOpen("toggle-status", row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-green-600 border-green-600/50 hover:bg-green-600/10"
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
        title="Professor Types"
        subtitle="Manage professor types and their rates"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add professor type
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
              data={professorTypes}
              searchKeys={["name"]}
              searchPlaceholder="Search professor types by name..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add professor type"}
              {openDialog === "edit" && "Edit professor type"}
              {openDialog === "view" && "Professor Type Details"}
              {openDialog === "toggle-status" &&
                (selectedProfessorType?.status === 1
                  ? "Anular professor type"
                  : "Activate professor type")}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Senior, Junior, Assistant"
                  defaultValue={selectedProfessorType?.name || ""}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Rates ($/hour) *</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="single" className="text-sm font-normal">
                      Single Class Rate
                    </Label>
                    <Input
                      id="single"
                      name="single"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={selectedProfessorType?.rates.single || ""}
                      className={formErrors.single ? "border-red-500" : ""}
                    />
                    {formErrors.single && (
                      <p className="text-red-500 text-sm">{formErrors.single}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couple" className="text-sm font-normal">
                      Couple Class Rate
                    </Label>
                    <Input
                      id="couple"
                      name="couple"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={selectedProfessorType?.rates.couple || ""}
                      className={formErrors.couple ? "border-red-500" : ""}
                    />
                    {formErrors.couple && (
                      <p className="text-red-500 text-sm">{formErrors.couple}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group" className="text-sm font-normal">
                      Group Class Rate
                    </Label>
                    <Input
                      id="group"
                      name="group"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={selectedProfessorType?.rates.group || ""}
                      className={formErrors.group ? "border-red-500" : ""}
                    />
                    {formErrors.group && (
                      <p className="text-red-500 text-sm">{formErrors.group}</p>
                    )}
                  </div>
                </div>
                {formErrors.rates && (
                  <p className="text-red-500 text-sm">{formErrors.rates}</p>
                )}
              </div>
            </form>
          )}

          {openDialog === "view" && selectedProfessorType && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Name</Label>
                  <p className="text-sm font-semibold">
                    {selectedProfessorType.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Rates</Label>
                  <div className="flex flex-col gap-1 text-sm mt-1">
                    <span>Single: ${selectedProfessorType.rates.single.toFixed(2)}/hour</span>
                    <span>Couple: ${selectedProfessorType.rates.couple.toFixed(2)}/hour</span>
                    <span>Group: ${selectedProfessorType.rates.group.toFixed(2)}/hour</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedProfessorType.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedProfessorType.statusText ||
                      (selectedProfessorType.status === 1 ? "Activo" : "Anulado")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {openDialog === "toggle-status" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                {selectedProfessorType?.status === 1
                  ? "anular"
                  : "activate"}{" "}
                <strong>{selectedProfessorType?.name}</strong>?
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
                  selectedProfessorType?.status === 1
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
                    selectedProfessorType
                  ) {
                    if (selectedProfessorType.status === 1) {
                      anularProfessorType(selectedProfessorType._id);
                    } else {
                      activateProfessorType(selectedProfessorType._id);
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
                  (selectedProfessorType?.status === 1
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

