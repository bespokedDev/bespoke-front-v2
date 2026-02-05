"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Eye,
  Pencil,
  ArrowUpDown,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Ban,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type {
  Notification,
  NotificationFormData,
  NotificationCategory,
  NotificationPenalization,
  NotificationEnrollment,
  NotificationProfessor,
  NotificationStudent,
  CategoryNotificationsResponse,
  PenalizationApiResponse,
  EnrollmentApiResponse,
  ProfessorApiResponse,
  StudentApiResponse,
  CreateNotificationPayload,
  UpdateNotificationPayload,
  NotificationCreateResponse,
  NotificationUpdateResponse,
} from "./types";
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

const INITIAL_FORM_DATA: NotificationFormData = {
  idCategoryNotification: "",
  notification_description: "",
  idPenalization: null,
  idEnrollment: null,
  idProfessor: null,
  idStudent: null,
  isActive: true,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [penalizations, setPenalizations] = useState<NotificationPenalization[]>([]);
  const [enrollments, setEnrollments] = useState<NotificationEnrollment[]>([]);
  const [professors, setProfessors] = useState<NotificationProfessor[]>([]);
  const [students, setStudents] = useState<NotificationStudent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<"create" | "edit" | "view" | "toggle-status" | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>(INITIAL_FORM_DATA);

  // State for controlling Popover open/close
  const [openPopovers, setOpenPopovers] = useState({
    category: false,
    penalization: false,
    enrollment: false,
    professor: false,
    student: false,
  });

  // State for filter popovers
  const [filterPopovers, setFilterPopovers] = useState({
    category: false,
    status: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    penalization: "",
    enrollment: "",
    professor: "",
    student: "",
    isActive: "" as string | "" | "true" | "false",
  });

  // Fetch notifications with optional filters
  const fetchNotifications = useCallback(async () => {
    try {
      // Build query string for filters
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append("idCategoryNotification", filters.category);
      if (filters.penalization) queryParams.append("idPenalization", filters.penalization);
      if (filters.enrollment) queryParams.append("idEnrollment", filters.enrollment);
      if (filters.professor) queryParams.append("idProfessor", filters.professor);
      if (filters.student) queryParams.append("idStudent", filters.student);
      if (filters.isActive !== "") queryParams.append("isActive", filters.isActive);

      const queryString = queryParams.toString();
      const url = queryString ? `api/notifications?${queryString}` : "api/notifications";

      const response = await apiClient(url);

      // Handle different response structures
      interface NotificationsResponse {
        notifications?: Notification[];
      }
      
      if (response && typeof response === "object" && "notifications" in response) {
        const responseData = response as NotificationsResponse;
        const notificationsArray = Array.isArray(responseData.notifications)
          ? responseData.notifications
          : [];
        setNotifications(notificationsArray);
      } else if (Array.isArray(response)) {
        setNotifications(response as Notification[]);
      } else {
        setNotifications([]);
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      if (errorInfo.statusCode !== 404) {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load notifications. Please try again."
        );
        setError(errorMessage);
      } else {
        setNotifications([]);
      }
    }
  }, [filters]);

  // Fetch all data needed for the page
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all reference data in parallel
      const [categoriesData, penalizationsData, enrollmentsData, professorsData, studentsData] = await Promise.all([
        apiClient("api/category-notifications").catch(() => []),
        apiClient("api/penalties").catch(() => []),
        apiClient("api/enrollments").catch(() => []),
        apiClient("api/professors").catch(() => []),
        apiClient("api/students").catch(() => []),
      ]);
      console.log("categoriesData", categoriesData);

      // Process categories
      // La API devuelve { message: string, count: number, categoryNotifications: NotificationCategory[] }
      const response = categoriesData as CategoryNotificationsResponse;
      
      if (response && response.categoryNotifications && Array.isArray(response.categoryNotifications)) {
        setCategories(response.categoryNotifications.filter((c) => c.isActive));
      } else {
        setCategories([]);
      }

      // Process penalizations
      const penalizationsList = Array.isArray(penalizationsData) ? (penalizationsData as PenalizationApiResponse[]) : [];
      setPenalizations(
        penalizationsList
          .filter((p) => p.status === 1)
          .map((p) => ({
            _id: p._id,
            name: p.name,
            description: p.description || null,
          }))
      );

      // Process enrollments
      const enrollmentsList = Array.isArray(enrollmentsData) ? (enrollmentsData as EnrollmentApiResponse[]) : [];
      setEnrollments(
        enrollmentsList.map((e) => ({
          _id: e._id,
          alias: e.alias || null,
          language: e.language,
          enrollmentType: e.enrollmentType,
        }))
      );

      // Process professors
      const professorsList = Array.isArray(professorsData) ? (professorsData as ProfessorApiResponse[]) : [];
      setProfessors(
        professorsList.map((p) => ({
          _id: p._id,
          name: p.name,
          email: p.email,
          phone: p.phone || undefined,
        }))
      );

      // Process students
      const studentsList = Array.isArray(studentsData) ? (studentsData as StudentApiResponse[]) : [];
      setStudents(
        studentsList
          .filter((s) => s.status === 1)
          .map((s) => ({
            _id: s._id,
            name: s.name,
            studentCode: s.studentCode,
            email: s.email,
            phone: s.phone || undefined,
          }))
      );

      // Fetch all notifications (admin only endpoint)
      await fetchNotifications();
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(err, "Failed to load data. Please try again.");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Refetch notifications when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchNotifications();
    }
  }, [filters, isLoading, fetchNotifications]);

  // Auto-hide success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleOpen = (
    type: "create" | "edit" | "view" | "toggle-status",
    notification?: Notification
  ) => {
    if (type === "create") {
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
      setDialogError(null);
    } else if (notification) {
      setSelectedNotification(notification);
      if (type === "edit") {
        // Pre-fill form data for editing
        setFormData({
          idCategoryNotification: notification.idCategoryNotification._id,
          notification_description: notification.notification_description,
          idPenalization: notification.idPenalization?._id || null,
          idEnrollment: notification.idEnrollment?._id || null,
          idProfessor: notification.idProfessor?._id || null,
          idStudent: Array.isArray(notification.idStudent)
            ? notification.idStudent.map((s) => s._id)
            : notification.idStudent?._id || null,
          isActive: notification.isActive,
        });
      }
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedNotification(null);
    setFormErrors({});
    setDialogError(null);
    setFormData(INITIAL_FORM_DATA);
    setOpenPopovers({
      category: false,
      penalization: false,
      enrollment: false,
      professor: false,
      student: false,
    });
  };

  // Form validation
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.idCategoryNotification?.trim()) {
      errors.idCategoryNotification = "Category is required";
    }

    if (!formData.notification_description?.trim()) {
      errors.notification_description = "Description is required";
    }

    return errors;
  };

  // Create notification
  const createNotification = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);

      // Build payload
      const payload: CreateNotificationPayload = {
        idCategoryNotification: formData.idCategoryNotification,
        notification_description: formData.notification_description.trim(),
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      // Add optional entity references
      if (formData.idPenalization) {
        payload.idPenalization = formData.idPenalization;
      }

      if (formData.idEnrollment) {
        payload.idEnrollment = formData.idEnrollment;
      }

      if (formData.idProfessor) {
        payload.idProfessor = formData.idProfessor;
      }

      if (formData.idStudent) {
        payload.idStudent = Array.isArray(formData.idStudent)
          ? formData.idStudent
          : [formData.idStudent];
      }

      const response = await apiClient("api/notifications", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as NotificationCreateResponse;

      if (!response || !response.notification) {
        throw new Error("Invalid response structure from server");
      }

      await fetchNotifications();
      setSuccessMessage("Notification created successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : "Failed to create notification. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update notification
  const updateNotification = async () => {
    if (!selectedNotification) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);

      // Build payload
      const payload: UpdateNotificationPayload = {
        idCategoryNotification: formData.idCategoryNotification,
        notification_description: formData.notification_description.trim(),
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        idPenalization: formData.idPenalization || null,
        idEnrollment: formData.idEnrollment || null,
        idProfessor: formData.idProfessor || null,
        idStudent: formData.idStudent
          ? Array.isArray(formData.idStudent)
            ? formData.idStudent
            : [formData.idStudent]
          : null,
      };

      const response = await apiClient(`api/notifications/${selectedNotification._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }) as NotificationUpdateResponse;

      if (!response || !response.notification) {
        throw new Error("Invalid response structure from server");
      }

      await fetchNotifications();
      setSuccessMessage("Notification updated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : errorInfo.isNotFoundError
          ? "Notification not found"
          : "Failed to update notification. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular notification
  const anularNotification = async () => {
    if (!selectedNotification) return;

    try {
      setIsSubmitting(true);
      setDialogError(null);

      await apiClient(`api/notifications/${selectedNotification._id}/anular`, {
        method: "PATCH",
      });

      await fetchNotifications();
      setSuccessMessage("Notification deactivated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Notification not found"
          : errorInfo.isValidationError
          ? "Notification is already deactivated or invalid ID"
          : "Failed to deactivate notification. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate notification
  const activateNotification = async () => {
    if (!selectedNotification) return;

    try {
      setIsSubmitting(true);
      setDialogError(null);

      await apiClient(`api/notifications/${selectedNotification._id}/activate`, {
        method: "PATCH",
      });

      await fetchNotifications();
      setSuccessMessage("Notification activated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Notification not found"
          : errorInfo.isValidationError
          ? "Notification is already active or invalid ID"
          : "Failed to activate notification. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // String locale sort helper
  const stringLocaleSort =
    (locale = "es") =>
    (rowA: Row<Notification>, rowB: Row<Notification>, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  // Define columns
  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        accessorKey: "idCategoryNotification",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Category
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const category = row.original.idCategoryNotification;
          return category?.category_notification_description || "N/A";
        },
        sortingFn: stringLocaleSort(),
      },
      {
        accessorKey: "notification_description",
        header: "Description",
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate" title={row.original.notification_description}>
            {row.original.notification_description}
          </div>
        ),
      },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => {
          const notification = row.original;
          if (notification.idEnrollment) {
            return notification.idEnrollment.alias || "Enrollment";
          }
          if (notification.idProfessor) {
            return notification.idProfessor.name || "Professor";
          }
          if (notification.idStudent) {
            const students = Array.isArray(notification.idStudent)
              ? notification.idStudent
              : [notification.idStudent];
            return students.length === 1
              ? students[0].name || "Student"
              : `${students.length} Students`;
          }
          if (notification.idPenalization) {
            return notification.idPenalization.name || "Penalization";
          }
          return "N/A";
        },
      },
      {
        accessorKey: "isActive",
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
              row.original.isActive
                ? "bg-secondary/20 text-secondary"
                : "bg-accent-1/20 text-accent-1"
            }`}
          >
            {row.original.isActive ? "Active" : "Deactivated"}
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
            {row.original.isActive ? (
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
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Manage system notifications">
        <Button onClick={() => handleOpen("create")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Notification
        </Button>
      </PageHeader>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Popover
                open={filterPopovers.category}
                onOpenChange={(open) =>
                  setFilterPopovers((prev) => ({ ...prev, category: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="text-left flex-1 truncate">
                      {filters.category
                        ? categories.find((c) => c._id === filters.category)?.category_notification_description || "Select..."
                        : "All Categories"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilters((prev) => ({ ...prev, category: "" }));
                          setFilterPopovers((prev) => ({ ...prev, category: false }));
                        }}
                      >
                        <CheckCircle2 className={`mr-2 h-4 w-4 ${!filters.category ? "opacity-100" : "opacity-0"}`} />
                        All Categories
                      </CommandItem>
                      {categories.map((category) => (
                        <CommandItem
                          key={category._id}
                          onSelect={() => {
                            setFilters((prev) => ({ ...prev, category: category._id }));
                            setFilterPopovers((prev) => ({ ...prev, category: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${filters.category === category._id ? "opacity-100" : "opacity-0"}`}
                          />
                          {category.category_notification_description}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Popover
                open={filterPopovers.status}
                onOpenChange={(open) =>
                  setFilterPopovers((prev) => ({ ...prev, status: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="text-left flex-1 truncate">
                      {filters.isActive === ""
                        ? "All Status"
                        : filters.isActive === "true"
                        ? "Active"
                        : "Deactivated"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilters((prev) => ({ ...prev, isActive: "" }));
                          setFilterPopovers((prev) => ({ ...prev, status: false }));
                        }}
                      >
                        <CheckCircle2 className={`mr-2 h-4 w-4 ${filters.isActive === "" ? "opacity-100" : "opacity-0"}`} />
                        All Status
                      </CommandItem>
                      <CommandItem
                        onSelect={() => {
                          setFilters((prev) => ({ ...prev, isActive: "true" }));
                          setFilterPopovers((prev) => ({ ...prev, status: false }));
                        }}
                      >
                        <CheckCircle2 className={`mr-2 h-4 w-4 ${filters.isActive === "true" ? "opacity-100" : "opacity-0"}`} />
                        Active
                      </CommandItem>
                      <CommandItem
                        onSelect={() => {
                          setFilters((prev) => ({ ...prev, isActive: "false" }));
                          setFilterPopovers((prev) => ({ ...prev, status: false }));
                        }}
                      >
                        <CheckCircle2 className={`mr-2 h-4 w-4 ${filters.isActive === "false" ? "opacity-100" : "opacity-0"}`} />
                        Deactivated
                      </CommandItem>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={notifications}
              searchKeys={["notification_description"]}
              searchPlaceholder="Search by description..."
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog === "create" || openDialog === "edit"} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openDialog === "create" ? "Create Notification" : "Edit Notification"}</DialogTitle>
            <DialogDescription>
              {openDialog === "create"
                ? "Create a new notification. Category and description are required."
                : "Update notification details."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (openDialog === "create") {
                createNotification();
              } else {
                updateNotification();
              }
            }}
            className="space-y-6"
          >
            {/* Category (required) */}
            <div className="space-y-2">
              <Label htmlFor="idCategoryNotification">
                Category <span className="text-red-500">*</span>
              </Label>
              <Popover
                open={openPopovers.category}
                onOpenChange={(open) =>
                  setOpenPopovers((prev) => ({ ...prev, category: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopovers.category}
                    className="w-full justify-between"
                  >
                    <span className="text-left flex-1">
                      {formData.idCategoryNotification
                        ? categories.find((c) => c._id === formData.idCategoryNotification)
                            ?.category_notification_description || "Select..."
                        : "Select category..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      {categories.map((category) => (
                        <CommandItem
                          key={category._id}
                          value={category._id}
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              idCategoryNotification: category._id,
                            }));
                            setOpenPopovers((prev) => ({ ...prev, category: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${
                              formData.idCategoryNotification === category._id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {category.category_notification_description}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {formErrors.idCategoryNotification && (
                <p className="text-sm text-destructive">{formErrors.idCategoryNotification}</p>
              )}
            </div>

            {/* Description (required) */}
            <div className="space-y-2">
              <Label htmlFor="notification_description">
                Description <span className="text-red-500">*</span>
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
                placeholder="Enter notification description..."
                rows={4}
                className={formErrors.notification_description ? "border-red-500" : ""}
              />
              {formErrors.notification_description && (
                <p className="text-sm text-destructive">{formErrors.notification_description}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Optional Entity References */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Entity References (Optional)</h3>

              {/* Penalization */}
              <div className="space-y-2">
                <Label>Penalization</Label>
                <Popover
                  open={openPopovers.penalization}
                  onOpenChange={(open) =>
                    setOpenPopovers((prev) => ({ ...prev, penalization: open }))
                  }
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPopovers.penalization}
                      className="w-full justify-between"
                    >
                      <span className="text-left flex-1">
                        {formData.idPenalization
                          ? penalizations.find((p) => p._id === formData.idPenalization)?.name || "Select..."
                          : "Select penalization (optional)..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search penalizations..." />
                      <CommandEmpty>No penalization found.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, idPenalization: null }));
                            setOpenPopovers((prev) => ({ ...prev, penalization: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${!formData.idPenalization ? "opacity-100" : "opacity-0"}`}
                          />
                          None
                        </CommandItem>
                        {penalizations.map((penalization) => (
                          <CommandItem
                            key={penalization._id}
                            value={penalization._id}
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                idPenalization: penalization._id,
                              }));
                              setOpenPopovers((prev) => ({ ...prev, penalization: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                formData.idPenalization === penalization._id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {penalization.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Enrollment */}
              <div className="space-y-2">
                <Label>Enrollment</Label>
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
                      className="w-full justify-between"
                    >
                      <span className="text-left flex-1">
                        {formData.idEnrollment
                          ? (() => {
                              const enrollment = enrollments.find((e) => e._id === formData.idEnrollment);
                              return enrollment?.alias || `${enrollment?.language} - ${enrollment?.enrollmentType}` || "Select...";
                            })()
                          : "Select enrollment (optional)..."}
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
                            setFormData((prev) => ({ ...prev, idEnrollment: null }));
                            setOpenPopovers((prev) => ({ ...prev, enrollment: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${!formData.idEnrollment ? "opacity-100" : "opacity-0"}`}
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
                                idEnrollment: enrollment._id,
                              }));
                              setOpenPopovers((prev) => ({ ...prev, enrollment: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                formData.idEnrollment === enrollment._id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {enrollment.alias || `${enrollment.language} - ${enrollment.enrollmentType}`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Professor */}
              <div className="space-y-2">
                <Label>Professor</Label>
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
                      className="w-full justify-between"
                    >
                      <span className="text-left flex-1">
                        {formData.idProfessor
                          ? professors.find((p) => p._id === formData.idProfessor)?.name || "Select..."
                          : "Select professor (optional)..."}
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
                            setFormData((prev) => ({ ...prev, idProfessor: null }));
                            setOpenPopovers((prev) => ({ ...prev, professor: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${!formData.idProfessor ? "opacity-100" : "opacity-0"}`}
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
                                idProfessor: professor._id,
                              }));
                              setOpenPopovers((prev) => ({ ...prev, professor: false }));
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                formData.idProfessor === professor._id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {professor.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Student - can be single or multiple */}
              <div className="space-y-2">
                <Label>Student(s)</Label>
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
                      className="w-full justify-between"
                    >
                      <span className="text-left flex-1">
                        {(() => {
                          if (!formData.idStudent) return "Select student(s) (optional)...";
                          const selectedIds = Array.isArray(formData.idStudent)
                            ? formData.idStudent
                            : [formData.idStudent];
                          if (selectedIds.length === 0) return "Select student(s) (optional)...";
                          if (selectedIds.length === 1) {
                            const student = students.find((s) => s._id === selectedIds[0]);
                            return student?.name || "Select...";
                          }
                          return `${selectedIds.length} students selected`;
                        })()}
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
                            setFormData((prev) => ({ ...prev, idStudent: null }));
                            setOpenPopovers((prev) => ({ ...prev, student: false }));
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${!formData.idStudent ? "opacity-100" : "opacity-0"}`}
                          />
                          None
                        </CommandItem>
                        {students.map((student) => {
                          const selectedIds = Array.isArray(formData.idStudent)
                            ? formData.idStudent
                            : formData.idStudent
                            ? [formData.idStudent]
                            : [];
                          const isSelected = selectedIds.includes(student._id);
                          return (
                            <CommandItem
                              key={student._id}
                              value={student._id}
                              onSelect={() => {
                                const currentIds = Array.isArray(formData.idStudent)
                                  ? formData.idStudent
                                  : formData.idStudent
                                  ? [formData.idStudent]
                                  : [];
                                if (isSelected) {
                                  // Remove if already selected
                                  const newIds = currentIds.filter((id) => id !== student._id);
                                  setFormData((prev) => ({
                                    ...prev,
                                    idStudent: newIds.length > 0 ? (newIds.length === 1 ? newIds[0] : newIds) : null,
                                  }));
                                } else {
                                  // Add to selection
                                  const newIds = [...currentIds, student._id];
                                  setFormData((prev) => ({
                                    ...prev,
                                    idStudent: newIds.length === 1 ? newIds[0] : newIds,
                                  }));
                                }
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                              />
                              {student.name} ({student.studentCode})
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.idStudent && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(Array.isArray(formData.idStudent)
                      ? formData.idStudent
                      : [formData.idStudent]
                    ).map((studentId) => {
                      const student = students.find((s) => s._id === studentId);
                      return student ? (
                        <span
                          key={studentId}
                          className="px-2 py-1 bg-secondary/20 text-secondary rounded text-sm flex items-center gap-1"
                        >
                          {student.name}
                          <button
                            onClick={() => {
                              const currentIds = Array.isArray(formData.idStudent)
                                ? formData.idStudent
                                : formData.idStudent
                                ? [formData.idStudent]
                                : [];
                              const newIds = currentIds.filter((id) => id !== studentId);
                              setFormData((prev) => ({
                                ...prev,
                                idStudent: newIds.length > 0 ? (newIds.length === 1 ? newIds[0] : newIds) : null,
                              }));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive !== undefined ? formData.isActive : true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            {dialogError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <p>{dialogError}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {openDialog === "create" ? "Creating..." : "Updating..."}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {openDialog === "create" ? "Create" : "Update"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openDialog === "view"} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Category</Label>
                  <p className="text-sm mt-1">
                    {selectedNotification.idCategoryNotification?.category_notification_description || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                      selectedNotification.isActive
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedNotification.isActive ? "Active" : "Deactivated"}
                  </span>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm mt-1">{selectedNotification.notification_description}</p>
                </div>
                {selectedNotification.idPenalization && (
                  <div>
                    <Label className="text-sm font-semibold">Penalization</Label>
                    <p className="text-sm mt-1">{selectedNotification.idPenalization.name}</p>
                  </div>
                )}
                {selectedNotification.idEnrollment && (
                  <div>
                    <Label className="text-sm font-semibold">Enrollment</Label>
                    <p className="text-sm mt-1">
                      {selectedNotification.idEnrollment.alias ||
                        `${selectedNotification.idEnrollment.language} - ${selectedNotification.idEnrollment.enrollmentType}`}
                    </p>
                  </div>
                )}
                {selectedNotification.idProfessor && (
                  <div>
                    <Label className="text-sm font-semibold">Professor</Label>
                    <p className="text-sm mt-1">{selectedNotification.idProfessor.name}</p>
                  </div>
                )}
                {selectedNotification.idStudent && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">Student(s)</Label>
                    <div className="mt-1 space-y-1">
                      {(Array.isArray(selectedNotification.idStudent)
                        ? selectedNotification.idStudent
                        : [selectedNotification.idStudent]
                      ).map((student) => (
                        <p key={student._id} className="text-sm">
                          {student.name} ({student.studentCode}) - {student.email}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm mt-1">{formatDateForDisplay(selectedNotification.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Updated At</Label>
                  <p className="text-sm mt-1">{formatDateForDisplay(selectedNotification.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
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
              {selectedNotification?.isActive ? "Deactivate Notification" : "Activate Notification"}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.isActive
                ? "Are you sure you want to deactivate this notification?"
                : "Are you sure you want to activate this notification?"}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Category:</span>{" "}
                {selectedNotification.idCategoryNotification?.category_notification_description}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Description:</span> {selectedNotification.notification_description}
              </p>
            </div>
          )}

          {dialogError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <p>{dialogError}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedNotification?.isActive) {
                  await anularNotification();
                } else {
                  await activateNotification();
                }
              }}
              disabled={isSubmitting}
              className={selectedNotification?.isActive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedNotification?.isActive ? (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

