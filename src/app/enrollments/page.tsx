/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { dateStringToISO } from "@/lib/dateUtils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";

// Types
import type {
  Enrollment,
  EnrollmentFormData,
  Plan,
  StudentBrief,
  ProfessorBrief,
} from "./types/enrollment.types";

// Constants
import {
  WEEK_DAYS,
  LANGUAGE_OPTIONS,
  ENROLLMENT_STATUS_OPTIONS,
  initialEnrollmentState,
} from "./constants/enrollment.constants";

// Helpers & Utils
import {
  transformEnrollmentToFormData,
  calculatePricing,
  transformStudentIdsForPayload,
} from "./utils/enrollmentHelpers";
import { validateEnrollmentForm } from "./utils/enrollmentValidators";

// Components
import { MultiSelect } from "./components/MultiSelect";
import { StudentMultiSelect } from "./components/StudentMultiSelect";
import { StudentInformationForm } from "./components/StudentInformationForm";
import { SubstituteProfessorSection } from "./components/SubstituteProfessorSection";
import { createEnrollmentColumns } from "./columns/enrollmentColumns";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | null
  >(null);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);
  const [formData, setFormData] = useState<EnrollmentFormData>(
    initialEnrollmentState
  );
  const [openStudentSections, setOpenStudentSections] = useState<
    Record<string, boolean>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [openDisolveDialog, setOpenDisolveDialog] = useState(false);
  const [disolveReason, setDisolveReason] = useState("");
  const [openPauseDialog, setOpenPauseDialog] = useState(false);
  const [openResumeDialog, setOpenResumeDialog] = useState(false);
  const [resumeStartDate, setResumeStartDate] = useState("");

  // Initialize openStudentSections: all closed by default
  useEffect(() => {
    if (formData.studentIds.length > 0) {
      setOpenStudentSections((prev) => {
        const updated: Record<string, boolean> = {};
        formData.studentIds.forEach((student, index) => {
          const studentKey = student.studentId || `student-${index}`;
          updated[studentKey] = prev[studentKey] ?? false;
        });
        return updated;
      });
    }
  }, [formData.studentIds]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [enrollmentData, planData, studentData, professorData] =
          await Promise.all([
            apiClient("api/enrollments"),
            apiClient("api/plans"),
            apiClient("api/students"),
            apiClient("api/professors"),
          ]);
        setEnrollments(enrollmentData);
        setPlans(planData.plans || planData || []);
        const activeStudents = Array.isArray(studentData)
          ? studentData.filter((student: any) => student.status === 1)
          : [];
        setStudents(activeStudents);
        const sortedProfessors = professorData.sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setProfessors(sortedProfessors);
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
    fetchInitialData();
  }, []);

  // Calculate pricing based on plan and student count
  useEffect(() => {
    if (!plans || !Array.isArray(plans)) return;
    const selectedPlan = plans.find((p) => p._id === formData.planId);
    if (!selectedPlan) return;

    const { pricePerStudent, enrollmentType, totalAmount } = calculatePricing(
      formData.studentIds.length,
      selectedPlan.pricing
    );

    setFormData((prev) => ({
      ...prev,
      pricePerStudent,
      totalAmount,
      enrollmentType,
    }));
  }, [formData.planId, formData.studentIds.length, plans]);

  // Create columns with memoization
  const columns = useMemo(
    () =>
      createEnrollmentColumns(
        students,
        (enrollment) => handleOpen("edit", enrollment),
        (enrollment) => handleOpen("status", enrollment)
      ),
    [students]
  );

  const handleOpen = (
    type: "create" | "edit" | "status",
    enrollment?: Enrollment
  ) => {
    setDialogError(null);
    setOpenStudentSections({});
    if (type === "create") {
      setSelectedEnrollment(null);
      setFormData(initialEnrollmentState);
    } else if (enrollment) {
      setSelectedEnrollment(enrollment);
      if (type === "edit") {
        setFormData(transformEnrollmentToFormData(enrollment));
      }
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setOpenStudentSections({});
    setDisolveReason("");
  };

  const handleDisolveClose = () => {
    setOpenDisolveDialog(false);
    setDisolveReason("");
  };

  const handleDisolveConfirm = async () => {
    if (!selectedEnrollment || !disolveReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiClient(
        `api/enrollments/${selectedEnrollment._id}/disolve`,
        {
          method: "PATCH",
          body: JSON.stringify({
            disolve_reason: disolveReason.trim(),
          }),
        }
      );

      if (!response || !response.enrollment) {
        throw new Error("Invalid response structure from server");
      }

      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      handleDisolveClose();
      if (openDialog === "edit") {
        handleClose();
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please provide a valid reason for disolving the enrollment."
          : errorInfo.isNotFoundError
          ? "Enrollment not found."
          : "Failed to disolve enrollment. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!selectedEnrollment) return;
    
    setIsSubmitting(true);
    setDialogError(null);
    try {
      const response = await apiClient(
        `api/enrollments/${selectedEnrollment._id}/pause`,
        {
          method: "PATCH",
        }
      );

      if (!response || !response.enrollment) {
        throw new Error("Invalid response structure from server");
      }

      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      setOpenPauseDialog(false);
      if (openDialog === "edit") {
        handleClose();
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Enrollment not found."
          : "Failed to pause enrollment. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!selectedEnrollment || !resumeStartDate.trim()) return;
    
    setIsSubmitting(true);
    setDialogError(null);
    try {
      const response = await apiClient(
        `api/enrollments/${selectedEnrollment._id}/resume`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startDate: resumeStartDate,
          }),
        }
      );

      if (!response || !response.enrollment) {
        throw new Error("Invalid response structure from server");
      }

      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      setOpenResumeDialog(false);
      setResumeStartDate("");
      if (openDialog === "edit") {
        handleClose();
      }
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please provide a valid start date for resuming the enrollment."
          : errorInfo.isNotFoundError
          ? "Enrollment not found."
          : "Failed to resume enrollment. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseClose = () => {
    setOpenPauseDialog(false);
    setDialogError(null);
  };

  const handleResumeClose = () => {
    setOpenResumeDialog(false);
    setResumeStartDate("");
    setDialogError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);

    // Validate form using validator
    const validationError = validateEnrollmentForm(formData, students, plans);
    if (validationError) {
      setDialogError(validationError);
      setIsSubmitting(false);
      return;
    }

    // Convert dates to ISO format
    const purchaseDateISO = formData.purchaseDate
      ? dateStringToISO(formData.purchaseDate)
      : new Date().toISOString();

    const startDateISO = formData.startDate
      ? dateStringToISO(formData.startDate)
      : new Date().toISOString();

    // Transform studentIds using helper
    const studentIdsPayload = transformStudentIdsForPayload(
      formData.studentIds
    );

    const payload: any = {
      planId: formData.planId,
      studentIds: studentIdsPayload,
      professorId: formData.professorId,
      enrollmentType: formData.enrollmentType,
      scheduledDays: formData.scheduledDays.map((day) => ({ day })),
      purchaseDate: purchaseDateISO,
      startDate: startDateISO,
      pricePerStudent: formData.pricePerStudent,
      totalAmount: formData.totalAmount,
      language: formData.language,
    };

    // Optional fields
    if (formData.alias) {
      payload.alias = formData.alias;
    }

    if (formData.lateFee !== undefined && formData.lateFee !== null) {
      payload.lateFee = formData.lateFee;
    } else {
      payload.lateFee = 0;
    }

    if (
      formData.penalizationMoney !== undefined &&
      formData.penalizationMoney !== null
    ) {
      payload.penalizationMoney = formData.penalizationMoney;
    }

    // Substitute professor (only when editing)
    if (
      openDialog === "edit" &&
      formData.substituteProfessor &&
      formData.substituteProfessor.professorId
    ) {
      payload.substituteProfessor = {
        professorId: formData.substituteProfessor.professorId,
        status: 1,
        assignedDate: dateStringToISO(
          formData.substituteProfessor.assignedDate
        ),
        expiryDate: dateStringToISO(formData.substituteProfessor.expiryDate),
      };
    }

    // Status
    if (openDialog === "edit" && formData.status !== undefined) {
      payload.status = formData.status;
    } else if (openDialog === "create") {
      payload.status = 1;
    }

    try {
      let response;
      if (openDialog === "create") {
        response = await apiClient("api/enrollments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response || !response.enrollment) {
          throw new Error("Invalid response structure from server");
        }
      } else if (openDialog === "edit" && selectedEnrollment) {
        response = await apiClient(
          `api/enrollments/${selectedEnrollment._id}`,
          {
          method: "PUT",
          body: JSON.stringify(payload),
          }
        );
        if (!response || !response.enrollment) {
          throw new Error("Invalid response structure from server");
        }
      }
      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isConflictError
          ? "An enrollment with this information already exists."
          : "Failed to save enrollment. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedEnrollment) return;
    setIsSubmitting(true);
    setDialogError(null);

    try {
      if (selectedEnrollment.status === 0) {
        setDialogError("Cannot change status of a dissolved enrollment.");
        setIsSubmitting(false);
        return;
      }
      if (selectedEnrollment.status === 3) {
        setDialogError(
          "Cannot toggle status of a paused enrollment. Please edit the enrollment to change its status."
        );
        setIsSubmitting(false);
        return;
      }
      const action =
        selectedEnrollment.status === 1 ? "deactivate" : "activate";

      const response = await apiClient(
        `api/enrollments/${selectedEnrollment._id}/${action}`,
        {
        method: "PATCH",
        }
      );

      if (!response || !response.enrollment) {
        throw new Error("Invalid response structure from server");
      }

      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Enrollment not found."
          : "Failed to update enrollment status. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudentSection = (studentKey: string, open: boolean) => {
    setOpenStudentSections((prev) => ({
      ...prev,
      [studentKey]: open,
    }));
  };

  const selectedPlan = plans.find((p) => p._id === formData.planId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        subtitle="Manage student enrollments in plans and classes"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Enrollment
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

      {!isLoading && !error && (
        <Card className="border-none">
          <CardContent>
            <DataTable
              columns={columns}
              data={enrollments}
              searchKeys={[
                "aliasOrStudents",
                "language",
                "planWithType",
                "professor",
                "statusText",
              ]}
              searchPlaceholder="Search enrollments..."
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog === "create" || openDialog === "edit"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Create Enrollment"}
              {openDialog === "edit" && "Edit Enrollment"}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Professor <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.professorId}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, professorId: v }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a professor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {professors.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Language <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.language || ""}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, language: v }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Plan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, planId: v }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Students <span className="text-red-500">*</span>
                </Label>
                <StudentMultiSelect
                  items={students}
                  selectedStudents={formData.studentIds}
                  onSelectedChange={(selectedStudents) =>
                    setFormData((p) => ({ ...p, studentIds: selectedStudents }))
                  }
                  placeholder="Select students..."
                />
              </div>

              <StudentInformationForm
                studentIds={formData.studentIds}
                students={students}
                openStudentSections={openStudentSections}
                onToggleSection={toggleStudentSection}
                onUpdateStudent={(updated) =>
                  setFormData((p) => ({ ...p, studentIds: updated }))
                }
              />

              {formData.studentIds.length > 0 &&
                (formData.enrollmentType === "couple" ||
                formData.enrollmentType === "group") && (
                <div className="space-y-2">
                  <Label>Alias</Label>
                  <Input
                    type="text"
                    value={formData.alias || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, alias: e.target.value }))
                    }
                    placeholder="Enter alias..."
                    maxLength={100}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Scheduled Days <span className="text-red-500">*</span>
                </Label>
                <MultiSelect
                  items={WEEK_DAYS.map((d) => ({ _id: d, name: d }))}
                  selectedIds={formData.scheduledDays}
                  onSelectedChange={(days) =>
                    setFormData((p) => ({ ...p, scheduledDays: days }))
                  }
                  placeholder="Select days..."
                />
                {selectedPlan && (
                      <p className="text-sm text-muted-foreground">
                    {formData.scheduledDays.length ===
                    selectedPlan.weeklyClasses ? (
                      <span className="text-green-600">
                        ✓ Correct number of days selected (
                        {selectedPlan.weeklyClasses})
                      </span>
                    ) : formData.scheduledDays.length <
                      selectedPlan.weeklyClasses ? (
                          <span className="text-amber-600">
                        Select{" "}
                        {selectedPlan.weeklyClasses -
                          formData.scheduledDays.length}{" "}
                        more day
                        {selectedPlan.weeklyClasses -
                          formData.scheduledDays.length >
                        1
                          ? "s"
                          : ""}{" "}
                        (Plan requires {selectedPlan.weeklyClasses} days per
                        week)
                          </span>
                        ) : (
                          <span className="text-red-600">
                        Too many days selected. Plan requires only{" "}
                        {selectedPlan.weeklyClasses} day
                        {selectedPlan.weeklyClasses > 1 ? "s" : ""} per week.
                          </span>
                        )}
                      </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Purchase Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    max="9999-12-31"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        purchaseDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    max="9999-12-31"
                    value={formData.startDate || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        startDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Late Fee (Days) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                    value={
                      formData.lateFee !== undefined && formData.lateFee !== null
                        ? formData.lateFee
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                    setFormData((p) => ({
                      ...p,
                        lateFee: value === "" ? undefined : parseInt(value) || 0,
                      }));
                    }}
                  placeholder="e.g., 2"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Number of days of tolerance for late payments
                </p>
              </div>
                <div className="space-y-2">
                  <Label>Penalization Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formData.penalizationMoney !== undefined &&
                      formData.penalizationMoney !== null
                        ? formData.penalizationMoney
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        penalizationMoney:
                          value === "" ? undefined : parseFloat(value) || 0,
                      }));
                    }}
                    placeholder="e.g., 10.50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount of money for the penalization applied due to late
                    payment
                  </p>
                </div>
              </div>

              {openDialog === "edit" && (
                <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status?.toString() || ""}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, status: parseInt(v) }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {ENROLLMENT_STATUS_OPTIONS.map((status) => (
                          <SelectItem
                            key={status.value}
                            value={status.value.toString()}
                          >
                            {status.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                  <SubstituteProfessorSection
                    substituteProfessor={formData.substituteProfessor || null}
                    professors={professors}
                    mainProfessorId={formData.professorId}
                    onUpdate={(substitute) =>
                              setFormData((p) => ({
                                ...p,
                        substituteProfessor: substitute,
                              }))
                            }
                          />
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <p className="font-semibold capitalize">
                    {formData.enrollmentType}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Price/Student
                  </Label>
                  <p className="font-semibold">
                    ${formData.pricePerStudent.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Total Amount
                  </Label>
                  <p className="font-semibold">
                    ${formData.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="text-red-500">*</span> Campos obligatorios
              </div>

              {dialogError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <DialogFooter className="pt-4 border-t">
                <div className="flex justify-between w-full">
                  {openDialog === "edit" && selectedEnrollment && (
                    <div className="flex gap-2">
                      {selectedEnrollment.status === 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
                          onClick={() => setOpenPauseDialog(true)}
                        >
                          Pause
                        </Button>
                      )}
                      {selectedEnrollment.status === 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-secondary border-secondary/50 hover:bg-secondary/10"
                          onClick={() => {
                            setOpenResumeDialog(true);
                            setResumeStartDate("");
                          }}
                        >
                          Resume
                        </Button>
                      )}
                      {selectedEnrollment.status !== 0 && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setOpenDisolveDialog(true)}
                        >
                          Disolve
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  Save
                </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Disolve Dialog */}
      <Dialog
        open={openDisolveDialog}
        onOpenChange={(isOpen) => !isOpen && handleDisolveClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Disolve Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to disolve this enrollment? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={disolveReason}
                onChange={(e) => setDisolveReason(e.target.value)}
                placeholder="Enter the reason for disolving this enrollment..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDisolveClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisolveConfirm}
              disabled={!disolveReason.trim() || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Disolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <Dialog
        open={openPauseDialog}
        onOpenChange={(isOpen) => !isOpen && handlePauseClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pause Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause this enrollment? The enrollment
              will be temporarily suspended.
            </DialogDescription>
          </DialogHeader>
          {dialogError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handlePauseClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handlePause}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog
        open={openResumeDialog}
        onOpenChange={(isOpen) => !isOpen && handleResumeClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Enrollment</DialogTitle>
            <DialogDescription>
              Enter the new start date to resume this paused enrollment.
              Pending classes will be rescheduled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                New Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                max="9999-12-31"
                value={resumeStartDate}
                onChange={(e) => setResumeStartDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Classes will be rescheduled from this date onwards
              </p>
            </div>
          </div>
          {dialogError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleResumeClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleResume}
              disabled={!resumeStartDate.trim() || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog
        open={openDialog === "status"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to{" "}
            {selectedEnrollment?.status === 1 ? "deactivate" : "activate"} this
            enrollment?
            {selectedEnrollment?.status === 0 && (
              <span className="text-destructive">
                {" "}
                This enrollment is dissolved and cannot be changed.
              </span>
            )}
            {selectedEnrollment?.status === 3 && (
              <span className="text-accent-2">
                {" "}
                This enrollment is paused. Please edit the enrollment to change
                its status.
              </span>
            )}
          </DialogDescription>
          {dialogError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={
                selectedEnrollment?.status === 1 ? "destructive" : "default"
              }
              onClick={handleToggleStatus}
              disabled={
                isSubmitting ||
                selectedEnrollment?.status === 0 ||
                selectedEnrollment?.status === 3
              }
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}{" "}
              {selectedEnrollment?.status === 1 
                ? "Deactivate" 
                : selectedEnrollment?.status === 2 
                ? "Activate" 
                : selectedEnrollment?.status === 3
                ? "Cannot Change (Paused)"
                : "Cannot Change (Disolved)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
