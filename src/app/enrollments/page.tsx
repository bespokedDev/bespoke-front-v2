/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  getCurrentDateString,
  extractDatePart,
  dateStringToISO,
  addDaysToDate,
} from "@/lib/dateUtils";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  Loader2,
  ChevronsUpDown,
  X,
  Eye,
  ArrowUpDown,
  AlertCircle,
  ChevronDown,
  Trash2,
} from "lucide-react";
import Link from "next/link";

// --- DEFINICIONES DE TIPOS ---
interface Plan {
  _id: string;
  name: string;
  weeklyClasses: number;
  pricing: { single: number; couple: number; group: number };
}
interface StudentBrief {
  _id: string;
  name: string;
  status?: number; // 1 = activo, 0 = inactivo
}
interface ProfessorBrief {
  _id: string;
  name: string;
}

interface SubstituteProfessor {
  professorId: string;
  status: number; // 1=activo, 0=inactivo
  assignedDate: string;
  expiryDate: string;
}

interface ScheduledDay {
  _id?: string;
  day: string;
}

interface StudentEnrollmentInfo {
  _id?: string;
  studentId: string | StudentBrief;
  preferences?: string;
  firstTimeLearningLanguage?: string;
  previousExperience?: string;
  goals?: string;
  dailyLearningTime?: string;
  learningType?: string;
  idealClassType?: string;
  learningDifficulties?: string;
  languageLevel?: string;
  experiencePastClass?: string;
  howWhereTheClasses?: string;
  roleGroup?: string;
  willingHomework?: number;
}

interface Enrollment {
  _id: string;
  planId: Plan;
  studentIds: StudentEnrollmentInfo[] | StudentBrief[];
  professorId?: ProfessorBrief | null;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: ScheduledDay[] | null;
  purchaseDate: string;
  startDate?: string;
  endDate?: string;
  monthlyClasses?: number;
  pricePerStudent: number;
  totalAmount: number;
  status: number; // 1=activo, 2=inactivo, 0=disuelto, 3=pausado
  alias?: string;
  language?: string;
  available_balance?: number;
  classCalculationType?: number;
  substituteProfessor?: SubstituteProfessor | null;
  lateFee?: number;
  suspensionDaysAfterEndDate?: number;
  penalizationMoney?: number;
  penalizationId?: string;
  graceDays?: number;
  latePaymentPenalty?: number;
  extendedGraceDays?: number;
  cancellationPaymentsEnabled?: boolean;
  rescheduleHours?: number;
  disolve_reason?: string | null;
  disolve_user?: string | null;
}

type StudentEnrollmentFormData = {
  studentId: string;
  preferences?: string;
  firstTimeLearningLanguage?: string;
  previousExperience?: string;
  goals?: string;
  dailyLearningTime?: string;
  learningType?: string; // Se maneja como array internamente, se envía como string separado por comas
  idealClassType?: string;
  learningDifficulties?: string;
  languageLevel?: string;
  experiencePastClass?: string;
  howWhereTheClasses?: string;
  roleGroup?: string;
  willingHomework?: number;
};

type EnrollmentFormData = {
  planId: string;
  studentIds: StudentEnrollmentFormData[];
  professorId?: string;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: string[];
  purchaseDate: string;
  startDate?: string;
  pricePerStudent: number;
  totalAmount: number;
  status?: number;
  alias?: string;
  language?: string;
  classCalculationType?: number;
  substituteProfessor?: SubstituteProfessor | null;
  lateFee?: number;
  suspensionDaysAfterEndDate: number;
  penalizationMoney?: number;
};

// --- ESTADO INICIAL ---
const initialEnrollmentState: EnrollmentFormData = {
  planId: "",
  studentIds: [],
  professorId: "",
  enrollmentType: "single",
  scheduledDays: [],
  purchaseDate: getCurrentDateString(),
  startDate: getCurrentDateString(),
  pricePerStudent: 0,
  totalAmount: 0,
  alias: "",
  language: "",
  lateFee: undefined,
  suspensionDaysAfterEndDate: 0,
  penalizationMoney: undefined,
};

const weekDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// --- COMPONENTE PRINCIPAL ---
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

  // Inicializar openStudentSections: abrir el primer estudiante, cerrar los demás
  useEffect(() => {
    if (formData.studentIds.length > 0) {
      setOpenStudentSections((prev) => {
        const updated: Record<string, boolean> = {};
        formData.studentIds.forEach((student, index) => {
          const studentKey = student.studentId || `student-${index}`;
          // Si ya existe un estado para este estudiante, mantenerlo; si no, inicializar (primer estudiante abierto)
          updated[studentKey] = prev[studentKey] ?? index === 0;
        });
        return updated;
      });
    }
  }, [formData.studentIds]); // Dependencia completa para detectar cambios en los estudiantes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [openDisolveDialog, setOpenDisolveDialog] = useState(false);
  const [disolveReason, setDisolveReason] = useState("");
  const [openPauseDialog, setOpenPauseDialog] = useState(false);
  const [openResumeDialog, setOpenResumeDialog] = useState(false);
  const [resumeStartDate, setResumeStartDate] = useState("");

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
        // Handle API response structure for plans
        setPlans(planData.plans || planData || []);
        // Filtrar solo estudiantes activos (status === 1)
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

  useEffect(() => {
    if (!plans || !Array.isArray(plans)) return;
    const selectedPlan = plans.find((p) => p._id === formData.planId);
    if (!selectedPlan) return;

    let pricePerStudent = 0;
    let enrollmentType: "single" | "couple" | "group" = "group";

    const studentCount = formData.studentIds.length;
    if (studentCount === 1) {
      pricePerStudent = selectedPlan.pricing.single;
      enrollmentType = "single";
    } else if (studentCount === 2) {
      pricePerStudent = selectedPlan.pricing.couple;
      enrollmentType = "couple";
    } else if (studentCount > 2) {
      pricePerStudent = selectedPlan.pricing.group;
      enrollmentType = "group";
    }

    const totalAmount = pricePerStudent * studentCount;

    setFormData((prev) => ({
      ...prev,
      pricePerStudent,
      totalAmount,
      enrollmentType,
    }));
  }, [formData.planId, formData.studentIds, plans]);

  const handleOpen = (
    type: "create" | "edit" | "status",
    enrollment?: Enrollment
  ) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedEnrollment(null);
      setFormData(initialEnrollmentState);
    } else if (enrollment) {
      setSelectedEnrollment(enrollment);
      if (type === "edit") {
        const scheduledDaysArray =
          enrollment.scheduledDays?.map((d) => d.day) || [];
        // Transformar studentIds: puede venir como StudentEnrollmentInfo[] o StudentBrief[]
        // studentId puede ser un string o un objeto StudentBrief
        const studentIdsArray = enrollment.studentIds.map((s: any) => {
          // Extraer el ID del estudiante: puede ser string directo o objeto con _id
          let studentIdValue: string;
          if (typeof s.studentId === "object" && s.studentId !== null) {
            // Si studentId es un objeto, tomar su _id
            studentIdValue = s.studentId._id || s.studentId;
          } else if (s.studentId) {
            // Si studentId es un string
            studentIdValue = s.studentId;
          } else {
            // Fallback: usar _id del objeto si existe
            studentIdValue = s._id || "";
          }
          
          return {
            studentId: studentIdValue,
            preferences: s.preferences || "",
            firstTimeLearningLanguage: s.firstTimeLearningLanguage || "",
            previousExperience: s.previousExperience || "",
            goals: s.goals || "",
            dailyLearningTime: s.dailyLearningTime || "",
            learningType: s.learningType || "",
            idealClassType: s.idealClassType || "",
            learningDifficulties: s.learningDifficulties || "",
            languageLevel: s.languageLevel || "",
            experiencePastClass: s.experiencePastClass || "",
            howWhereTheClasses: s.howWhereTheClasses || "",
            roleGroup: s.roleGroup || "",
            willingHomework: s.willingHomework !== undefined && s.willingHomework !== null ? s.willingHomework : undefined,
          };
        });
        setFormData({
          planId: enrollment.planId._id,
          studentIds: studentIdsArray,
          professorId: enrollment.professorId?._id || "",
          enrollmentType: enrollment.enrollmentType,
          scheduledDays: scheduledDaysArray,
          purchaseDate: extractDatePart(enrollment.purchaseDate),
          startDate: enrollment.startDate
            ? extractDatePart(enrollment.startDate)
            : getCurrentDateString(),
          pricePerStudent: enrollment.pricePerStudent,
          totalAmount: enrollment.totalAmount,
          status: enrollment.status,
          alias: enrollment.alias || "",
          language: enrollment.language || "",
          substituteProfessor: enrollment.substituteProfessor
            ? {
                professorId: enrollment.substituteProfessor.professorId,
                status: enrollment.substituteProfessor.status || 1,
                assignedDate: extractDatePart(
                  enrollment.substituteProfessor.assignedDate
                ),
                expiryDate: extractDatePart(
                  enrollment.substituteProfessor.expiryDate
                ),
              }
            : null,
          lateFee: enrollment.lateFee ?? undefined,
          suspensionDaysAfterEndDate: enrollment.suspensionDaysAfterEndDate ?? 0,
          penalizationMoney: enrollment.penalizationMoney ?? undefined,
        });
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

    // Validaciones de campos obligatorios
    if (!formData.planId) {
      setDialogError("Plan is required.");
      setIsSubmitting(false);
      return;
    }

    if (!formData.studentIds || formData.studentIds.length === 0) {
      setDialogError("At least one student is required.");
      setIsSubmitting(false);
      return;
    }

    // Validar campos obligatorios de información del estudiante
    for (let i = 0; i < formData.studentIds.length; i++) {
      const student = formData.studentIds[i];
      const studentName = students.find((s) => s._id === student.studentId)?.name || `Student ${i + 1}`;
      
      if (!student.goals?.trim()) {
        setDialogError(`${studentName}: Main goal is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.preferences?.trim()) {
        setDialogError(`${studentName}: Preferences is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.learningType?.trim()) {
        setDialogError(`${studentName}: At least one learning type must be selected.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.firstTimeLearningLanguage?.trim()) {
        setDialogError(`${studentName}: First time learning a language is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.previousExperience?.trim()) {
        setDialogError(`${studentName}: Previous experience is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.experiencePastClass?.trim()) {
        setDialogError(`${studentName}: How was that experience is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.howWhereTheClasses?.trim()) {
        setDialogError(`${studentName}: How were the classes is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.roleGroup?.trim()) {
        setDialogError(`${studentName}: Role in a group is required.`);
        setIsSubmitting(false);
        return;
      }
      
      
      if (!student.dailyLearningTime?.trim()) {
        setDialogError(`${studentName}: ATP (per day) is required.`);
        setIsSubmitting(false);
        return;
      }
      
      if (!student.learningDifficulties?.trim()) {
        setDialogError(`${studentName}: Learning difficulties is required.`);
        setIsSubmitting(false);
        return;
      }
    }

    if (!formData.professorId) {
      setDialogError("Professor is required.");
      setIsSubmitting(false);
      return;
    }

    if (!formData.scheduledDays || formData.scheduledDays.length === 0) {
      setDialogError("At least one scheduled day is required.");
      setIsSubmitting(false);
      return;
    }

    // Validar que la cantidad de días seleccionados coincida con weeklyClasses del plan
    const selectedPlan = plans.find((p) => p._id === formData.planId);
    if (selectedPlan && formData.scheduledDays.length !== selectedPlan.weeklyClasses) {
      setDialogError(
        `The selected plan requires ${selectedPlan.weeklyClasses} classes per week. Please select exactly ${selectedPlan.weeklyClasses} days.`
      );
      setIsSubmitting(false);
      return;
    }

    if (!formData.startDate) {
      setDialogError("Start date is required.");
      setIsSubmitting(false);
      return;
    }

    if (!formData.language) {
      setDialogError("Language is required.");
      setIsSubmitting(false);
      return;
    }

    if (formData.lateFee === undefined || formData.lateFee === null || formData.lateFee < 0) {
      setDialogError("Late fee is required and must be a non-negative number.");
      setIsSubmitting(false);
      return;
    }

    // Convertir fechas a formato ISO
    const purchaseDateISO = formData.purchaseDate
      ? dateStringToISO(formData.purchaseDate)
      : new Date().toISOString();

    const startDateISO = formData.startDate
      ? dateStringToISO(formData.startDate)
      : new Date().toISOString();

    // Transformar studentIds: ya son objetos, pero limpiar campos vacíos
    const studentIdsPayload = formData.studentIds.map((student) => {
      const payload: any = {
        studentId: student.studentId,
      };
      // Agregar campos opcionales solo si tienen valor
      if (student.preferences?.trim())
        payload.preferences = student.preferences.trim();
      if (student.firstTimeLearningLanguage?.trim())
        payload.firstTimeLearningLanguage =
          student.firstTimeLearningLanguage.trim();
      if (student.previousExperience?.trim())
        payload.previousExperience = student.previousExperience.trim();
      if (student.goals?.trim()) payload.goals = student.goals.trim();
      if (student.dailyLearningTime?.trim())
        payload.dailyLearningTime = student.dailyLearningTime.trim();
      if (student.learningType?.trim())
        payload.learningType = student.learningType.trim();
      if (student.idealClassType?.trim())
        payload.idealClassType = student.idealClassType.trim();
      if (student.learningDifficulties?.trim())
        payload.learningDifficulties = student.learningDifficulties.trim();
      if (student.languageLevel?.trim())
        payload.languageLevel = student.languageLevel.trim();
      if (student.experiencePastClass?.trim())
        payload.experiencePastClass = student.experiencePastClass.trim();
      if (student.howWhereTheClasses?.trim())
        payload.howWhereTheClasses = student.howWhereTheClasses.trim();
      if (student.roleGroup?.trim())
        payload.roleGroup = student.roleGroup.trim();
      if (student.willingHomework !== undefined && student.willingHomework !== null)
        payload.willingHomework = student.willingHomework;
      return payload;
    });

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

    // Agregar campos opcionales solo si tienen valor
    if (formData.alias) {
      payload.alias = formData.alias;
    }

    // Campos obligatorios según la documentación
    if (formData.lateFee !== undefined && formData.lateFee !== null) {
      payload.lateFee = formData.lateFee;
    } else {
      payload.lateFee = 0; // Valor por defecto si no se especifica
    }
    
    // Campos opcionales
    if (formData.penalizationMoney !== undefined && formData.penalizationMoney !== null) {
      payload.penalizationMoney = formData.penalizationMoney;
    }

    // Agregar substituteProfessor si existe (solo al editar)
    // El status se maneja internamente, siempre se envía como 1
    if (
      openDialog === "edit" &&
      formData.substituteProfessor &&
      formData.substituteProfessor.professorId
    ) {
      payload.substituteProfessor = {
        professorId: formData.substituteProfessor.professorId,
        status: 1, // Siempre 1, se maneja internamente
        assignedDate: dateStringToISO(
          formData.substituteProfessor.assignedDate
        ),
        expiryDate: dateStringToISO(formData.substituteProfessor.expiryDate),
      };
    }

    // Para edición, incluir status si existe
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
        // Validar estructura de respuesta
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
        // Validar estructura de respuesta
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
      // Determinar si está activo o inactivo basado en status
      // Solo permitir toggle entre activo (1) e inactivo (2)
      // No se puede cambiar status 0 (disuelto) ni 3 (pausado) con toggle
      if (selectedEnrollment.status === 0) {
        setDialogError("Cannot change status of a dissolved enrollment.");
        setIsSubmitting(false);
        return;
      }
      if (selectedEnrollment.status === 3) {
        setDialogError("Cannot toggle status of a paused enrollment. Please edit the enrollment to change its status.");
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

      // Validar estructura de respuesta
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
      setDialogError(errorMessage); // Mostrar error dentro del modal
    } finally {
      setIsSubmitting(false);
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

  const columns: ColumnDef<Enrollment>[] = [
    // Alias o lista de estudiantes (string plano)
    {
      id: "aliasOrStudents",
      accessorFn: (row) => {
        // Si hay alias, usarlo
        if (row.alias?.trim()) return row.alias.trim();
        // Si no, extraer nombres de studentIds
        return row.studentIds
          .map((s: any) => {
            // Si studentId es un objeto (StudentBrief), tomar su name
            if (s.studentId && typeof s.studentId === "object" && s.studentId.name) {
              return s.studentId.name;
            }
            // Si studentId es un string, buscar en el array de students
            if (typeof s.studentId === "string") {
              return "N/A";
            }
            // Si tiene name directamente (StudentBrief)
            if (s.name) return s.name;
            return "";
          })
          .filter(Boolean)
          .join(", ");
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Alias / Students
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => {
        const alias = row.original.alias;
        if (alias?.trim()) return alias;
        // Extraer nombres de studentIds
        return row.original.studentIds
          .map((s: any) => {
            // Si studentId es un objeto (StudentBrief), tomar su name
            if (s.studentId && typeof s.studentId === "object" && s.studentId.name) {
              return s.studentId.name;
            }
            // Si studentId es un string, buscar en el array de students
            if (typeof s.studentId === "string") {
              const student = students.find((st) => st._id === s.studentId);
              return student?.name || "N/A";
            }
            // Si tiene name directamente (StudentBrief)
            if (s.name) return s.name;
            return "N/A";
          })
          .join(", ");
      },
    },
    // Language
    {
      id: "language",
      accessorFn: (row) => row.language || "N/A",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Language
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.language || "N/A",
    },
    // Plan + tipo (string plano)
    {
      id: "planWithType",
      accessorFn: (row) => {
        const planName = row.planId.name;
        const type =
          row.enrollmentType === "single"
            ? "Single"
            : row.enrollmentType === "couple"
            ? "Couple"
            : "Group";
        return `${type} - ${planName}`;
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Plan
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => {
        const planName = row.original.planId.name;
        const t = row.original.enrollmentType;
        const type =
          t === "single" ? "Single" : t === "couple" ? "Couple" : "Group";
        return (
          <div>
            {type} - {planName}
          </div>
        );
      },
    },

    // Profesor (string plano)
    {
      id: "professor",
      accessorFn: (row) => row.professorId?.name || "N/A",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Professor
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => row.original.professorId?.name || "N/A",
    },

    // Status (si prefieres alfabético, lo exponemos como texto)
    {
      id: "statusText",
      accessorFn: (row) =>
        row.status === 1
          ? "Active"
          : row.status === 2
          ? "Inactive"
          : row.status === 3
          ? "Paused"
          : "Disolved",
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
      sortingFn: stringLocaleSort(), // 👈 alfabético
      cell: ({ row }) => {
        const status = row.original.status;
        const statusText =
          status === 1
            ? "Active"
            : status === 2
            ? "Inactive"
            : status === 3
            ? "Paused"
            : "Disolved";
        const statusClass =
          status === 1
            ? "bg-secondary/20 text-secondary"
            : status === 2
            ? "bg-accent-1/20 text-accent-1"
            : status === 3
            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}
          >
            {statusText}
          </span>
        );
      },
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
            asChild
          >
            <Link href={`/enrollments/${row.original._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => handleOpen("edit", row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
            onClick={() => handleOpen("status", row.original)}
            disabled={row.original.status === 0 || row.original.status === 3}
          >
            {row.original.status === 1 ? (
              <Ban className="h-4 w-4 text-accent-1" />
            ) : row.original.status === 2 ? (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            ) : (
              <Ban className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];

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
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="French">French</SelectItem>
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

              {/* Campos obligatorios para cada estudiante */}
              {formData.studentIds.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Student Information <span className="text-red-500">*</span>
                  </h3>
                  {formData.studentIds.map((student, index) => {
                    const studentName =
                      students.find((s) => s._id === student.studentId)?.name ||
                      `Student ${index + 1}`;
                    const studentKey = student.studentId || `student-${index}`;
                    const isOpen = openStudentSections[studentKey] || false;
                    return (
                      <Collapsible
                        key={studentKey}
                        open={isOpen}
                        onOpenChange={(open) =>
                          setOpenStudentSections((prev) => ({
                            ...prev,
                            [studentKey]: open,
                          }))
                        }
                        className="border rounded-md"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-4 h-auto bg-secondary/20 hover:bg-secondary/30 dark:bg-secondary/10 dark:hover:bg-secondary/20"
                          >
                            <span className="text-sm font-semibold">
                              {studentName}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isOpen ? "transform rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Language level */}
                            <div className="space-y-2">
                              <Label>Language level <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.languageLevel || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    languageLevel: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Beginner, Intermediate, Advanced"
                                required
                              />
                            </div>
                            {/* Main goal */}
                            <div className="space-y-2">
                              <Label>Main goal <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.goals || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    goals: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Learn English for travel"
                                required
                              />
                            </div>
                            {/* Preferences */}
                            <div className="space-y-2">
                              <Label>Preferences <span className="text-red-500">*</span></Label>
                              <Textarea
                                value={student.preferences || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    preferences: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Prefers practical and conversational classes"
                                rows={2}
                                required
                              />
                            </div>
                            {/* Ideal class */}
                            <div className="space-y-2">
                              <Label>Ideal class <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.idealClassType || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    idealClassType: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Individual classes"
                                required
                              />
                            </div>
                            {/* Learning type - Multiple checkboxes */}
                            <div className="space-y-2 md:col-span-2">
                              <Label>Learning type <span className="text-red-500">*</span></Label>
                              <div className="space-y-2 border rounded-md p-4">
                                {["Visual", "Auditivo", "Verbal", "Lógico", "Kinestésico"].map((type) => {
                                  const learningTypes = student.learningType ? student.learningType.split(",").map((t: string) => t.trim()) : [];
                                  const isChecked = learningTypes.includes(type);
                                  return (
                                    <div key={type} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`learningType-${studentKey}-${type}`}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const updated = [...formData.studentIds];
                                          let currentTypes = learningTypes;
                                          if (e.target.checked) {
                                            if (!currentTypes.includes(type)) {
                                              currentTypes.push(type);
                                            }
                                          } else {
                                            currentTypes = currentTypes.filter((t: string) => t !== type);
                                          }
                                          updated[index] = {
                                            ...updated[index],
                                            learningType: currentTypes.join(", "),
                                          };
                                          setFormData((p) => ({
                                            ...p,
                                            studentIds: updated,
                                          }));
                                        }}
                                        className="h-4 w-4 rounded border-gray-300"
                                      />
                                      <Label htmlFor={`learningType-${studentKey}-${type}`} className="cursor-pointer font-semibold text-primary">
                                        {type}
                                      </Label>
                                      {type === "Visual" && <span className="text-sm text-muted-foreground">- Aprende mejor con imágenes, colores y gráficos.</span>}
                                      {type === "Auditivo" && <span className="text-sm text-muted-foreground">- Retiene información al escuchar explicaciones o música.</span>}
                                      {type === "Verbal" && <span className="text-sm text-muted-foreground">- Aprende mejor mediante el lenguaje hablado y escrito. Se beneficia de explicaciones, debates y lectura para procesar información.</span>}
                                      {type === "Lógico" && <span className="text-sm text-muted-foreground">- Se enfoca en patrones, estructuras y razonamientos analíticos.</span>}
                                      {type === "Kinestésico" && <span className="text-sm text-muted-foreground">- Prefiere actividades prácticas y el aprendizaje mediante movimiento.</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {/* First time learning a language */}
                            <div className="space-y-2">
                              <Label>First time learning a language <span className="text-red-500">*</span></Label>
                              <Select
                                value={student.firstTimeLearningLanguage || ""}
                                onValueChange={(v) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    firstTimeLearningLanguage: v,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Previous experience */}
                            <div className="space-y-2">
                              <Label>Previous experience <span className="text-red-500">*</span></Label>
                              <Select
                                value={student.previousExperience || ""}
                                onValueChange={(v) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    previousExperience: v,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="online">Online</SelectItem>
                                  <SelectItem value="on-site classes">On-site classes</SelectItem>
                                  <SelectItem value="self-taught">Self-taught</SelectItem>
                                  <SelectItem value="online & on-site">Online & on-site</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* How was that experience (experiencePastClass) */}
                            <div className="space-y-2">
                              <Label>How was that experience <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.experiencePastClass || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    experiencePastClass: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Very positive, learned a lot"
                                required
                              />
                            </div>
                            {/* How were the classes */}
                            <div className="space-y-2">
                              <Label>How were the classes <span className="text-red-500">*</span></Label>
                              <Select
                                value={student.howWhereTheClasses || ""}
                                onValueChange={(v) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    howWhereTheClasses: v,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="personalized">Personalized</SelectItem>
                                  <SelectItem value="group lessons">Group lessons</SelectItem>
                                  <SelectItem value="n/a">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Role in a group - Multiple checkboxes */}
                            <div className="space-y-2 md:col-span-2">
                              <Label>Role in a group <span className="text-red-500">*</span></Label>
                              <div className="space-y-2 border rounded-md p-4">
                                {[
                                  "Coordinador: Me gusta tomar la iniciativa y liderar",
                                  "Participante: Prefiero contribuir activamente y apoyar",
                                  "Observador: Soy más de observar y participar cuando se me indica",
                                  "Adaptativo: Me adapto a lo que el grupo necesite",
                                  "Prefiero aprender de manera individual."
                                ].map((role) => {
                                  const roleGroups = student.roleGroup ? student.roleGroup.split(",").map((r: string) => r.trim()) : [];
                                  const isChecked = roleGroups.includes(role);
                                  return (
                                    <div key={role} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`roleGroup-${studentKey}-${role}`}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const updated = [...formData.studentIds];
                                          let currentRoles = roleGroups;
                                          if (e.target.checked) {
                                            if (!currentRoles.includes(role)) {
                                              currentRoles.push(role);
                                            }
                                          } else {
                                            currentRoles = currentRoles.filter((r: string) => r !== role);
                                          }
                                          updated[index] = {
                                            ...updated[index],
                                            roleGroup: currentRoles.join(", "),
                                          };
                                          setFormData((p) => ({
                                            ...p,
                                            studentIds: updated,
                                          }));
                                        }}
                                        className="h-4 w-4 rounded border-gray-300"
                                      />
                                      <Label htmlFor={`roleGroup-${studentKey}-${role}`} className="cursor-pointer font-semibold text-primary">
                                        {role}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Willingness to do homework */}
                            <div className="space-y-2 flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`willingHomework-${studentKey}`}
                                checked={student.willingHomework === 1}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    willingHomework: e.target.checked ? 1 : undefined,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label htmlFor={`willingHomework-${studentKey}`} className="cursor-pointer">
                                Willingness to do homework
                              </Label>
                            </div>
                            {/* ATP (per day) */}
                            <div className="space-y-2">
                              <Label>Availability To Practice (per day) <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.dailyLearningTime || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    dailyLearningTime: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., 1 hour per day"
                                required
                              />
                            </div>
                            {/* Learning difficulties */}
                            <div className="space-y-2 md:col-span-2">
                              <Label>Learning difficulties <span className="text-red-500">*</span></Label>
                              <Input
                                value={student.learningDifficulties || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    learningDifficulties: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Difficulty with pronunciation"
                                required
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
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
                  items={weekDays.map((d) => ({ _id: d, name: d }))}
                  selectedIds={formData.scheduledDays}
                  onSelectedChange={(days) =>
                    setFormData((p) => ({ ...p, scheduledDays: days }))
                  }
                  placeholder="Select days..."
                />
                {formData.planId && (() => {
                  const selectedPlan = plans.find((p) => p._id === formData.planId);
                  const requiredDays = selectedPlan?.weeklyClasses || 0;
                  const selectedDaysCount = formData.scheduledDays.length;
                  if (selectedPlan && requiredDays > 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        {selectedDaysCount === requiredDays ? (
                          <span className="text-green-600">✓ Correct number of days selected ({requiredDays})</span>
                        ) : selectedDaysCount < requiredDays ? (
                          <span className="text-amber-600">
                            Select {requiredDays - selectedDaysCount} more day{requiredDays - selectedDaysCount > 1 ? 's' : ''} (Plan requires {requiredDays} days per week)
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Too many days selected. Plan requires only {requiredDays} day{requiredDays > 1 ? 's' : ''} per week.
                          </span>
                        )}
                      </p>
                    );
                  }
                  return null;
                })()}
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
                    value={formData.startDate || getCurrentDateString()}
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
                    value={formData.lateFee !== undefined && formData.lateFee !== null ? formData.lateFee : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        lateFee: value === "" ? undefined : (parseInt(value) || 0),
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
                    value={formData.penalizationMoney !== undefined && formData.penalizationMoney !== null ? formData.penalizationMoney : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        penalizationMoney: value === "" ? undefined : (parseFloat(value) || 0),
                      }));
                    }}
                    placeholder="e.g., 10.50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount of money for the penalization applied due to late payment
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
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="2">Inactive</SelectItem>
                      <SelectItem value="3">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  <div className="space-y-4 p-4 border rounded-md">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Substitute Professor
                      </Label>
                      {formData.substituteProfessor && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              substituteProfessor: null,
                            }))
                          }
                          className="text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    {formData.substituteProfessor ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Professor</Label>
                          <Select
                            value={formData.substituteProfessor.professorId}
                            onValueChange={(v) => {
                              const currentDate = getCurrentDateString();
                              setFormData((p) => ({
                                ...p,
                                substituteProfessor: {
                                  professorId: v,
                                  status: 1,
                                  assignedDate: currentDate,
                                  expiryDate: addDaysToDate(currentDate, 3),
                                },
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select substitute professor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {professors
                                .filter(
                                  (p) => p._id !== formData.professorId
                                )
                                .map((p) => (
                                  <SelectItem key={p._id} value={p._id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Assigned Date</Label>
                          <Input
                            type="date"
                            max="9999-12-31"
                            value={formData.substituteProfessor.assignedDate}
                            onChange={(e) => {
                              const newAssignedDate = e.target.value;
                              setFormData((p) => ({
                                ...p,
                                substituteProfessor: p.substituteProfessor
                                  ? {
                                      ...p.substituteProfessor,
                                      assignedDate: newAssignedDate,
                                      expiryDate: addDaysToDate(
                                        newAssignedDate,
                                        3
                                      ),
                                    }
                                  : null,
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input
                            type="date"
                            max="9999-12-31"
                            value={formData.substituteProfessor.expiryDate}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                substituteProfessor: p.substituteProfessor
                                  ? {
                                      ...p.substituteProfessor,
                                      expiryDate: e.target.value,
                                    }
                                  : null,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value=""
                          onValueChange={(v) => {
                            const currentDate = getCurrentDateString();
                            setFormData((p) => ({
                              ...p,
                              substituteProfessor: {
                                professorId: v,
                                status: 1,
                                assignedDate: currentDate,
                                expiryDate: addDaysToDate(currentDate, 3),
                              },
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select substitute professor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {professors
                              .filter((p) => p._id !== formData.professorId)
                              .map((p) => (
                                <SelectItem key={p._id} value={p._id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
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
                            setResumeStartDate(getCurrentDateString());
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

      {/* Modal de confirmación de Disolve */}
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
            <Button variant="outline" onClick={handleDisolveClose} disabled={isSubmitting}>
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

      {/* Modal de confirmación de Pause */}
      <Dialog
        open={openPauseDialog}
        onOpenChange={(isOpen) => !isOpen && handlePauseClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pause Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause this enrollment? The enrollment will be temporarily suspended.
            </DialogDescription>
          </DialogHeader>
          {dialogError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handlePauseClose} disabled={isSubmitting}>
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

      {/* Modal de confirmación de Resume */}
      <Dialog
        open={openResumeDialog}
        onOpenChange={(isOpen) => !isOpen && handleResumeClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Enrollment</DialogTitle>
            <DialogDescription>
              Enter the new start date to resume this paused enrollment. Pending classes will be rescheduled.
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
            <Button variant="outline" onClick={handleResumeClose} disabled={isSubmitting}>
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
                This enrollment is paused. Please edit the enrollment to change its status.
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
              disabled={isSubmitting || selectedEnrollment?.status === 0 || selectedEnrollment?.status === 3}
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

// --- COMPONENTE MULTI-SELECT REUTILIZABLE ---
function MultiSelect({
  items,
  selectedIds,
  onSelectedChange,
  placeholder,
}: {
  items: { _id: string; name: string }[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onSelectedChange(newSelectedIds);
  };

  const selectedItems = items.filter((item) => selectedIds.includes(item._id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0
              ? selectedItems.map((item) => (
                  <span
                    key={item._id}
                    className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {item.name}
                    <div
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item._id);
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </div>
                  </span>
                ))
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => handleSelect(item._id)}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- COMPONENTE MULTI-SELECT PARA ESTUDIANTES CON CAMPOS OPCIONALES ---
function StudentMultiSelect({
  items,
  selectedStudents,
  onSelectedChange,
  placeholder,
}: {
  items: { _id: string; name: string }[];
  selectedStudents: StudentEnrollmentFormData[];
  onSelectedChange: (students: StudentEnrollmentFormData[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    const isSelected = selectedStudents.some((s) => s.studentId === id);
    let newSelectedStudents: StudentEnrollmentFormData[];

    if (isSelected) {
      // Remover estudiante
      newSelectedStudents = selectedStudents.filter((s) => s.studentId !== id);
    } else {
      // Agregar estudiante con objeto inicializado
      newSelectedStudents = [
        ...selectedStudents,
        {
          studentId: id,
          preferences: "",
          firstTimeLearningLanguage: "",
          previousExperience: "",
          goals: "",
          dailyLearningTime: "",
          learningType: "",
          idealClassType: "",
          learningDifficulties: "",
          languageLevel: "",
          experiencePastClass: "",
          howWhereTheClasses: "",
          roleGroup: "",
          willingHomework: undefined,
        },
      ];
    }
    onSelectedChange(newSelectedStudents);
  };

  const selectedItems = items.filter((item) =>
    selectedStudents.some((s) => s.studentId === item._id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0
              ? selectedItems.map((item) => (
                  <span
                    key={item._id}
                    className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {item.name}
                    <div
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item._id);
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </div>
                  </span>
                ))
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => handleSelect(item._id)}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
