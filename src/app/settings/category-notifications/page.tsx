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

interface CategoryNotification {
  _id: string;
  category_notification_description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCategoryNotificationData {
  category_notification_description: string;
  isActive?: boolean;
}

interface UpdateCategoryNotificationData {
  category_notification_description: string;
  isActive?: boolean;
}

export default function CategoryNotificationsPage() {
  const [categoryNotifications, setCategoryNotifications] = useState<CategoryNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "toggle-status" | "view" | null
  >(null);
  const [selectedCategoryNotification, setSelectedCategoryNotification] =
    useState<CategoryNotification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch category notifications from API
  const fetchCategoryNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient("api/category-notifications");
      // API returns { categoryNotifications: [...], count: number, message: string }
      const data = (response as any).categoryNotifications || response || [];
      setCategoryNotifications(data);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load notification categories. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new category notification
  const createCategoryNotification = async (
    categoryNotificationData: CreateCategoryNotificationData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient("api/category-notifications", {
        method: "POST",
        body: JSON.stringify(categoryNotificationData),
      });

      if (!response || !(response as any).categoryNotification) {
        throw new Error("Invalid response structure from server");
      }

      setCategoryNotifications((prev) => [
        ...prev,
        (response as any).categoryNotification,
      ]);
      setSuccessMessage("Notification category created successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);

      if (errorInfo.isConflictError) {
        setFormErrors({
          category_notification_description:
            errorInfo.message ||
            "Notification category description already exists",
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({
          general: errorInfo.message || "Please check all required fields",
        });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to create notification category. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing category notification
  const updateCategoryNotification = async (
    categoryNotificationId: string,
    categoryNotificationData: UpdateCategoryNotificationData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient(
        `api/category-notifications/${categoryNotificationId}`,
        {
          method: "PUT",
          body: JSON.stringify(categoryNotificationData),
        }
      );

      if (!response || !(response as any).categoryNotification) {
        throw new Error("Invalid response structure from server");
      }

      setCategoryNotifications((prev) =>
        prev.map((cn) =>
          cn._id === categoryNotificationId
            ? (response as any).categoryNotification
            : cn
        )
      );
      setSuccessMessage("Notification category updated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);

      if (errorInfo.isConflictError) {
        setFormErrors({
          category_notification_description:
            errorInfo.message ||
            "Notification category description already exists",
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({
          general: errorInfo.message || "Please check all required fields",
        });
      } else if (errorInfo.isNotFoundError) {
        setFormErrors({
          general: errorInfo.message || "Notification category not found",
        });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to update notification category. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular category notification
  const anularCategoryNotification = async (categoryNotificationId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/category-notifications/${categoryNotificationId}/anular`,
        {
          method: "PATCH",
        }
      );

      if (!response || !(response as any).categoryNotification) {
        throw new Error("Invalid response structure from server");
      }

      setCategoryNotifications((prev) =>
        prev.map((cn) =>
          cn._id === categoryNotificationId
            ? (response as any).categoryNotification
            : cn
        )
      );
      setSuccessMessage("Notification category deactivated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Notification category not found"
          : errorInfo.isValidationError
          ? "Notification category is already deactivated or invalid ID"
          : "Failed to deactivate notification category. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate category notification
  const activateCategoryNotification = async (categoryNotificationId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/category-notifications/${categoryNotificationId}/activate`,
        {
          method: "PATCH",
        }
      );

      if (!response || !(response as any).categoryNotification) {
        throw new Error("Invalid response structure from server");
      }

      setCategoryNotifications((prev) =>
        prev.map((cn) =>
          cn._id === categoryNotificationId
            ? (response as any).categoryNotification
            : cn
        )
      );
      setSuccessMessage("Notification category activated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Notification category not found"
          : errorInfo.isValidationError
          ? "Notification category is already active or invalid ID"
          : "Failed to activate notification category. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCategoryNotifications();
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
    categoryNotification?: CategoryNotification
  ) => {
    setSelectedCategoryNotification(categoryNotification || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedCategoryNotification(null);
    setFormErrors({});
    setError(null);
    setDialogError(null);
    setSuccessMessage(null);
  };

  // Form validation
  const validateForm = (formData: any): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.category_notification_description?.trim()) {
      errors.category_notification_description = "Description is required";
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const categoryNotificationData = {
      category_notification_description: formData.get(
        "category_notification_description"
      ) as string,
    };

    const errors = validateForm(categoryNotificationData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (openDialog === "create") {
      await createCategoryNotification(categoryNotificationData);
    } else if (openDialog === "edit" && selectedCategoryNotification) {
      await updateCategoryNotification(
        selectedCategoryNotification._id,
        categoryNotificationData as UpdateCategoryNotificationData
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

  const columns: ColumnDef<CategoryNotification>[] = [
    {
      accessorKey: "category_notification_description",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Description
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
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
        title="Notification Categories"
        subtitle="Manage notification categories for the system"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add category
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
              data={categoryNotifications}
              searchKeys={["category_notification_description"]}
              searchPlaceholder="Search categories by description..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add notification category"}
              {openDialog === "edit" && "Edit notification category"}
              {openDialog === "view" && "Notification Category Details"}
              {openDialog === "toggle-status" &&
                (selectedCategoryNotification?.isActive
                  ? "Deactivate notification category"
                  : "Activate notification category")}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category_notification_description">
                  Description *
                </Label>
                <Input
                  id="category_notification_description"
                  name="category_notification_description"
                  placeholder="e.g., Administrative, Penalization, etc."
                  defaultValue={
                    selectedCategoryNotification?.category_notification_description ||
                    ""
                  }
                  className={
                    formErrors.category_notification_description
                      ? "border-red-500"
                      : ""
                  }
                />
                {formErrors.category_notification_description && (
                  <p className="text-red-500 text-sm">
                    {formErrors.category_notification_description}
                  </p>
                )}
              </div>
            </form>
          )}

          {openDialog === "view" && selectedCategoryNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm font-semibold">
                    {
                      selectedCategoryNotification.category_notification_description
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedCategoryNotification.isActive
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedCategoryNotification.isActive
                      ? "Active"
                      : "Deactivated"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {openDialog === "toggle-status" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                {selectedCategoryNotification?.isActive
                  ? "deactivate"
                  : "activate"}{" "}
                <strong>
                  {
                    selectedCategoryNotification?.category_notification_description
                  }
                </strong>
                ?
              </p>
            </div>
          )}

          {((openDialog === "create" || openDialog === "edit") &&
            formErrors.general) ||
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
                  selectedCategoryNotification?.isActive
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
                    selectedCategoryNotification
                  ) {
                    if (selectedCategoryNotification.isActive) {
                      anularCategoryNotification(
                        selectedCategoryNotification._id
                      );
                    } else {
                      activateCategoryNotification(
                        selectedCategoryNotification._id
                      );
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
                  (selectedCategoryNotification?.isActive
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

