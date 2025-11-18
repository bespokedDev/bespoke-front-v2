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

interface PaymentMethod {
  _id: string;
  name: string;
  type: string;
  description: string;
  status: number;
  statusText: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatePaymentMethodData {
  name: string;
  type: string;
  description: string;
}

interface UpdatePaymentMethodData extends CreatePaymentMethodData {
  status: number;
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "toggle-status" | "view" | null
  >(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch payment methods from API
  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/payment-methods");
      setPaymentMethods(data || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load payment methods. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new payment method
  const createPaymentMethod = async (
    paymentMethodData: CreatePaymentMethodData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient("api/payment-methods", {
        method: "POST",
        body: JSON.stringify(paymentMethodData),
      });
      
      if (!response || !response.paymentMethod) {
        throw new Error("Invalid response structure from server");
      }
      
      setPaymentMethods((prev) => [...prev, response.paymentMethod]);
      setSuccessMessage("Payment method created successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Payment method name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to create payment method. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing payment method
  const updatePaymentMethod = async (
    paymentMethodId: string,
    paymentMethodData: UpdatePaymentMethodData
  ) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      setDialogError(null);
      const response = await apiClient(
        `api/payment-methods/${paymentMethodId}`,
        {
          method: "PUT",
          body: JSON.stringify(paymentMethodData),
        }
      );
      
      if (!response || !response.paymentMethod) {
        throw new Error("Invalid response structure from server");
      }
      
      setPaymentMethods((prev) =>
        prev.map((pm) =>
          pm._id === paymentMethodId ? response.paymentMethod : pm
        )
      );
      setSuccessMessage("Payment method updated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      
      if (errorInfo.isConflictError) {
        setFormErrors({ 
          name: errorInfo.message || "Payment method name already exists" 
        });
      } else if (errorInfo.isValidationError) {
        setFormErrors({ 
          general: errorInfo.message || "Please check all required fields" 
        });
      } else if (errorInfo.isNotFoundError) {
        setFormErrors({ general: errorInfo.message || "Payment method not found" });
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to update payment method. Please try again."
        );
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate payment method
  const deactivatePaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/payment-methods/${paymentMethodId}/deactivate`,
        {
          method: "PATCH",
        }
      );
      
      if (!response || !response.paymentMethod) {
        throw new Error("Invalid response structure from server");
      }
      
      setPaymentMethods((prev) =>
        prev.map((pm) =>
          pm._id === paymentMethodId ? response.paymentMethod : pm
        )
      );
      setSuccessMessage("Payment method deactivated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Payment method not found"
          : errorInfo.isValidationError
          ? "Payment method is already deactivated or invalid ID"
          : "Failed to deactivate payment method. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate payment method
  const activatePaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsSubmitting(true);
      setDialogError(null);
      setFormErrors({});
      const response = await apiClient(
        `api/payment-methods/${paymentMethodId}/activate`,
        {
          method: "PATCH",
        }
      );
      
      if (!response || !response.paymentMethod) {
        throw new Error("Invalid response structure from server");
      }
      
      setPaymentMethods((prev) =>
        prev.map((pm) =>
          pm._id === paymentMethodId ? response.paymentMethod : pm
        )
      );
      setSuccessMessage("Payment method activated successfully");
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Payment method not found"
          : errorInfo.isValidationError
          ? "Payment method is already active or invalid ID"
          : "Failed to activate payment method. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
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
    paymentMethod?: PaymentMethod
  ) => {
    setSelectedPaymentMethod(paymentMethod || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedPaymentMethod(null);
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
    const paymentMethodData = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      description: formData.get("description") as string,
      status: openDialog === "edit" ? Number(formData.get("status")) : 1,
    };

    const errors = validateForm(paymentMethodData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (openDialog === "create") {
      await createPaymentMethod(paymentMethodData);
    } else if (openDialog === "edit" && selectedPaymentMethod) {
      await updatePaymentMethod(selectedPaymentMethod._id, paymentMethodData);
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

  const columns: ColumnDef<PaymentMethod>[] = [
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
        title="Payment Methods"
        subtitle="Manage available payment methods"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add payment method
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-700 hover:text-green-900"
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
              data={paymentMethods}
              searchKeys={["name"]}
              searchPlaceholder="Search payment methods by name..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add payment method"}
              {openDialog === "edit" && "Edit payment method"}
              {openDialog === "view" && "Payment Method Details"}
              {openDialog === "toggle-status" &&
                (selectedPaymentMethod?.status === 1
                  ? "Deactivate payment method"
                  : "Activate payment method")}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedPaymentMethod?.name || ""}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  name="type"
                  defaultValue={selectedPaymentMethod?.type || ""}
                  className={formErrors.type ? "border-red-500" : ""}
                />
                {formErrors.type && (
                  <p className="text-red-500 text-sm">{formErrors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={selectedPaymentMethod?.description || ""}
                  className={formErrors.description ? "border-red-500" : ""}
                />
                {formErrors.description && (
                  <p className="text-red-500 text-sm">
                    {formErrors.description}
                  </p>
                )}
              </div>

              {openDialog === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={selectedPaymentMethod?.status || 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={1}>Active</option>
                    <option value={2}>Inactive</option>
                  </select>
                </div>
              )}
            </form>
          )}

          {openDialog === "view" && selectedPaymentMethod && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Name</Label>
                  <p className="text-sm font-semibold">
                    {selectedPaymentMethod.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Type</Label>
                  <p className="text-sm">{selectedPaymentMethod.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm">{selectedPaymentMethod.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedPaymentMethod.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedPaymentMethod.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {openDialog === "toggle-status" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                {selectedPaymentMethod?.status === 1
                  ? "deactivate"
                  : "activate"}{" "}
                <strong>{selectedPaymentMethod?.name}</strong>?
              </p>
            </div>
          )}

          {((openDialog === "create" || openDialog === "edit") && formErrors.general) ||
          (openDialog === "toggle-status" && dialogError) ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
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
                  selectedPaymentMethod?.status === 1
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
                    selectedPaymentMethod
                  ) {
                    if (selectedPaymentMethod.status === 1) {
                      deactivatePaymentMethod(selectedPaymentMethod._id);
                    } else {
                      activatePaymentMethod(selectedPaymentMethod._id);
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
                  (selectedPaymentMethod?.status === 1
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

