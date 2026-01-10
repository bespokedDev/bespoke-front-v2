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
  Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";

import type { PenalizationLevel } from "@/app/penalization-registry/types";

interface PenalizationLevelFormData {
  tipo: string;
  nivel: number;
  description?: string;
}

// Initialize form data helper
const createEmptyLevel = (): PenalizationLevelFormData => ({
  tipo: "",
  nivel: 1,
  description: "",
});

interface Penalty {
  _id: string;
  name: string;
  penalizationLevels?: PenalizationLevel[];
  status: number;
  statusText: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatePenaltyData {
  name: string;
  penalizationLevels?: PenalizationLevelFormData[];
}

interface UpdatePenaltyData {
  name: string;
  penalizationLevels?: PenalizationLevelFormData[];
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

  // State for managing penalization levels in the form
  const [penalizationLevels, setPenalizationLevels] = useState<PenalizationLevelFormData[]>([]);
  const [levelErrors, setLevelErrors] = useState<Record<number, Record<string, string>>>({});

  // Fetch penalties from API
  const fetchPenalties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/penalties");
      // Ensure penalizationLevels are properly mapped
      const penaltiesData = Array.isArray(data) ? data : [];
      const mappedPenalties: Penalty[] = penaltiesData.map((penalty: any) => ({
        _id: penalty._id,
        name: penalty.name,
        penalizationLevels: Array.isArray(penalty.penalizationLevels)
          ? penalty.penalizationLevels.map((level: any) => ({
              _id: level._id || level.tipo + "-" + level.nivel,
              tipo: level.tipo,
              nivel: level.nivel,
              description: level.description || undefined,
            }))
          : [],
        status: penalty.status,
        statusText: penalty.status === 1 ? "Active" : "Deactivated",
        createdAt: penalty.createdAt,
        updatedAt: penalty.updatedAt,
      }));
      setPenalties(mappedPenalties);
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
      
      const createdPenalty = response.penalizacion;
      const newPenalty: Penalty = {
        _id: createdPenalty._id,
        name: createdPenalty.name,
        penalizationLevels: Array.isArray(createdPenalty.penalizationLevels)
          ? createdPenalty.penalizationLevels.map((level: any) => ({
              _id: level._id || level.tipo + "-" + level.nivel,
              tipo: level.tipo,
              nivel: level.nivel,
              description: level.description || undefined,
            }))
          : [],
        status: createdPenalty.status,
        statusText: createdPenalty.status === 1 ? "Active" : "Deactivated",
        createdAt: createdPenalty.createdAt,
        updatedAt: createdPenalty.updatedAt,
      };
      
      setPenalties((prev) => [...prev, newPenalty]);
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
      
      const updatedPenaltyResponse = response.penalizacion;
      const updatedPenalty: Penalty = {
        _id: updatedPenaltyResponse._id,
        name: updatedPenaltyResponse.name,
        penalizationLevels: Array.isArray(updatedPenaltyResponse.penalizationLevels)
          ? updatedPenaltyResponse.penalizationLevels.map((level: any) => ({
              _id: level._id || level.tipo + "-" + level.nivel,
              tipo: level.tipo,
              nivel: level.nivel,
              description: level.description || undefined,
            }))
          : [],
        status: updatedPenaltyResponse.status,
        statusText: updatedPenaltyResponse.status === 1 ? "Active" : "Deactivated",
        createdAt: updatedPenaltyResponse.createdAt,
        updatedAt: updatedPenaltyResponse.updatedAt,
      };
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? updatedPenalty : p
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
      
      const penaltyData = response.penalizacion;
      const deactivatedPenalty: Penalty = {
        _id: penaltyData._id,
        name: penaltyData.name,
        penalizationLevels: Array.isArray(penaltyData.penalizationLevels)
          ? penaltyData.penalizationLevels.map((level: any) => ({
              _id: level._id || level.tipo + "-" + level.nivel,
              tipo: level.tipo,
              nivel: level.nivel,
              description: level.description || undefined,
            }))
          : [],
        status: penaltyData.status,
        statusText: "Deactivated",
        createdAt: penaltyData.createdAt,
        updatedAt: penaltyData.updatedAt,
      };
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? deactivatedPenalty : p
        )
      );
      setSuccessMessage("Penalty deactivated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Penalty not found"
          : errorInfo.isValidationError
          ? "Penalty is already deactivated or invalid ID"
          : "Failed to deactivate penalty. Please try again."
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
      
      const penaltyData = response.penalizacion;
      const activatedPenalty: Penalty = {
        _id: penaltyData._id,
        name: penaltyData.name,
        penalizationLevels: Array.isArray(penaltyData.penalizationLevels)
          ? penaltyData.penalizationLevels.map((level: any) => ({
              _id: level._id || level.tipo + "-" + level.nivel,
              tipo: level.tipo,
              nivel: level.nivel,
              description: level.description || undefined,
            }))
          : [],
        status: penaltyData.status,
        statusText: "Active",
        createdAt: penaltyData.createdAt,
        updatedAt: penaltyData.updatedAt,
      };
      
      setPenalties((prev) =>
        prev.map((p) =>
          p._id === penaltyId ? activatedPenalty : p
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

  // Auto-hide success messages after 5 seconds
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
    if (type === "create") {
      setPenalizationLevels([]);
      setLevelErrors({});
    } else if (type === "edit" && penalty) {
      // Pre-fill levels from existing penalty
      const levels = penalty.penalizationLevels?.map((level) => ({
        tipo: level.tipo,
        nivel: level.nivel,
        description: level.description || "",
      })) || [];
      setPenalizationLevels(levels);
      setLevelErrors({});
    } else if (type === "view" && penalty) {
      // Just display, don't modify
      setPenalizationLevels([]);
      setLevelErrors({});
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedPenalty(null);
    setFormErrors({});
    setError(null);
    setDialogError(null);
    setSuccessMessage(null);
    setPenalizationLevels([]);
    setLevelErrors({});
  };

  // Add a new level
  const addLevel = () => {
    setPenalizationLevels((prev) => [...prev, createEmptyLevel()]);
  };

  // Remove a level by index
  const removeLevel = (index: number) => {
    setPenalizationLevels((prev) => prev.filter((_, i) => i !== index));
    setLevelErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      // Reindex errors for levels after the removed one
      const reindexed: Record<number, Record<string, string>> = {};
      Object.keys(newErrors).forEach((key) => {
        const oldIndex = parseInt(key);
        if (oldIndex < index) {
          reindexed[oldIndex] = newErrors[oldIndex];
        } else if (oldIndex > index) {
          reindexed[oldIndex - 1] = newErrors[oldIndex];
        }
      });
      return reindexed;
    });
  };

  // Update a level field
  const updateLevel = (index: number, field: keyof PenalizationLevelFormData, value: string | number) => {
    setPenalizationLevels((prev) =>
      prev.map((level, i) => (i === index ? { ...level, [field]: value } : level))
    );
    // Clear error for this field if it exists
    if (levelErrors[index]?.[field]) {
      setLevelErrors((prev) => {
        const levelError = { ...prev[index] };
        delete levelError[field];
        return { ...prev, [index]: levelError };
      });
    }
  };

  // Validate penalization levels
  const validateLevels = (): boolean => {
    const errors: Record<number, Record<string, string>> = {};
    let hasErrors = false;

    penalizationLevels.forEach((level, index) => {
      const levelError: Record<string, string> = {};

      if (!level.tipo?.trim()) {
        levelError.tipo = "Type is required";
        hasErrors = true;
      }

      if (!level.nivel || level.nivel < 1) {
        levelError.nivel = "Level must be at least 1";
        hasErrors = true;
      }

      if (levelError.tipo || levelError.nivel) {
        errors[index] = levelError;
      }
    });

    setLevelErrors(errors);
    return !hasErrors;
  };

  // Form validation
  const validateForm = (formData: any): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = "Name is required";
    }

    // Validate levels if any exist
    if (penalizationLevels.length > 0) {
      const levelsValid = validateLevels();
      if (!levelsValid) {
        errors.levels = "Please fix all level errors";
      }
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const penaltyData: CreatePenaltyData | UpdatePenaltyData = {
      name: formData.get("name") as string,
    };

    // Include penalizationLevels if any exist
    if (penalizationLevels.length > 0) {
      penaltyData.penalizationLevels = penalizationLevels.map((level) => ({
        tipo: level.tipo.trim(),
        nivel: level.nivel,
        description: level.description?.trim() || undefined,
      }));
    }

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
      id: "penalizationLevels",
      header: "Levels",
      cell: ({ row }) => {
        const levels = row.original.penalizationLevels || [];
        if (levels.length === 0) {
          return <span className="text-sm text-muted-foreground">No levels</span>;
        }
        const uniqueTypes = new Set(levels.map((l) => l.tipo));
        return (
          <div className="space-y-1">
            <span className="text-sm font-medium">{levels.length} level(s)</span>
            <div className="flex flex-wrap gap-1">
              {Array.from(uniqueTypes).map((tipo) => (
                <span
                  key={tipo}
                  className="px-2 py-0.5 bg-secondary/20 text-secondary rounded text-xs"
                >
                  {tipo}
                </span>
              ))}
            </div>
          </div>
        );
      },
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
          {row.original.statusText || (row.original.status === 1 ? "Active" : "Deactivated")}
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add penalty"}
              {openDialog === "edit" && "Edit penalty"}
              {openDialog === "view" && "Penalty Details"}
              {openDialog === "toggle-status" &&
                (selectedPenalty?.status === 1
                  ? "Deactivate penalty"
                  : "Activate penalty")}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Absence, Tardiness, etc."
                  defaultValue={selectedPenalty?.name || ""}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" />

              {/* Penalization Levels Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Penalization Levels (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLevel}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Level
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add levels to this penalty type. Each level must have a type (string) and level number (≥ 1).
                  Description is optional.
                </p>

                {penalizationLevels.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No levels added. Click &apos;Add Level&apos; to create one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {penalizationLevels.map((level, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-sm">Level {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLevel(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`level-${index}-tipo`}>
                              Type <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`level-${index}-tipo`}
                              value={level.tipo}
                              onChange={(e) => updateLevel(index, "tipo", e.target.value)}
                              placeholder="e.g., Warning, Severe, etc."
                              className={levelErrors[index]?.tipo ? "border-red-500" : ""}
                            />
                            {levelErrors[index]?.tipo && (
                              <p className="text-red-500 text-xs">{levelErrors[index].tipo}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`level-${index}-nivel`}>
                              Level Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`level-${index}-nivel`}
                              type="number"
                              min="1"
                              value={level.nivel || ""}
                              onChange={(e) =>
                                updateLevel(index, "nivel", parseInt(e.target.value) || 1)
                              }
                              placeholder="1"
                              className={levelErrors[index]?.nivel ? "border-red-500" : ""}
                            />
                            {levelErrors[index]?.nivel && (
                              <p className="text-red-500 text-xs">{levelErrors[index].nivel}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`level-${index}-description`}>Description</Label>
                            <Input
                              id={`level-${index}-description`}
                              value={level.description || ""}
                              onChange={(e) => updateLevel(index, "description", e.target.value)}
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {formErrors.levels && (
                  <p className="text-red-500 text-sm">{formErrors.levels}</p>
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
                      (selectedPenalty.status === 1 ? "Active" : "Deactivated")}
                  </span>
                </div>
                {selectedPenalty.penalizationLevels && selectedPenalty.penalizationLevels.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Penalization Levels ({selectedPenalty.penalizationLevels.length})
                    </Label>
                    <div className="space-y-3">
                      {selectedPenalty.penalizationLevels.map((level, index) => (
                        <Card key={index} className="p-3 bg-accent/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">Type</Label>
                              <p className="font-medium">{level.tipo}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Level</Label>
                              <p className="font-medium">Nivel {level.nivel}</p>
                            </div>
                            {level.description && (
                              <div className="md:col-span-3">
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <p className="text-sm">{level.description}</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {openDialog === "toggle-status" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                {selectedPenalty?.status === 1
                  ? "deactivate"
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
                    ? "Deactivate"
                    : "Activate")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

