/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  formatDateForDisplay,
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

// --- DEFINICIONES DE TIPOS ---
interface Plan {
  _id: string;
  name: string;
  pricing: { single: number; couple: number; group: number };
}
interface StudentBrief {
  _id: string;
  name: string;
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
  pricePerStudent: number;
  totalAmount: number;
  status: number; // 1=activo, 2=inactivo, 0=disuelto, 3=pausado
  alias?: string;
  language?: string;
  available_balance?: number;
  classCalculationType?: number;
  substituteProfessor?: SubstituteProfessor | null;
}

type StudentEnrollmentFormData = {
  studentId: string;
  preferences?: string;
  firstTimeLearningLanguage?: string;
  previousExperience?: string;
  goals?: string;
  dailyLearningTime?: string;
  learningType?: string;
  idealClassType?: string;
  learningDifficulties?: string;
  languageLevel?: string;
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
  classCalculationType: 1,
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
    "create" | "edit" | "status" | "view" | null
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
        setStudents(studentData);
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
    type: "create" | "edit" | "status" | "view",
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
          classCalculationType: enrollment.classCalculationType || 1,
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

  const handleDisolveConfirm = () => {
    // Por ahora solo cerramos el modal y limpiamos el estado
    // TODO: Conectar con endpoint cuando esté disponible
    console.log("Disolve reason:", disolveReason);
    handleDisolveClose();
    // Opcionalmente cerrar también el modal de edición
    // handleClose();
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

    // classCalculationType solo se envía al crear, no al editar
    if (openDialog === "create") {
      payload.classCalculationType = formData.classCalculationType || 1;
    }

    // Agregar campos opcionales solo si tienen valor
    if (formData.alias) {
      payload.alias = formData.alias;
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
        open={
          openDialog === "create" ||
          openDialog === "edit" ||
          openDialog === "view"
        }
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Create Enrollment"}
              {openDialog === "edit" && "Edit Enrollment"}
              {openDialog === "view" && "Enrollment Details"}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
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
                <div className="space-y-2">
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

              {/* Campos opcionales para cada estudiante */}
              {formData.studentIds.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Student Information (Optional)
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
                            className="w-full justify-between p-4 h-auto hover:bg-muted/50"
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
                            <div className="space-y-2">
                              <Label>Preferences</Label>
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>First Time Learning Language</Label>
                              <Input
                                value={student.firstTimeLearningLanguage || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    firstTimeLearningLanguage: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Yes, this is the first time"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Previous Experience</Label>
                              <Input
                                value={student.previousExperience || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    previousExperience: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., No previous experience"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Goals</Label>
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Daily Learning Time</Label>
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Learning Type</Label>
                              <Input
                                value={student.learningType || ""}
                                onChange={(e) => {
                                  const updated = [...formData.studentIds];
                                  updated[index] = {
                                    ...updated[index],
                                    learningType: e.target.value,
                                  };
                                  setFormData((p) => ({
                                    ...p,
                                    studentIds: updated,
                                  }));
                                }}
                                placeholder="e.g., Visual and auditory"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Ideal Class Type</Label>
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
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Learning Difficulties</Label>
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
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Language Level</Label>
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
                                placeholder="e.g., Beginner"
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
              {(formData.enrollmentType === "couple" ||
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
                <Label>Language</Label>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
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
                  <Label>Class Calculation Type</Label>
                  {openDialog === "create" ? (
                    <Select
                      value={formData.classCalculationType?.toString() || "1"}
                      onValueChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          classCalculationType: parseInt(v),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select calculation type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Normal (Monthly)</SelectItem>
                        <SelectItem value="2">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={
                        formData.classCalculationType === 2
                          ? "Weekly"
                          : "Normal (Monthly)"
                      }
                      disabled
                      className="bg-muted"
                    />
                  )}
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
                  {openDialog === "edit" && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setOpenDisolveDialog(true)}
                    >
                      Disolve
                    </Button>
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

          {openDialog === "view" && selectedEnrollment && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {(selectedEnrollment.enrollmentType === "couple" ||
                  selectedEnrollment.enrollmentType === "group") && (
                  <div>
                    <Label className="font-semibold">Alias</Label>
                    <p className="text-sm">
                      {selectedEnrollment.alias || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="font-semibold">Students</Label>
                  <p className="text-sm">
                    {selectedEnrollment.studentIds
                      .map((s: any) => {
                        // Si studentId es un objeto (StudentBrief), tomar su name
                        if (s.studentId && typeof s.studentId === "object" && s.studentId.name) {
                          return s.studentId.name;
                        }
                        // Si studentId es un string, buscar en el array de students
                        if (typeof s.studentId === "string") {
                          const student = students.find(
                            (st) => st._id === s.studentId
                          );
                          return student?.name || "N/A";
                        }
                        // Si tiene name directamente (StudentBrief)
                        if (s.name) return s.name;
                        return "N/A";
                      })
                      .join(", ")}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Plan</Label>
                  <p className="text-sm">{selectedEnrollment.planId.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Professor</Label>
                  <p className="text-sm">
                    {selectedEnrollment.professorId?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Purchase Date</Label>
                  <p className="text-sm">
                    {formatDateForDisplay(selectedEnrollment.purchaseDate)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedEnrollment.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : selectedEnrollment.status === 2
                        ? "bg-accent-1/20 text-accent-1"
                        : selectedEnrollment.status === 3
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {selectedEnrollment.status === 1
                      ? "Active"
                      : selectedEnrollment.status === 2
                      ? "Inactive"
                      : selectedEnrollment.status === 3
                      ? "Paused"
                      : "Disolved"}
                  </span>
                </div>
                <div>
                  <Label className="font-semibold">Start Date</Label>
                  <p className="text-sm">
                    {selectedEnrollment.startDate
                      ? formatDateForDisplay(selectedEnrollment.startDate)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Scheduled Days</Label>
                  <p className="text-sm">
                    {selectedEnrollment.scheduledDays
                      ?.map((d) => d.day)
                      .join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Language</Label>
                  <p className="text-sm">
                    {selectedEnrollment.language || "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-md bg-muted/30">
                <div>
                  <Label className="font-semibold">Enrollment Type</Label>
                  <p className="font-semibold capitalize">
                    {selectedEnrollment.enrollmentType}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Price per Student</Label>
                  <p className="font-semibold">
                    ${selectedEnrollment.pricePerStudent.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Total Amount</Label>
                  <p className="font-semibold">
                    ${selectedEnrollment.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </div>
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
            <Button variant="outline" onClick={handleDisolveClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisolveConfirm}
              disabled={!disolveReason.trim()}
            >
              Confirm Disolve
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
