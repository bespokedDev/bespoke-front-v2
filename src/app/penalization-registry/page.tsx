/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Eye,
  ArrowUpDown,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Ban,
  Check,
  ChevronsUpDown,
  Filter,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type {
  PenalizationRegistry,
  PenalizationRegistryFormData,
  PenalizationType,
  PenalizationLevel,
  EnrollmentBrief,
  ProfessorBrief,
  StudentBrief,
} from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

// NOTE: According to current documentation, there's no GET endpoint to list all penalization registries.
// We may need to create one or verify if it exists. For now, we'll structure the code assuming
// we'll need to implement it or use a different approach.
const INITIAL_FORM_DATA: PenalizationRegistryFormData = {
  idPenalizacion: "",
  idpenalizationLevel: null,
  enrollmentId: "",
  professorId: "",
  studentId: "",
  penalization_description: "",
  penalizationMoney: null,
  support_file: null,
  notification: 0,
  notification_description: "",
};

export default function PenalizationRegistryPage() {
  const [registries, setRegistries] = useState<PenalizationRegistry[]>([]);
  const [filteredRegistries, setFilteredRegistries] = useState<PenalizationRegistry[]>([]);
  const [penalizationTypes, setPenalizationTypes] = useState<PenalizationType[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<"create" | "view" | "toggle-status" | null>(null);
  const [selectedRegistry, setSelectedRegistry] = useState<PenalizationRegistry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PenalizationRegistryFormData>(INITIAL_FORM_DATA);
  
  // State for controlling Popover open/close
  const [openPopovers, setOpenPopovers] = useState({
    penalizationType: false,
    penalizationLevel: false,
    enrollment: false,
    professor: false,
    student: false,
  });

  // State for available penalization levels based on selected type
  const [availablePenalizationLevels, setAvailablePenalizationLevels] = useState<PenalizationLevel[]>([]);

  // Filter states
  const [filters, setFilters] = useState({
    penalizationType: "",
    entityType: "" as "" | "enrollment" | "professor" | "student",
    entityId: "",
    status: "" as "" | "1" | "0",
    startDate: "",
    endDate: "",
  });

  // State for filter popovers
  const [filterPopovers, setFilterPopovers] = useState({
    penalizationType: false,
    entityType: false,
    status: false,
  });

  // Fetch all data needed for the page
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all reference data in parallel
      const [penalizationTypesData, enrollmentsData, professorsData, studentsData] = await Promise.all([
        apiClient("api/penalties").catch(() => []), // Fetch penalty types
        apiClient("api/enrollments").catch(() => []), // Fetch enrollments
        apiClient("api/professors").catch(() => []), // Fetch professors
        apiClient("api/students").catch(() => []), // Fetch students
      ]);

      setPenalizationTypes(Array.isArray(penalizationTypesData) ? penalizationTypesData.filter((p: any) => p.status === 1) : []);
      
      const enrollmentsList = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      setEnrollments(enrollmentsList.map((e: any) => ({
        _id: e._id,
        alias: e.alias,
        language: e.language,
        enrollmentType: e.enrollmentType,
      })));

      const professorsList = Array.isArray(professorsData) ? professorsData : [];
      setProfessors(professorsList.map((p: any) => ({
        _id: p._id,
        name: p.name,
        email: p.email,
      })));

      const studentsList = Array.isArray(studentsData) ? studentsData : [];
      setStudents(studentsList.filter((s: any) => s.status === 1).map((s: any) => ({
        _id: s._id,
        name: s.name,
        studentCode: s.studentCode,
        email: s.email,
      })));

      // Fetch all penalization registries (admin only endpoint)
      // GET /api/penalization-registry - List all registries or filter by professorId/enrollmentId
      try {
        const registriesResponse = await apiClient("api/penalization-registry");
        // Response structure: { message, count, filters, penalizations: [...] }
        if (registriesResponse && typeof registriesResponse === "object" && "penalizations" in registriesResponse) {
          const penalizationsArray = Array.isArray(registriesResponse.penalizations) 
            ? registriesResponse.penalizations 
            : [];
          setRegistries(penalizationsArray);
          setFilteredRegistries(penalizationsArray);
        } else if (Array.isArray(registriesResponse)) {
          // Fallback: if response is directly an array
          setRegistries(registriesResponse);
          setFilteredRegistries(registriesResponse);
        } else {
          setRegistries([]);
          setFilteredRegistries([]);
        }
      } catch (registryErr: unknown) {
        // If endpoint doesn't exist or there's an error, handle gracefully
        const errorInfo = handleApiError(registryErr);
        console.error("Error fetching penalization registries:", errorInfo);
        setRegistries([]);
        // Only show error if it's not a 404 (endpoint doesn't exist)
        if (errorInfo.statusCode !== 404) {
          // Log the error but don't block the rest of the page
          console.warn("Failed to fetch penalization registries:", errorInfo.statusCode);
        }
      }
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load data. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-hide success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Apply filters
  useEffect(() => {
    let filtered = [...registries];

    // Filter by penalization type
    if (filters.penalizationType) {
      filtered = filtered.filter((r) => {
        const penaltyId = typeof r.idPenalizacion === "object" && r.idPenalizacion !== null
          ? r.idPenalizacion._id
          : String(r.idPenalizacion || "");
        return penaltyId === filters.penalizationType;
      });
    }

    // Filter by entity type and ID
    if (filters.entityType && filters.entityId) {
      if (filters.entityType === "enrollment") {
        filtered = filtered.filter((r) => {
          const enrollmentId = typeof r.enrollmentId === "object" && r.enrollmentId !== null
            ? r.enrollmentId._id
            : String(r.enrollmentId || "");
          return enrollmentId === filters.entityId;
        });
      } else if (filters.entityType === "professor") {
        filtered = filtered.filter((r) => {
          const professorId = typeof r.professorId === "object" && r.professorId !== null
            ? r.professorId._id
            : String(r.professorId || "");
          return professorId === filters.entityId;
        });
      } else if (filters.entityType === "student") {
        filtered = filtered.filter((r) => {
          const studentId = typeof r.studentId === "object" && r.studentId !== null
            ? r.studentId._id
            : String(r.studentId || "");
          return studentId === filters.entityId;
        });
      }
    }

    // Filter by status
    if (filters.status !== "") {
      const statusNum = filters.status === "1" ? 1 : 0;
      filtered = filtered.filter((r) => r.status === statusNum);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter((r) => {
        const createdDate = new Date(r.createdAt);
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        return createdDate >= startDate;
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter((r) => {
        const createdDate = new Date(r.createdAt);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        return createdDate <= endDate;
      });
    }

    setFilteredRegistries(filtered);
  }, [registries, filters]);

  const handleOpen = (type: "create" | "view" | "toggle-status", registry?: PenalizationRegistry) => {
    if (type === "create") {
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
      setDialogError(null);
    } else if (registry) {
      setSelectedRegistry(registry);
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedRegistry(null);
    setFormErrors({});
    setDialogError(null);
    setFormData(INITIAL_FORM_DATA);
    setAvailablePenalizationLevels([]);
    setOpenPopovers({
      penalizationType: false,
      penalizationLevel: false,
      enrollment: false,
      professor: false,
      student: false,
    });
  };

  // Form validation
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    // penalization_description is required
    if (!formData.penalization_description?.trim()) {
      errors.penalization_description = "Description is required";
    }

    // At least one entity must be selected
    if (!formData.enrollmentId && !formData.professorId && !formData.studentId) {
      errors.entity = "At least one entity (Enrollment, Professor, or Student) must be selected";
    }

    // If student is selected, penalizationMoney cannot be set
    if (formData.studentId && formData.penalizationMoney && formData.penalizationMoney > 0) {
      errors.penalizationMoney = "Penalization amount cannot be assigned to students";
    }

    // If notification is enabled, notification_description is required
    if (formData.notification === 1 && !formData.notification_description?.trim()) {
      errors.notification_description = "Notification description is required when notification is enabled";
    }

    // Validation: idpenalizationLevel requires idPenalizacion (as per API documentation)
    if (formData.idpenalizationLevel && !formData.idPenalizacion) {
      errors.idpenalizationLevel = "Penalization type is required when selecting a level";
    }

    return errors;
  };

  // Create penalization registry
  const createRegistry = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);

      // Build payload according to API documentation
      const payload: any = {
        penalization_description: formData.penalization_description.trim(),
        notification: formData.notification,
      };

      // Add optional fields only if they have values
      if (formData.idPenalizacion) {
        payload.idPenalizacion = formData.idPenalizacion;
      }

      // idpenalizationLevel: ObjectId del elemento dentro de penalizationLevels
      // Solo se envía si también se proporciona idPenalizacion
      if (formData.idPenalizacion && formData.idpenalizationLevel) {
        payload.idpenalizationLevel = formData.idpenalizationLevel;
      }

      if (formData.enrollmentId) {
        payload.enrollmentId = formData.enrollmentId;
      }

      if (formData.professorId) {
        payload.professorId = formData.professorId;
      }

      if (formData.studentId) {
        payload.studentId = formData.studentId;
        // Ensure penalizationMoney is not sent for students
        delete payload.penalizationMoney;
      } else if (formData.penalizationMoney !== null && formData.penalizationMoney !== undefined) {
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

      // Refresh the list to include the new registry
      // Re-fetch registries using the GET endpoint
      try {
        const registriesResponse = await apiClient("api/penalization-registry");
        if (registriesResponse && typeof registriesResponse === "object" && "penalizations" in registriesResponse) {
          const penalizationsArray = Array.isArray(registriesResponse.penalizations) 
            ? registriesResponse.penalizations 
            : [];
          setRegistries(penalizationsArray);
        } else if (Array.isArray(registriesResponse)) {
          setRegistries(registriesResponse);
        }
      } catch (refreshErr) {
        console.error("Failed to refresh registries list:", refreshErr);
        // Don't block the success flow if refresh fails
      }

      setSuccessMessage("Penalization registry created successfully");
      if (response.notification) {
        setSuccessMessage("Penalization registry and notification created successfully");
      }
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : "Failed to create penalization registry. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update status
  const updateStatus = async (registryId: string, newStatus: number) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);

      const response = await apiClient(`api/penalization-registry/${registryId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response || !response.penalizationRegistry) {
        throw new Error("Invalid response structure from server");
      }

      setRegistries((prev) =>
        prev.map((r) =>
          r._id === registryId ? response.penalizationRegistry : r
        )
      );
      setSuccessMessage(`Penalization registry ${newStatus === 1 ? "activated" : "deactivated"} successfully`);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Registry not found"
          : "Failed to update status. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function for sorting
  const stringLocaleSort = (locale = "es") => (rowA: any, rowB: any, columnId: string) => {
    const a = (rowA.getValue(columnId) ?? "").toString();
    const b = (rowB.getValue(columnId) ?? "").toString();
    return a.localeCompare(b, locale, {
      numeric: true,
      sensitivity: "base",
      ignorePunctuation: true,
    });
  };

  // Columns definition
  const columns: ColumnDef<PenalizationRegistry>[] = useMemo(() => [
    {
      accessorKey: "idPenalizacion",
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
        const penalty = registry.idPenalizacion;
        if (!penalty) return "N/A";
        
        const penaltyName = typeof penalty === "object" && penalty !== null 
          ? penalty.name 
          : String(penalty);
        
        // If there's a level, try to display it
        if (registry.idpenalizationLevel && typeof penalty === "object" && penalty !== null && penalty.penalizationLevels) {
          const level = penalty.penalizationLevels.find(
            (l: any) => l._id?.toString() === registry.idpenalizationLevel?.toString()
          );
          if (level) {
            return (
              <div className="flex flex-col">
                <span>{penaltyName}</span>
                <span className="text-xs text-muted-foreground">
                  {level.tipo} - Nivel {level.nivel}
                </span>
              </div>
            );
          }
        }
        
        return penaltyName;
      },
      sortingFn: stringLocaleSort(),
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => {
        const registry = row.original;
        if (registry.enrollmentId) {
          const enrollment = typeof registry.enrollmentId === "object" && registry.enrollmentId !== null
            ? registry.enrollmentId
            : null;
          return enrollment?.alias || "Enrollment";
        }
        if (registry.professorId) {
          const professor = typeof registry.professorId === "object" && registry.professorId !== null
            ? registry.professorId
            : null;
          return professor?.name || "Professor";
        }
        if (registry.studentId) {
          const student = typeof registry.studentId === "object" && registry.studentId !== null
            ? registry.studentId
            : null;
          return student?.name || "Student";
        }
        return "N/A";
      },
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
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  // Check if student is selected
  const isStudentSelected = !!formData.studentId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penalization Registry"
        subtitle="Manage penalization records for enrollments, professors, and students"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Penalization
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
            {/* Filters Section */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Penalization Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Penalization Type</Label>
                  <Popover
                    open={filterPopovers.penalizationType}
                    onOpenChange={(open) =>
                      setFilterPopovers((prev) => ({ ...prev, penalizationType: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <span className="text-left flex-1 truncate">
                          {filters.penalizationType
                            ? penalizationTypes.find((p) => p._id === filters.penalizationType)?.name || "Select..."
                            : "All types"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search type..." />
                        <CommandEmpty>No type found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, penalizationType: "" }));
                              setFilterPopovers((prev) => ({ ...prev, penalizationType: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.penalizationType === "" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            All types
                          </CommandItem>
                          {penalizationTypes.map((type) => (
                            <CommandItem
                              key={type._id}
                              value={type._id}
                              onSelect={() => {
                                setFilters((prev) => ({ ...prev, penalizationType: type._id }));
                                setFilterPopovers((prev) => ({ ...prev, penalizationType: false }));
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filters.penalizationType === type._id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {type.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Entity Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Entity Type</Label>
                  <Popover
                    open={filterPopovers.entityType}
                    onOpenChange={(open) =>
                      setFilterPopovers((prev) => ({ ...prev, entityType: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <span className="text-left flex-1 truncate">
                          {filters.entityType
                            ? filters.entityType.charAt(0).toUpperCase() + filters.entityType.slice(1)
                            : "All entities"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search entity..." />
                        <CommandEmpty>No entity found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, entityType: "", entityId: "" }));
                              setFilterPopovers((prev) => ({ ...prev, entityType: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.entityType === "" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            All entities
                          </CommandItem>
                          <CommandItem
                            value="enrollment"
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, entityType: "enrollment", entityId: "" }));
                              setFilterPopovers((prev) => ({ ...prev, entityType: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.entityType === "enrollment" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Enrollment
                          </CommandItem>
                          <CommandItem
                            value="professor"
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, entityType: "professor", entityId: "" }));
                              setFilterPopovers((prev) => ({ ...prev, entityType: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.entityType === "professor" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Professor
                          </CommandItem>
                          <CommandItem
                            value="student"
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, entityType: "student", entityId: "" }));
                              setFilterPopovers((prev) => ({ ...prev, entityType: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.entityType === "student" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Student
                          </CommandItem>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Entity Selection (conditional) */}
                {filters.entityType && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {filters.entityType.charAt(0).toUpperCase() + filters.entityType.slice(1)}
                    </Label>
                    <Popover
                      open={openPopovers[filters.entityType as keyof typeof openPopovers]}
                      onOpenChange={(open) =>
                        setOpenPopovers((prev) => ({
                          ...prev,
                          [filters.entityType]: open,
                        }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          <span className="text-left flex-1 truncate">
                            {filters.entityId
                              ? (() => {
                                  if (filters.entityType === "enrollment") {
                                    const entity = enrollments.find((e) => e._id === filters.entityId);
                                    return entity?.alias || entity?.language || "Select...";
                                  } else if (filters.entityType === "professor") {
                                    const entity = professors.find((p) => p._id === filters.entityId);
                                    return entity?.name || "Select...";
                                  } else if (filters.entityType === "student") {
                                    const entity = students.find((s) => s._id === filters.entityId);
                                    return entity?.name || "Select...";
                                  }
                                  return "Select...";
                                })()
                              : `Select ${filters.entityType}...`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput
                            placeholder={`Search ${filters.entityType}...`}
                          />
                          <CommandEmpty>No {filters.entityType} found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setFilters((prev) => ({ ...prev, entityId: "" }));
                                setOpenPopovers((prev) => ({
                                  ...prev,
                                  [filters.entityType]: false,
                                }));
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filters.entityId === "" ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              All {filters.entityType}s
                            </CommandItem>
                            {filters.entityType === "enrollment" &&
                              enrollments.map((enrollment) => (
                                <CommandItem
                                  key={enrollment._id}
                                  value={enrollment._id}
                                  onSelect={() => {
                                    setFilters((prev) => ({ ...prev, entityId: enrollment._id }));
                                    setOpenPopovers((prev) => ({
                                      ...prev,
                                      enrollment: false,
                                    }));
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      filters.entityId === enrollment._id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{enrollment.alias || `${enrollment.language} - ${enrollment.enrollmentType}`}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            {filters.entityType === "professor" &&
                              professors.map((professor) => (
                                <CommandItem
                                  key={professor._id}
                                  value={professor._id}
                                  onSelect={() => {
                                    setFilters((prev) => ({ ...prev, entityId: professor._id }));
                                    setOpenPopovers((prev) => ({
                                      ...prev,
                                      professor: false,
                                    }));
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      filters.entityId === professor._id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{professor.name}</span>
                                    <span className="text-xs text-muted-foreground">{professor.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            {filters.entityType === "student" &&
                              students.map((student) => (
                                <CommandItem
                                  key={student._id}
                                  value={student._id}
                                  onSelect={() => {
                                    setFilters((prev) => ({ ...prev, entityId: student._id }));
                                    setOpenPopovers((prev) => ({
                                      ...prev,
                                      student: false,
                                    }));
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      filters.entityId === student._id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{student.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {student.studentCode} - {student.email}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Popover
                    open={filterPopovers.status}
                    onOpenChange={(open) =>
                      setFilterPopovers((prev) => ({ ...prev, status: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <span className="text-left flex-1 truncate">
                          {filters.status === ""
                            ? "All statuses"
                            : filters.status === "1"
                            ? "Active"
                            : "Inactive"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandEmpty>No status found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, status: "" }));
                              setFilterPopovers((prev) => ({ ...prev, status: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.status === "" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            All statuses
                          </CommandItem>
                          <CommandItem
                            value="1"
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, status: "1" }));
                              setFilterPopovers((prev) => ({ ...prev, status: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.status === "1" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Active
                          </CommandItem>
                          <CommandItem
                            value="0"
                            onSelect={() => {
                              setFilters((prev) => ({ ...prev, status: "0" }));
                              setFilterPopovers((prev) => ({ ...prev, status: false }));
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                filters.status === "0" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Inactive
                          </CommandItem>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    max="9999-12-31"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    max="9999-12-31"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(filters.penalizationType ||
                filters.entityType ||
                filters.entityId ||
                filters.status !== "" ||
                filters.startDate ||
                filters.endDate) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({
                        penalizationType: "",
                        entityType: "",
                        entityId: "",
                        status: "",
                        startDate: "",
                        endDate: "",
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Results Count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredRegistries.length} of {registries.length} penalizations
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredRegistries}
              searchKeys={["penalization_description"]}
              searchPlaceholder="Search by description..."
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog === "create"} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Penalization Registry</DialogTitle>
            <DialogDescription>
              Create a new penalization record. At least one entity (Enrollment, Professor, or Student) must be selected.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRegistry();
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
                                // Map the levels and add _id if not present (it should be present from backend)
                                const levels = selectedType.penalizationLevels.map((level) => ({
                                  ...level,
                                  _id: (level as any)._id || level.tipo + "-" + level.nivel, // Fallback if _id is missing
                                }));
                                setAvailablePenalizationLevels(levels);
                              } else {
                                setAvailablePenalizationLevels([]);
                              }
                              setFormData((prev) => ({
                                ...prev,
                                idPenalizacion: penalty._id,
                                idpenalizationLevel: null, // Reset level when type changes
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

              {/* Penalization Level Selector - Only shown if a type is selected and has levels */}
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

            {/* Section: Entity Selection */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  Select Entity *
                </Label>
                <p className="text-xs text-muted-foreground">
                  At least one entity (Enrollment, Professor, or Student) must be selected
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Enrollment Select */}
                <div className="space-y-2">
                  <Label htmlFor="enrollmentId" className="text-sm font-medium">Enrollment</Label>
                  <Popover
                    open={openPopovers.enrollment}
                    onOpenChange={(open) =>
                      setOpenPopovers((prev) => ({ ...prev, enrollment: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers.enrollment}
                        className="w-full justify-between h-auto min-h-10"
                      >
                        <span className="text-left flex-1">
                          {formData.enrollmentId
                            ? enrollments.find((e) => e._id === formData.enrollmentId)?.alias || "Select..."
                            : "Select enrollment..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search enrollments..." />
                        <CommandEmpty>No enrollment found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                enrollmentId: "",
                              }));
                              setOpenPopovers((prev) => ({ ...prev, enrollment: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                !formData.enrollmentId ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            None
                          </CommandItem>
                          {enrollments.map((enrollment) => (
                            <CommandItem
                              key={enrollment._id}
                              value={enrollment._id}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  enrollmentId: enrollment._id,
                                }));
                                setOpenPopovers((prev) => ({ ...prev, enrollment: false }));
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  formData.enrollmentId === enrollment._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {enrollment.alias || `${enrollment.language} (${enrollment.enrollmentType})`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Professor Select */}
                <div className="space-y-2">
                  <Label htmlFor="professorId" className="text-sm font-medium">Professor</Label>
                  <Popover
                    open={openPopovers.professor}
                    onOpenChange={(open) =>
                      setOpenPopovers((prev) => ({ ...prev, professor: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers.professor}
                        className="w-full justify-between h-auto min-h-10"
                      >
                        <span className="text-left flex-1">
                          {formData.professorId
                            ? professors.find((p) => p._id === formData.professorId)?.name || "Select..."
                            : "Select professor..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search professors..." />
                        <CommandEmpty>No professor found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                professorId: "",
                              }));
                              setOpenPopovers((prev) => ({ ...prev, professor: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                !formData.professorId ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            None
                          </CommandItem>
                          {professors.map((professor) => (
                            <CommandItem
                              key={professor._id}
                              value={professor._id}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  professorId: professor._id,
                                }));
                                setOpenPopovers((prev) => ({ ...prev, professor: false }));
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  formData.professorId === professor._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {professor.name} ({professor.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Student Select */}
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-sm font-medium">Student</Label>
                  <Popover
                    open={openPopovers.student}
                    onOpenChange={(open) =>
                      setOpenPopovers((prev) => ({ ...prev, student: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPopovers.student}
                        className="w-full justify-between h-auto min-h-10"
                      >
                        <span className="text-left flex-1">
                          {formData.studentId
                            ? students.find((s) => s._id === formData.studentId)?.name || "Select..."
                            : "Select student..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search students..." />
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                studentId: "",
                                // Clear penalizationMoney when student is deselected
                              }));
                              setOpenPopovers((prev) => ({ ...prev, student: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                !formData.studentId ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            None
                          </CommandItem>
                          {students.map((student) => (
                            <CommandItem
                              key={student._id}
                              value={student._id}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  studentId: student._id,
                                  // Clear penalizationMoney when student is selected
                                  penalizationMoney: null,
                                }));
                                setOpenPopovers((prev) => ({ ...prev, student: false }));
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  formData.studentId === student._id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {student.name} ({student.studentCode})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {formErrors.entity && (
                <p className="text-sm text-destructive mt-2">{formErrors.entity}</p>
              )}
            </div>

            {/* Section: Details */}
            <div className="space-y-4 border-t pt-4">
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

              {/* Penalization Money - Disabled if student is selected */}
              <div className="space-y-2">
                <Label htmlFor="penalizationMoney">
                  Penalization Amount
                  {isStudentSelected && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Not available for students)
                    </span>
                  )}
                </Label>
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
                  disabled={isStudentSelected}
                  placeholder="e.g., 50.00"
                  className={formErrors.penalizationMoney ? "border-red-500" : ""}
                />
                {formErrors.penalizationMoney && (
                  <p className="text-sm text-destructive">{formErrors.penalizationMoney}</p>
                )}
                {isStudentSelected && (
                  <p className="text-xs text-muted-foreground">
                    Penalization amount cannot be assigned to students.
                  </p>
                )}
              </div>

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

            {/* Section: Notification */}
            <div className="space-y-4 border-t pt-4">
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
                <Label htmlFor="notification" className="font-normal cursor-pointer">
                  Create notification for this penalization
                </Label>
              </div>

              {/* Notification Description - Conditional */}
              {formData.notification === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="notification_description">
                    Notification Description *
                  </Label>
                  <Textarea
                    id="notification_description"
                    value={formData.notification_description || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notification_description: e.target.value,
                      }))
                    }
                    placeholder="Enter the notification description..."
                    rows={3}
                    className={formErrors.notification_description ? "border-red-500" : ""}
                  />
                  {formErrors.notification_description && (
                    <p className="text-sm text-destructive">{formErrors.notification_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This description will be used for the notification. If a monetary amount is specified, it will be automatically added to the notification.
                  </p>
                </div>
              )}
            </div>

            {dialogError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}

            {Object.keys(formErrors).length > 0 && !dialogError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm">
                Please correct the errors above before submitting.
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openDialog === "view"} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Penalization Registry Details</DialogTitle>
          </DialogHeader>

          {selectedRegistry && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Penalization Type</Label>
                  <p className="text-sm">
                    {selectedRegistry.idPenalizacion
                      ? typeof selectedRegistry.idPenalizacion === "object" && selectedRegistry.idPenalizacion !== null
                        ? selectedRegistry.idPenalizacion.name
                        : String(selectedRegistry.idPenalizacion)
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Entity</Label>
                  <p className="text-sm">
                    {selectedRegistry.enrollmentId
                      ? `Enrollment: ${typeof selectedRegistry.enrollmentId === "object" && selectedRegistry.enrollmentId !== null ? selectedRegistry.enrollmentId.alias : "N/A"}`
                      : selectedRegistry.professorId
                      ? `Professor: ${typeof selectedRegistry.professorId === "object" && selectedRegistry.professorId !== null ? selectedRegistry.professorId.name : "N/A"}`
                      : selectedRegistry.studentId
                      ? `Student: ${typeof selectedRegistry.studentId === "object" && selectedRegistry.studentId !== null ? selectedRegistry.studentId.name : "N/A"}`
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRegistry.penalization_description}</p>
                </div>

                {selectedRegistry.penalizationMoney !== null && selectedRegistry.penalizationMoney !== undefined && (
                  <div>
                    <Label className="text-sm font-semibold">Penalization Amount</Label>
                    <p className="text-sm">${selectedRegistry.penalizationMoney.toFixed(2)}</p>
                  </div>
                )}

                {selectedRegistry.support_file && (
                  <div>
                    <Label className="text-sm font-semibold">Support File</Label>
                    <p className="text-sm break-words">{selectedRegistry.support_file}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedRegistry.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedRegistry.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm">{formatDateForDisplay(selectedRegistry.createdAt)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Dialog */}
      <Dialog open={openDialog === "toggle-status"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRegistry?.status === 1 ? "Deactivate" : "Activate"} Penalization Registry
            </DialogTitle>
          </DialogHeader>

          {selectedRegistry && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to {selectedRegistry.status === 1 ? "deactivate" : "activate"} this penalization registry?
              </p>
            </div>
          )}

          {dialogError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={selectedRegistry?.status === 1 ? "destructive" : "default"}
              onClick={() => {
                if (selectedRegistry) {
                  updateStatus(selectedRegistry._id, selectedRegistry.status === 1 ? 0 : 1);
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedRegistry?.status === 1 ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

