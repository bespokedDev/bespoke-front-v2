/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
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
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  ArrowUpDown,
  ChevronsUpDown,
  Pencil,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatDateForDisplay,
  getCurrentDateString,
  dateStringToISO,
  extractDatePart,
} from "@/lib/dateUtils";
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

// --- DEFINICIONES DE TIPOS ---
interface Divisa {
  _id: string;
  name: string;
}
interface PaymentMethod {
  _id: string;
  name: string;
  type: string;
}
interface ProfessorBrief {
  _id: string;
  name: string;
  ciNumber: string;
}
interface StudentBrief {
  _id: string;
  name: string;
  studentCode: string;
}
interface PlanBrief {
  _id: string;
  name: string;
}
interface EnrollmentBrief {
  _id: string;
  studentIds: Array<{ studentId: StudentBrief }>;
  planId: PlanBrief;
  professorId: ProfessorBrief;
  enrollmentType: string;
  purchaseDate: string;
  pricePerStudent: number;
  totalAmount: number;
  status: string;
  alias?: string;
}
interface PenalizationRegistryBrief {
  _id: string;
  penalization_description: string;
  penalizationMoney?: number | null;
  idPenalizacion?: {
    _id: string;
    name: string;
  } | null;
  enrollmentId?: {
    _id: string;
    alias?: string | null;
  } | null;
  professorId?: {
    _id: string;
    name: string;
  } | null;
  studentId?: {
    _id: string;
    name: string;
  } | null;
}

interface Income {
  _id: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  idDivisa: Divisa;
  idProfessor: ProfessorBrief;
  note: string;
  idPaymentMethod: PaymentMethod;
  idEnrollment: EnrollmentBrief;
  idPenalization?: PenalizationRegistryBrief | null;
  income_date: string;
  createdAt: string;
  updatedAt: string;
}
type IncomeFormData = {
  income_date?: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  idDivisa: string;
  idProfessor: string;
  note: string;
  idPaymentMethod: string;
  idEnrollment: string;
  idPenalization?: string | null;
};

interface SummaryItem {
  paymentMethodId: string;
  paymentMethodName: string;
  totalAmount: number;
  numberOfIncomes: number;
}

const initialIncomeState: IncomeFormData = {
  income_date: getCurrentDateString(), // Fecha actual por defecto
  deposit_name: "",
  amount: 0,
  amountInDollars: 0,
  tasa: 1,
  idDivisa: "",
  idProfessor: "",
  note: "",
  idPaymentMethod: "",
  idEnrollment: "",
  idPenalization: null,
};

const isEnrollmentStatusActive = (status: EnrollmentBrief["status"]) => {
  if (status === undefined || status === null) {
    return false;
  }

  const normalized = status.toString().trim().toLowerCase();
  return normalized === "1" || normalized === "active";
};

// --- COMPONENTE PRINCIPAL ---
export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);
  const [divisas, setDivisas] = useState<Divisa[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [penalizations, setPenalizations] = useState<PenalizationRegistryBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "delete" | "view" | null
  >(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState<IncomeFormData>(initialIncomeState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryStartDate, setSummaryStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [summaryEndDate, setSummaryEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [
          incomeData,
          enrollmentData,
          professorData,
          divisaData,
          paymentMethodData,
          penalizationData,
        ] = await Promise.all([
          apiClient("api/incomes"),
          apiClient("api/enrollments"),
          apiClient("api/professors"),
          apiClient("api/divisas"),
          apiClient("api/payment-methods"),
          apiClient("api/penalization-registry").catch(() => ({ penalizations: [] })),
        ]);
        console.log("incomeData", incomeData);
        // Normalizar los datos para asegurar que tengan los campos requeridos
        const normalizedIncomes = incomeData.map((income: any) => ({
          ...income,
          amountInDollars:
            income.amountInDollars || income.amount / (income.tasa || 1),
          tasa: income.tasa || 1,
          amount: income.amount || 0,
        }));
        setIncomes(normalizedIncomes);
        setEnrollments(enrollmentData);
        // Ordenar profesores alfabéticamente
        const sortedProfessors = professorData.sort(
          (a: ProfessorBrief, b: ProfessorBrief) => a.name.localeCompare(b.name)
        );
        setProfessors(sortedProfessors);
        setDivisas(divisaData);
        setPaymentMethods(paymentMethodData);
        
        // Procesar penalizaciones: solo activas (status = 1) con penalizationMoney > 0
        const penalizationsResponse = penalizationData;
        let penalizationsArray: PenalizationRegistryBrief[] = [];
        if (penalizationsResponse && typeof penalizationsResponse === "object" && "penalizations" in penalizationsResponse) {
          penalizationsArray = Array.isArray(penalizationsResponse.penalizations) 
            ? penalizationsResponse.penalizations 
            : [];
        } else if (Array.isArray(penalizationsResponse)) {
          penalizationsArray = penalizationsResponse;
        }
        // Filtrar solo penalizaciones activas con penalizationMoney > 0
        const activeMonetaryPenalizations = penalizationsArray.filter(
          (p: any) => p.status === 1 && p.penalizationMoney && p.penalizationMoney > 0
        ) as PenalizationRegistryBrief[];
        setPenalizations(activeMonetaryPenalizations);
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

  const handleGenerateSummaryPdf = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await apiClient(
        `api/incomes/summary-by-payment-method?startDate=${summaryStartDate}&endDate=${summaryEndDate}`
      );

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Incomes Summary by Payment Method", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Period: ${summaryStartDate} to ${summaryEndDate}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [["Payment Method", "Number of Incomes", "Total Amount"]],
        body: response.summary.map((item: SummaryItem) => [
          item.paymentMethodName,
          item.numberOfIncomes,
          `$${item.totalAmount.toFixed(2)}`,
        ]),
        foot: [
          [
            {
              content: "Grand Total",
              colSpan: 2,
              styles: { halign: "right", fontStyle: "bold" },
            },
            `$${response.grandTotalAmount.toFixed(2)}`,
          ],
        ],
        footStyles: {
          fontStyle: "bold",
          fontSize: 11,
          fillColor: [104, 109, 157],
        },
        headStyles: { fillColor: [76, 84, 158] },
      });

      doc.save(`incomes-summary-${summaryStartDate}_${summaryEndDate}.pdf`);
      setIsSummaryModalOpen(false);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to generate report. Please try again."
      );
      alert(errorMessage);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOpen = (
    type: "create" | "edit" | "delete" | "view",
    income?: Income
  ) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedIncome(null);
      setFormData(initialIncomeState);
    } else if (type === "edit" && income) {
      setSelectedIncome(income);
      setFormData({
        income_date: income.income_date
          ? extractDatePart(income.income_date)
          : "",
        deposit_name: income.deposit_name || "",
        amount: income.amount || 0,
        amountInDollars: income.amountInDollars || 0,
        tasa: income.tasa || 1,
        idDivisa: income.idDivisa?._id || "",
        idProfessor: income.idProfessor?._id || "",
        note: income.note || "",
        idPaymentMethod: income.idPaymentMethod?._id || "",
        idEnrollment: income.idEnrollment?._id || "",
        idPenalization: income.idPenalization?._id || null,
      });
    } else if (income) {
      setSelectedIncome(income);
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setFormData(initialIncomeState);
    setSelectedIncome(null);
    setDialogError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required field validations
    if (!formData.deposit_name.trim()) {
      setDialogError("Deposit name is required.");
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setDialogError("Amount is required and must be greater than 0.");
      return;
    }

    if (!formData.idPaymentMethod) {
      setDialogError("Payment method is required.");
      return;
    }

    if (!formData.idDivisa) {
      setDialogError("Currency is required.");
      return;
    }

    // Validation: If a professor is selected, an enrollment must also be selected
    if (formData.idProfessor && !formData.idEnrollment) {
      setDialogError(
        "If you select a professor, you must also select an enrollment."
      );
      return;
    }

    // Validation: idPenalization must be a valid ObjectId if provided
    if (formData.idPenalization && formData.idPenalization.trim() !== "") {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(formData.idPenalization)) {
        setDialogError("Invalid penalization ID format.");
        return;
      }
      // Verify that the penalization exists and is active
      const selectedPenalization = penalizations.find(
        (p) => p._id === formData.idPenalization
      );
      if (!selectedPenalization) {
        setDialogError("Selected penalization is not available or has been deactivated.");
        return;
      }
    }

    setIsSubmitting(true);
    setDialogError(null);
    try {
      // Calcular amountInDollars basado en la tasa (si existe divisa y tasa)
      const selectedDivisa = divisas.find((d) => d._id === formData.idDivisa);
      const isDollar =
        selectedDivisa &&
        (selectedDivisa.name.toLowerCase() === "dollar" ||
          selectedDivisa.name.toLowerCase() === "dólar");
      
      const amountInDollars = isDollar || !formData.tasa || formData.tasa <= 0
        ? formData.amount
        : formData.amount / formData.tasa;

      // income_date siempre debe ser enviado en formato ISO
      const incomeDate = formData.income_date
        ? dateStringToISO(formData.income_date)
        : new Date().toISOString();

      const incomePayload: any = {
        ...formData,
        amountInDollars: amountInDollars,
        income_date: incomeDate,
        // Limpiar campos vacíos (convertir strings vacíos a undefined)
        idDivisa: formData.idDivisa,
        idProfessor: formData.idProfessor || undefined,
        idEnrollment: formData.idEnrollment || undefined,
        note: formData.note || undefined,
        tasa: formData.tasa && formData.tasa > 0 ? formData.tasa : undefined,
      };
      
      // Add idPenalization only if provided
      if (formData.idPenalization && formData.idPenalization.trim() !== "") {
        incomePayload.idPenalization = formData.idPenalization;
      } else {
        incomePayload.idPenalization = null;
      }

      console.log("incomePayload", incomePayload);

      if (openDialog === "create") {
        const response = await apiClient("api/incomes", {
          method: "POST",
          body: JSON.stringify(incomePayload),
        });
        // Actualizar la lista con el nuevo ingreso
        setIncomes((prev) => [...prev, response.income]);
      } else if (openDialog === "edit" && selectedIncome) {
        const response = await apiClient(`api/incomes/${selectedIncome._id}`, {
          method: "PUT",
          body: JSON.stringify(incomePayload),
        });
        // Actualizar el ingreso en la lista
        setIncomes((prev) =>
          prev.map((income) =>
            income._id === selectedIncome._id ? response.income : income
          )
        );
      }

      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isNotFoundError
          ? "Income not found."
          : errorInfo.isConflictError
          ? "An income with this information already exists."
          : "Failed to save income. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIncome) return;
    setIsSubmitting(true);
    setDialogError(null);
    try {
      const response = await apiClient(`api/incomes/${selectedIncome._id}`, {
        method: "DELETE",
      });

      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.income) {
        throw new Error("Invalid response structure from server");
      }

      // Remover el ingreso de la lista
      setIncomes((prev) =>
        prev.filter((income) => income._id !== selectedIncome._id)
      );
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Income not found"
          : errorInfo.isValidationError
          ? "Invalid income ID"
          : "Failed to delete income. Please try again."
      );
      setDialogError(errorMessage);
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

  const columns = useMemo<ColumnDef<Income, any>[]>(() => {
    return [
      {
        id: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Date
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "income_date",
        sortingFn: (rowA: any, rowB: any) => {
          const dateA = extractDatePart(
            String(rowA.original.income_date || "")
          );
          const dateB = extractDatePart(
            String(rowB.original.income_date || "")
          );
          return dateA.localeCompare(dateB);
        },
        cell: ({ row }) => formatDateForDisplay(row.original.income_date),
      },
      {
        id: "deposit_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Deposit Name
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "deposit_name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.deposit_name,
      },
      {
        id: "student",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Enrollment
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorFn: (row) => {
          if (!row.idEnrollment) return "";
          const enrollment = row.idEnrollment;
          const studentNames = enrollment.studentIds?.map((s) => s.studentId?.name).join(", ") || "";
          const primaryText = enrollment.alias || studentNames;
          const planName = enrollment.planId?.name || "";
          return planName ? `${primaryText} - ${planName}` : primaryText;
        },
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => {
          if (!row.original.idEnrollment) return "N/A";
          const enrollment = row.original.idEnrollment;
          const studentNames = enrollment.studentIds?.map((s) => s.studentId?.name).join(", ") || "";
          const primaryText = enrollment.alias || studentNames;
          const planName = enrollment.planId?.name || "";
          return planName ? `${primaryText} - ${planName}` : primaryText || "N/A";
        },
      },
      {
        id: "professor",
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
        accessorKey: "idProfessor.name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.idProfessor?.name || "N/A",
      },

      {
        id: "paymentMethod",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Payment Method
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "idPaymentMethod.name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.idPaymentMethod?.name || "N/A",
      },
      {
        id: "amountInDollars",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Amount (USD)
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "amountInDollars",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => {
          const amountInDollars = row.original.amountInDollars || 0;
          return `$${amountInDollars.toFixed(2)}`;
        },
      },
      {
        id: "actions",
        header: "Actions",
        accessorKey: "row",
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
              onClick={() => handleOpen("delete", row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, []);

  const filteredEnrollmentsForForm = useMemo(() => {
    // Si hay un enrollment seleccionado, asegurarse de que esté incluido
    const selectedEnrollmentId = formData.idEnrollment;
    const selectedEnrollment = enrollments.find(
      (e) => e._id === selectedEnrollmentId
    );

    if (!formData.idProfessor) {
      // Si no hay profesor, solo mostrar el enrollment seleccionado si existe
      return selectedEnrollment ? [selectedEnrollment] : [];
    }

    const filtered = enrollments.filter(
      (enrollment) =>
        enrollment.professorId?._id === formData.idProfessor &&
        isEnrollmentStatusActive(enrollment.status)
    );

    // Asegurarse de que el enrollment seleccionado esté incluido si no está ya en la lista
    if (
      selectedEnrollment &&
      !filtered.find((e) => e._id === selectedEnrollmentId)
    ) {
      filtered.push(selectedEnrollment);
    }

    return filtered;
  }, [enrollments, formData.idProfessor, formData.idEnrollment]);

  // Calcular monto en dólares
  const amountInDollars = useMemo(() => {
    const selectedDivisa = divisas.find((d) => d._id === formData.idDivisa);
    if (
      !selectedDivisa ||
      selectedDivisa.name.toLowerCase() === "dollar" ||
      selectedDivisa.name.toLowerCase() === "dólar"
    ) {
      return formData.amount;
    }
    return formData.amount / (formData.tasa || 1);
  }, [formData.amount, formData.idDivisa, formData.tasa, divisas]);

  // Limpiar enrollment cuando cambia el profesor (incluso si se deselecciona)
  useEffect(() => {
    setFormData((prev) => ({ ...prev, idEnrollment: "" }));
  }, [formData.idProfessor]);

  // Resetear tasa cuando cambie la divisa
  useEffect(() => {
    const selectedDivisa = divisas.find((d) => d._id === formData.idDivisa);
    if (
      selectedDivisa &&
      (selectedDivisa.name.toLowerCase() === "dollar" ||
        selectedDivisa.name.toLowerCase() === "dólar")
    ) {
      setFormData((prev) => ({ ...prev, tasa: 1 }));
    }
  }, [formData.idDivisa, divisas]);

  return (
    <div className="space-y-6">
      <PageHeader title="Incomes" subtitle="Manage all company incomes">
        <div className="flex gap-2">
          <Button
            className="hover:bg-secondary/90"
            variant="outline"
            onClick={() => setIsSummaryModalOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Summary Report
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => handleOpen("create")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
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
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={incomes}
              initialSorting={[{ id: "date", desc: true }]}
              searchKeys={[
                "date",
                "deposit_name",
                "student",
                "professor",
                "paymentMethod",
                "amountInDollars",
              ]}
              searchPlaceholder="Search incomes..."
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Register New Income"}
              {openDialog === "edit" && "Edit Income"}
              {openDialog === "view" && "Income Details"}
            </DialogTitle>
          </DialogHeader>
          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="space-y-2">
                <Label>Income Date</Label>
                <Input
                  name="income_date"
                  type="date"
                  max="9999-12-31"
                  value={formData.income_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, income_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Deposit Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="deposit_name"
                  value={formData.deposit_name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, deposit_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        amount: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Currency <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelect
                    items={divisas}
                    selectedId={formData.idDivisa}
                    onSelectedChange={(v) =>
                      setFormData((p) => ({ ...p, idDivisa: v }))
                    }
                    placeholder="Select currency..."
                    required
                  />
                </div>
              </div>
              {/* Campos de tasa y conversión */}
              {(() => {
                const selectedDivisa = divisas.find(
                  (d) => d._id === formData.idDivisa
                );
                const isDollar =
                  selectedDivisa &&
                  (selectedDivisa.name.toLowerCase() === "dollar" ||
                    selectedDivisa.name.toLowerCase() === "dólar");

                return !isDollar && selectedDivisa ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Exchange Rate ({selectedDivisa.name} → USD)
                      </Label>
                      <Input
                        name="tasa"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.tasa}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            tasa: Number(parseFloat(e.target.value).toFixed(2)),
                          }))
                        }
                        placeholder="e.g., 35.50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount in USD</Label>
                      <Label className="text-lg">
                        {amountInDollars.toFixed(2)}
                      </Label>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="space-y-2">
                <Label>
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  items={paymentMethods}
                  selectedId={formData.idPaymentMethod}
                  onSelectedChange={(v) =>
                    setFormData((p) => ({ ...p, idPaymentMethod: v }))
                  }
                  placeholder="Select payment method..."
                />
              </div>

              {/* Visual separator */}
              <div className="border-t border-border my-6"></div>

              {/* Enrollment Association Section (Optional) */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Enrollment Association (Optional)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to create an excedent income.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Professor <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                  </Label>
                  <SearchableSelect
                    items={professors}
                    selectedId={formData.idProfessor}
                    onSelectedChange={(v) =>
                      setFormData((p) => ({ ...p, idProfessor: v }))
                    }
                    placeholder="Select a professor (optional)..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Enrollment <span className="text-muted-foreground text-sm font-normal">(Required if professor selected)</span>
                  </Label>
                  <SearchableEnrollmentSelect
                    enrollments={filteredEnrollmentsForForm}
                    selectedId={formData.idEnrollment}
                    onSelectedChange={(v) =>
                      setFormData((p) => ({ ...p, idEnrollment: v }))
                    }
                    placeholder={
                      formData.idProfessor
                        ? "Select an enrollment..."
                        : "Select a professor first..."
                    }
                    disabled={!formData.idProfessor}
                  />
                </div>
              </div>

              {/* Visual separator */}
              <div className="border-t border-border my-6"></div>

              {/* Penalization Association Section (Optional) */}
              <div className="space-y-2">
                <Label>
                  Penalization <span className="text-muted-foreground text-sm font-normal">(Optional - Select if this income is paying a penalization)</span>
                </Label>
                <SearchableSelect
                  items={penalizations.map((p) => {
                    const parts = [];
                    if (p.penalization_description) parts.push(p.penalization_description);
                    parts.push(`$${(p.penalizationMoney || 0).toFixed(2)}`);
                    if (p.idPenalizacion?.name) parts.push(`(${p.idPenalizacion.name})`);
                    if (p.enrollmentId?.alias) parts.push(`Enr: ${p.enrollmentId.alias}`);
                    else if (p.professorId?.name) parts.push(`Prof: ${p.professorId.name}`);
                    else if (p.studentId?.name) parts.push(`Stud: ${p.studentId.name}`);
                    return {
                      _id: p._id,
                      name: parts.join(" - "),
                    };
                  })}
                  selectedId={formData.idPenalization || ""}
                  onSelectedChange={(v) =>
                    setFormData((p) => ({ ...p, idPenalization: v || null }))
                  }
                  placeholder="Select a penalization (optional)..."
                />
              </div>

              {/* Visual separator */}
              <div className="border-t border-border my-6"></div>

              {/* Note Section */}
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  name="note"
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, note: e.target.value }))
                  }
                  placeholder="e.g., Payment for 4 advanced English classes..."
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="text-red-500">*</span> Required fields
              </div>
              <DialogFooter className="pt-4 border-t">
                <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Register Income
                </Button>
              </DialogFooter>
            </form>
          )}

          {openDialog === "view" && selectedIncome && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
              {/* Deposit Name and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Deposit Name</Label>
                  <p className="text-sm font-semibold">
                    {selectedIncome.deposit_name}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Income Date</Label>
                  <p className="text-sm">
                    {formatDateForDisplay(selectedIncome.income_date)}
                  </p>
                </div>
              </div>

              {/* Amount, Currency, Amount in Dollars, Exchange Rate, Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Amount</Label>
                  <p className="text-sm font-semibold">
                    {(selectedIncome.amount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Currency</Label>
                  <p className="text-sm">
                    {selectedIncome.idDivisa?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Amount in Dollars</Label>
                  <p className="text-sm font-semibold">
                    ${(selectedIncome.amountInDollars || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Exchange Rate</Label>
                  <p className="text-sm">
                    {(selectedIncome.tasa || 1).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Payment Method</Label>
                  <p className="text-sm">
                    {selectedIncome.idPaymentMethod?.name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Professor and Enrollment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Professor</Label>
                  <p className="text-sm">
                    {selectedIncome.idProfessor?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Enrollment</Label>
                  <p className="text-sm">
                    {selectedIncome.idEnrollment
                      ? (() => {
                          const enrollment = selectedIncome.idEnrollment;
                          const studentNames = enrollment.studentIds?.map((s) => s.studentId?.name).join(", ") || "";
                          const primaryText = enrollment.alias || studentNames;
                          const planName = enrollment.planId?.name || "";
                          return planName ? `${primaryText} - ${planName}` : primaryText || "N/A";
                        })()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Penalization */}
              {selectedIncome.idPenalization && (
                <div>
                  <Label className="font-semibold">Penalization</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      {selectedIncome.idPenalization.penalization_description}
                    </p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {selectedIncome.idPenalization.penalizationMoney && (
                        <p>
                          <span className="font-semibold">Amount:</span> ${selectedIncome.idPenalization.penalizationMoney.toFixed(2)}
                        </p>
                      )}
                      {selectedIncome.idPenalization.idPenalizacion && (
                        <p>
                          <span className="font-semibold">Type:</span> {selectedIncome.idPenalization.idPenalizacion.name}
                        </p>
                      )}
                      {selectedIncome.idPenalization.enrollmentId && (
                        <p>
                          <span className="font-semibold">Enrollment:</span> {selectedIncome.idPenalization.enrollmentId.alias || "N/A"}
                        </p>
                      )}
                      {selectedIncome.idPenalization.professorId && (
                        <p>
                          <span className="font-semibold">Professor:</span> {selectedIncome.idPenalization.professorId.name}
                        </p>
                      )}
                      {selectedIncome.idPenalization.studentId && (
                        <p>
                          <span className="font-semibold">Student:</span> {selectedIncome.idPenalization.studentId.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <Label className="font-semibold">Note</Label>
                <p className="text-sm">{selectedIncome.note || "N/A"}</p>
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

      <Dialog
        open={openDialog === "delete"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to permanently delete the income:{" "}
            <strong className="text-foreground">
              {selectedIncome?.deposit_name}
            </strong>
            ?
          </DialogDescription>
          <DialogFooter>
            <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Income Summary Report</DialogTitle>
            <DialogDescription>
              Select a date range to generate the PDF report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary-start-date">Start Date</Label>
              <Input
                id="summary-start-date"
                type="date"
                max="9999-12-31"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-end-date">End Date</Label>
              <Input
                id="summary-end-date"
                type="date"
                max="9999-12-31"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSummaryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateSummaryPdf}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE SEARCHABLE SELECT REUTILIZABLE ---
function SearchableSelect({
  items,
  selectedId,
  onSelectedChange,
  placeholder,
  required,
}: {
  items: { _id: string; name: string }[];
  selectedId: string;
  onSelectedChange: (id: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item._id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          {selectedItem ? selectedItem.name : placeholder}
          <div className="flex items-center gap-1">
            {!required && selectedItem && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectedChange("");
                }}
              />
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {!required && selectedItem && (
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onSelectedChange("");
                  setOpen(false);
                }}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear selection
              </CommandItem>
            )}
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => {
                  onSelectedChange(item._id);
                  setOpen(false);
                }}
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

// --- COMPONENTE SEARCHABLE ENROLLMENT SELECT ---
function SearchableEnrollmentSelect({
  enrollments,
  selectedId,
  onSelectedChange,
  placeholder,
  disabled = false,
}: {
  enrollments: EnrollmentBrief[];
  selectedId: string;
  onSelectedChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedEnrollment = enrollments.find(
    (item) => item._id === selectedId
  );

  // Helper function to get display text for enrollment
  const getEnrollmentDisplayText = (enrollment: EnrollmentBrief) => {
    const studentNames = enrollment.studentIds?.map((s) => s.studentId?.name).join(", ") || "";
    const primaryText = enrollment.alias || studentNames;
    const planName = enrollment.planId?.name || "";
    return planName ? `${primaryText} - ${planName}` : primaryText;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          {selectedEnrollment ? (
            <div className="text-left">
              {getEnrollmentDisplayText(selectedEnrollment)}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No enrollment found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {enrollments.map((enrollment) => {
              const studentNames = enrollment.studentIds?.map((s) => s.studentId?.name).join(", ") || "";
              const searchValue = `${enrollment.alias || studentNames} ${enrollment.planId?.name || ""}`.toLowerCase();
              return (
                <CommandItem
                  key={enrollment._id}
                  value={searchValue}
                  onSelect={() => {
                    onSelectedChange(enrollment._id);
                    setOpen(false);
                  }}
                  className="hover:!bg-secondary/20 dark:hover:!secondary/30"
                >
                  <div className="text-left">
                    {getEnrollmentDisplayText(enrollment)}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
