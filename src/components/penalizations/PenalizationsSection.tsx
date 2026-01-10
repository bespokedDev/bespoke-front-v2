"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  AlertCircle,
  ClipboardList,
  Eye,
  Ban,
  Check,
  X,
} from "lucide-react";
import type {
  PenalizationRegistry,
  PenalizationType,
  PenalizationLevel,
} from "@/app/penalization-registry/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";

interface PenalizationsSectionProps {
  entityId: string;
  entityType: "professor" | "enrollment" | "student";
  entityName?: string; // For display purposes
}

export function PenalizationsSection({
  entityId,
  entityType,
  entityName,
}: PenalizationsSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [penalizations, setPenalizations] = useState<PenalizationRegistry[]>([]);
  const [penalizationTypes, setPenalizationTypes] = useState<PenalizationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    idPenalizacion: "",
    idpenalizationLevel: null as string | null,
    penalization_description: "",
    penalizationMoney: null as number | null,
    support_file: null as string | null,
    notification: 0,
    notification_description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [availablePenalizationLevels, setAvailablePenalizationLevels] = useState<PenalizationLevel[]>([]);
  const [openPopovers, setOpenPopovers] = useState({
    penalizationType: false,
    penalizationLevel: false,
  });

  // Fetch penalizations for this entity
  const fetchPenalizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build filter query parameter based on entity type
      let filterParam = "";
      switch (entityType) {
        case "professor":
          filterParam = `professorId=${entityId}`;
          break;
        case "enrollment":
          filterParam = `enrollmentId=${entityId}`;
          break;
        case "student":
          filterParam = `studentId=${entityId}`;
          break;
        default:
          filterParam = "";
      }

      const url = filterParam
        ? `api/penalization-registry?${filterParam}`
        : "api/penalization-registry";

      const response = await apiClient(url);

      if (response && typeof response === "object" && "penalizations" in response) {
        const penalizationsArray = Array.isArray(response.penalizations)
          ? response.penalizations
          : [];
        setPenalizations(penalizationsArray);
      } else if (Array.isArray(response)) {
        setPenalizations(response);
      } else {
        setPenalizations([]);
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      // If 404, it might mean no penalizations or endpoint not ready yet
      if (errorInfo.statusCode === 404) {
        setPenalizations([]);
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load penalizations. Please try again."
        );
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType]);

  // Fetch penalization types
  const fetchPenalizationTypes = useCallback(async () => {
    try {
      const data = await apiClient("api/penalties").catch(() => []);
      setPenalizationTypes(
        Array.isArray(data)
          ? data.filter((p: PenalizationType) => p.status === 1)
          : []
      );
    } catch (err) {
      console.error("Error fetching penalization types:", err);
    }
  }, []);

  useEffect(() => {
    if (entityId) {
      fetchPenalizations();
      fetchPenalizationTypes();
    }
  }, [entityId, entityType, fetchPenalizations, fetchPenalizationTypes]);

  const handleCreatePenalization = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    if (!formData.penalization_description.trim()) {
      errors.penalization_description = "Description is required";
    }
    if (formData.notification === 1 && !formData.notification_description.trim()) {
      errors.notification_description = "Notification description is required when notification is enabled";
    }
    if (formData.idpenalizationLevel && !formData.idPenalizacion) {
      errors.idpenalizationLevel = "Penalization type is required when selecting a level";
    }
    // If student is selected, penalizationMoney cannot be set
    if (entityType === "student" && formData.penalizationMoney && formData.penalizationMoney > 0) {
      errors.penalizationMoney = "Penalization amount cannot be assigned to students";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);

      // Build payload
      type CreatePenalizationPayload = {
        penalization_description: string;
        notification: number;
        professorId?: string;
        enrollmentId?: string;
        studentId?: string;
        idPenalizacion?: string;
        idpenalizationLevel?: string;
        penalizationMoney?: number;
        support_file?: string;
        notification_description?: string;
      };

      const payload: CreatePenalizationPayload = {
        penalization_description: formData.penalization_description.trim(),
        notification: formData.notification,
      };

      // Add entity reference based on type
      switch (entityType) {
        case "professor":
          payload.professorId = entityId;
          break;
        case "enrollment":
          payload.enrollmentId = entityId;
          break;
        case "student":
          payload.studentId = entityId;
          // Ensure penalizationMoney is not sent for students
          break;
      }

      // Add optional fields
      if (formData.idPenalizacion) {
        payload.idPenalizacion = formData.idPenalizacion;
      }

      if (formData.idPenalizacion && formData.idpenalizationLevel) {
        payload.idpenalizationLevel = formData.idpenalizationLevel;
      }

      // Only add penalizationMoney if not a student
      if (entityType !== "student" && formData.penalizationMoney !== null && formData.penalizationMoney !== undefined) {
        payload.penalizationMoney = formData.penalizationMoney;
      }

      if (formData.support_file?.trim()) {
        payload.support_file = formData.support_file.trim();
      }

      if (formData.notification === 1 && formData.notification_description) {
        payload.notification_description = formData.notification_description.trim();
      }

      const response = await apiClient("api/penalization-registry", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response || !response.penalizationRegistry) {
        throw new Error("Invalid response structure from server");
      }

      // Refresh the list
      await fetchPenalizations();
      setIsCreateDialogOpen(false);
      setFormData({
        idPenalizacion: "",
        idpenalizationLevel: null,
        penalization_description: "",
        penalizationMoney: null,
        support_file: null,
        notification: 0,
        notification_description: "",
      });
      setAvailablePenalizationLevels([]);
      setOpenPopovers({
        penalizationType: false,
        penalizationLevel: false,
      });
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : "Failed to create penalization. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (penalizationId: string, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await apiClient(`api/penalization-registry/${penalizationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchPenalizations();
    } catch (err: unknown) {
      console.error("Failed to update penalization status:", err);
    }
  };

  const getEntityDisplayName = () => {
    if (entityName) return entityName;
    switch (entityType) {
      case "professor":
        return "Professor";
      case "enrollment":
        return "Enrollment";
      case "student":
        return "Student";
      default:
        return "Entity";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Penalizations
        </CardTitle>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Penalization
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive py-4">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : penalizations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No penalizations found for this {getEntityDisplayName().toLowerCase()}.
          </p>
        ) : (
          <div className="space-y-3">
            {penalizations.map((penalization) => (
              <div
                key={penalization._id}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {penalization.idPenalizacion && (
                        <span className="font-semibold text-sm">
                          {typeof penalization.idPenalizacion === "object" && penalization.idPenalizacion !== null
                            ? penalization.idPenalizacion.name
                            : "Penalization"}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          penalization.status === 1
                            ? "bg-secondary/20 text-secondary"
                            : "bg-accent-1/20 text-accent-1"
                        }`}
                      >
                        {penalization.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {penalization.penalization_description}
                    </p>
                    {penalization.penalizationMoney !== null &&
                      penalization.penalizationMoney !== undefined && (
                        <p className="text-sm font-medium">
                          Amount: ${penalization.penalizationMoney.toFixed(2)}
                        </p>
                      )}
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDateForDisplay(penalization.createdAt)}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          router.push(`/penalization-registry?view=${penalization._id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {penalization.status === 1 ? (
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => handleToggleStatus(penalization._id, penalization.status)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-secondary border-secondary/50 hover:bg-secondary/10"
                          onClick={() => handleToggleStatus(penalization._id, penalization.status)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Penalization Dialog */}
      {isAdmin && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Penalization for {getEntityDisplayName()}</DialogTitle>
              <DialogDescription>
                Create a new penalization record for this {getEntityDisplayName().toLowerCase()}.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePenalization();
              }}
              className="space-y-6"
            >
              {/* Section: Penalization Type */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="idPenalizacion" className="text-base font-semibold">
                    Penalization Type
                  </Label>
                  <Popover
                    open={openPopovers.penalizationType}
                    onOpenChange={(open) =>
                      setOpenPopovers((prev) => ({ ...prev, penalizationType: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers.penalizationType}
                        className="w-full justify-between"
                      >
                        <span className="text-left flex-1">
                          {formData.idPenalizacion
                            ? penalizationTypes.find((p) => p._id === formData.idPenalizacion)?.name || "Select..."
                            : "Select penalization type..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search penalization types..." />
                        <CommandEmpty>No penalization type found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {penalizationTypes.map((penalty) => (
                            <CommandItem
                              key={penalty._id}
                              value={penalty._id}
                              onSelect={() => {
                                const selectedType = penalizationTypes.find((p) => p._id === penalty._id);
                                // Load penalizationLevels if available
                                if (selectedType?.penalizationLevels && selectedType.penalizationLevels.length > 0) {
                                  const levels: PenalizationLevel[] = selectedType.penalizationLevels.map((level) => ({
                                    ...level,
                                    _id: level._id || `${level.tipo}-${level.nivel}`,
                                  }));
                                  setAvailablePenalizationLevels(levels);
                                } else {
                                  setAvailablePenalizationLevels([]);
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  idPenalizacion: penalty._id,
                                  idpenalizationLevel: null,
                                }));
                                setOpenPopovers((prev) => ({ ...prev, penalizationType: false }));
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  formData.idPenalizacion === penalty._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {penalty.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Select the type of penalization to apply (optional)
                  </p>
                </div>

                {/* Penalization Level Selector */}
                {formData.idPenalizacion && availablePenalizationLevels.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="idpenalizationLevel" className="text-base font-semibold">
                      Penalization Level (optional)
                    </Label>
                    <Popover
                      open={openPopovers.penalizationLevel}
                      onOpenChange={(open) =>
                        setOpenPopovers((prev) => ({ ...prev, penalizationLevel: open }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPopovers.penalizationLevel}
                          className="w-full justify-between"
                        >
                          <span className="text-left flex-1">
                            {formData.idpenalizationLevel
                              ? (() => {
                                  const selectedLevel = availablePenalizationLevels.find(
                                    (l) => l._id === formData.idpenalizationLevel
                                  );
                                  return selectedLevel
                                    ? `${selectedLevel.tipo} - Nivel ${selectedLevel.nivel}${selectedLevel.description ? `: ${selectedLevel.description}` : ""}`
                                    : "Select level...";
                                })()
                              : "Select penalization level..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search levels..." />
                          <CommandEmpty>No level found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  idpenalizationLevel: null,
                                }));
                                setOpenPopovers((prev) => ({ ...prev, penalizationLevel: false }));
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  !formData.idpenalizationLevel ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              None
                            </CommandItem>
                            {availablePenalizationLevels.map((level) => (
                              <CommandItem
                                key={level._id}
                                value={level._id}
                                onSelect={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    idpenalizationLevel: level._id,
                                  }));
                                  setOpenPopovers((prev) => ({ ...prev, penalizationLevel: false }));
                                }}
                              >
                                <CheckCircle2
                                  className={`mr-2 h-4 w-4 ${
                                    formData.idpenalizationLevel === level._id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {level.tipo} - Nivel {level.nivel}
                                  </span>
                                  {level.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {level.description}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select a specific level for this penalization type (optional)
                    </p>
                    {formErrors.idpenalizationLevel && (
                      <p className="text-sm text-destructive">{formErrors.idpenalizationLevel}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" />

              {/* Section: Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Details</h3>

                {/* Description (required) */}
                <div className="space-y-2">
                  <Label htmlFor="penalization_description">
                    Description *
                  </Label>
                  <Textarea
                    id="penalization_description"
                    value={formData.penalization_description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        penalization_description: e.target.value,
                      }))
                    }
                    placeholder="Enter a detailed description of the penalization..."
                    rows={4}
                    className={formErrors.penalization_description ? "border-red-500" : ""}
                  />
                  {formErrors.penalization_description && (
                    <p className="text-sm text-destructive">{formErrors.penalization_description}</p>
                  )}
                </div>

                {/* Penalization Money - Disabled if student */}
                {entityType !== "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="penalizationMoney">Penalization Amount</Label>
                    <Input
                      id="penalizationMoney"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.penalizationMoney ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          penalizationMoney: value === "" ? null : parseFloat(value) || 0,
                        }));
                      }}
                      placeholder="e.g., 50.00"
                      className={formErrors.penalizationMoney ? "border-red-500" : ""}
                    />
                    {formErrors.penalizationMoney && (
                      <p className="text-sm text-destructive">{formErrors.penalizationMoney}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Amount of money for the penalization applied
                    </p>
                  </div>
                )}

                {/* Support File */}
                <div className="space-y-2">
                  <Label htmlFor="support_file">Support File URL</Label>
                  <Input
                    id="support_file"
                    type="text"
                    value={formData.support_file ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        support_file: e.target.value || null,
                      }))
                    }
                    placeholder="https://storage.example.com/files/evidence.pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL or identifier of the support file
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" />

              {/* Section: Notification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification</h3>

                {/* Notification Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notification"
                    checked={formData.notification === 1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notification: e.target.checked ? 1 : 0,
                        notification_description: e.target.checked ? prev.notification_description : "",
                      }))
                    }
                    className="rounded"
                  />
                  <Label htmlFor="notification" className="cursor-pointer">
                    Create notification
                  </Label>
                </div>

                {formData.notification === 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="notification_description">
                      Notification Description *
                    </Label>
                    <Textarea
                      id="notification_description"
                      value={formData.notification_description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notification_description: e.target.value,
                        }))
                      }
                      placeholder="Enter the notification message..."
                      rows={3}
                      className={formErrors.notification_description ? "border-red-500" : ""}
                    />
                    {formErrors.notification_description && (
                      <p className="text-sm text-destructive">{formErrors.notification_description}</p>
                    )}
                  </div>
                )}
              </div>

              {dialogError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <p>{dialogError}</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData({
                      idPenalizacion: "",
                      idpenalizationLevel: null,
                      penalization_description: "",
                      penalizationMoney: null,
                      support_file: null,
                      notification: 0,
                      notification_description: "",
                    });
                    setFormErrors({});
                    setDialogError(null);
                    setAvailablePenalizationLevels([]);
                    setOpenPopovers({
                      penalizationType: false,
                      penalizationLevel: false,
                    });
                  }}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>

          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

