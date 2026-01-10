"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { CanvaDoc, CanvaDocFormData } from "@/types/canvaDoc.types";

interface CanvaDocsSectionProps {
  studentId: string;
}

export function CanvaDocsSection({ studentId }: CanvaDocsSectionProps) {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  const isProfessor = userRole === "professor";
  const canCreateEdit = isAdmin || isProfessor;

  const [canvaDocs, setCanvaDocs] = useState<CanvaDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<"create" | "edit" | null>(null);
  const [selectedCanvaDoc, setSelectedCanvaDoc] = useState<CanvaDoc | null>(
    null
  );
  const [formData, setFormData] = useState<CanvaDocFormData>({
    description: "",
    studentId: studentId,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch CanvaDocs for this student
  useEffect(() => {
    const fetchCanvaDocs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient(`api/canva-docs?studentId=${studentId}`);
        setCanvaDocs(response.canvaDocs || []);
      } catch (err: unknown) {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load CanvaDocs. Please try again."
        );
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCanvaDocs();
  }, [studentId]);

  const handleOpen = (type: "create" | "edit", canvaDoc?: CanvaDoc) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedCanvaDoc(null);
      setFormData({
        description: "",
        studentId: studentId,
        isActive: true,
      });
    } else if (canvaDoc) {
      setSelectedCanvaDoc(canvaDoc);
      setFormData({
        description: canvaDoc.description,
        studentId: studentId,
        isActive: canvaDoc.isActive,
      });
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setDialogError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);

    if (!formData.description?.trim()) {
      setDialogError("Description is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: {
        description: string;
        studentId: string;
        isActive?: boolean;
      } = {
        description: formData.description.trim(),
        studentId: formData.studentId,
      };

      if (formData.isActive !== undefined) {
        payload.isActive = formData.isActive;
      }

      if (openDialog === "create") {
        const response = await apiClient("api/canva-docs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response || !response.canvaDoc) {
          throw new Error("Invalid response structure from server");
        }
      } else if (openDialog === "edit" && selectedCanvaDoc) {
        const response = await apiClient(
          `api/canva-docs/${selectedCanvaDoc._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        if (!response || !response.canvaDoc) {
          throw new Error("Invalid response structure from server");
        }
      }

      // Refresh data
      const response = await apiClient(`api/canva-docs?studentId=${studentId}`);
      setCanvaDocs(response.canvaDocs || []);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isNotFoundError
          ? "CanvaDoc not found."
          : errorInfo.isUnauthorizedError
          ? "You don't have permission to perform this action."
          : "Failed to save CanvaDoc. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (canvaDoc: CanvaDoc) => {
    if (!canvaDoc) return;

    setIsSubmitting(true);
    setDialogError(null);

    try {
      const action = canvaDoc.isActive ? "anular" : "activate";
      const response = await apiClient(`api/canva-docs/${canvaDoc._id}/${action}`, {
        method: "PATCH",
      });

      if (!response || !response.canvaDoc) {
        throw new Error("Invalid response structure from server");
      }

      // Refresh data
      const responseRefresh = await apiClient(`api/canva-docs?studentId=${studentId}`);
      setCanvaDocs(responseRefresh.canvaDocs || []);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isUnauthorizedError
          ? "You don't have permission to perform this action."
          : errorInfo.isNotFoundError
          ? "CanvaDoc not found."
          : "Failed to update CanvaDoc status. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              CanvaDocs
            </CardTitle>
            {canCreateEdit && (
              <Button
                size="sm"
                onClick={() => handleOpen("create")}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add CanvaDoc
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {canvaDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No CanvaDocs found for this student.</p>
              {canCreateEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpen("create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First CanvaDoc
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  {canCreateEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {canvaDocs.map((canvaDoc) => (
                  <TableRow key={canvaDoc._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-[200px] truncate">
                          {canvaDoc.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          canvaDoc.isActive
                            ? "bg-secondary/20 text-secondary"
                            : "bg-accent-1/20 text-accent-1"
                        }`}
                      >
                        {canvaDoc.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDateForDisplay(canvaDoc.createdAt)}
                    </TableCell>
                    {canCreateEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleToggleStatus(canvaDoc)}
                            disabled={isSubmitting}
                          >
                            {canvaDoc.isActive ? (
                              <Ban className="h-4 w-4 text-accent-1" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-secondary" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleOpen("edit", canvaDoc)}
                            disabled={isSubmitting}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {canCreateEdit && (
        <Dialog
          open={openDialog === "create" || openDialog === "edit"}
          onOpenChange={(isOpen) => !isOpen && handleClose()}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {openDialog === "create" && "Create CanvaDoc"}
                {openDialog === "edit" && "Edit CanvaDoc"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Enter document description..."
                  rows={4}
                  required
                />
              </div>

              {openDialog === "edit" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.isActive ? "active" : "inactive"}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        isActive: v === "active",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dialogError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

