/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Loader2, FileDown, ArrowLeft, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateForDisplay } from "@/lib/dateUtils";

// --- DEFINICIONES DE TIPOS ---

interface ReportDetail {
  enrollmentId: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  amountInDollars: number;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number | null;
  balance: number | null;
  totalTeacher: number;
  totalBespoke: number;
  balanceRemaining: number;
  status: 1 | 2;
  type: "normal" | "substitute" | "bonus";
  bonusReason?: string;
}

interface ProfessorBonusDetail {
  bonusId: string;
  amount: number;
  description: string;
  bonusDate: string;
  month: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface ProfessorPenalizationDetail {
  penalizationId: string;
  penalizationMoney: number;
  description: string | null;
  endDate: string | null;
  support_file: string | null;
  createdAt: string;
  penalizationType: {
    id: string;
    name: string | null;
  } | null;
  penalizationLevel: {
    id: string;
    tipo: string | null;
    nivel: number | null;
    description: string | null;
  } | null;
}

interface ProfessorReport {
  professorId: string;
  professorName: string;
  reportDateRange: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  details: ReportDetail[];
  totalTeacher: number;
  totalBespoke: number;
  totalBalanceRemaining: number;
  totalFinal?: number; // Total final que el profesor va a ganar (totalTeacher + bonos - penalizaciones)
  abonos?: {
    total: number;
    details: ProfessorBonusDetail[];
  };
  penalizations?: {
    count: number;
    totalMoney: number;
    details: ProfessorPenalizationDetail[];
  };
}

interface SpecialReportDetail {
  enrollmentId: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  amountInDollars: number;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number | null;
  oldBalance: number | null;
  payment: number | null;
  total: number;
  balanceRemaining: number;
  type: "normal" | "substitute" | "bonus";
  bonusReason?: string;
}

interface SpecialProfessorReport {
  professorId: string;
  professorName: string;
  reportDateRange: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  details: SpecialReportDetail[];
  subtotal: {
    total: number;
    balanceRemaining: number;
  };
  totalFinal?: number; // Total final que el profesor va a ganar (total + bonos - penalizaciones)
  abonos?: {
    total: number;
    details: ProfessorBonusDetail[];
  };
  penalizations?: {
    count: number;
    totalMoney: number;
    details: ProfessorPenalizationDetail[];
  };
}

interface ExcedentDetail {
  incomeId: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  divisa: string;
  paymentMethod: string;
  note: string;
  income_date: string;
  createdAt: string;
}

interface ClassNotViewedDetail {
  enrollmentId: string;
  enrollmentAlias: string | null;
  studentNames: string;
  plan: string;
  numberOfClasses: number;
  pricePerHour: number;
  excedente: number;
  classesNotViewed: any[]; // Array de ClassRegistry objects
}

interface BonusDetail {
  bonusId: string;
  professorId: string;
  professorName: string;
  professorCiNumber: string;
  amount: number;
  negativeAmount: number;
  description: string;
  bonusDate: string;
  month: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface PenalizationDetail {
  penalizationId: string;
  professorId: string;
  professorName: string;
  professorCiNumber: string;
  penalizationMoney: number;
  description: string | null;
  endDate: string | null;
  support_file: string | null;
  createdAt: string;
  penalizationType: {
    id: string;
    name: string | null;
  } | null;
  penalizationLevel: {
    id: string;
    tipo: string | null;
    nivel: number | null;
    description: string | null;
  } | null;
}

interface ExcedentReport {
  reportDateRange: string;
  totalExcedente: number;
  totalExcedenteIncomes: number;
  totalExcedenteClasses: number;
  totalBonuses: number;
  totalExcedentePenalizations?: number;
  numberOfIncomes: number;
  numberOfClassesNotViewed: number;
  numberOfBonuses: number;
  numberOfPenalizations?: number;
  incomeDetails: ExcedentDetail[];
  classNotViewedDetails: ClassNotViewedDetail[];
  bonusDetails: BonusDetail[];
  penalizationDetails?: PenalizationDetail[];
}

interface ExcedentRow {
  id: string;
  enrollmentId: string;
  studentName: string;
  amount: number | null;
  amountInDollars: number | null;
  hoursSeen: number | null;
  pricePerHour: number | null;
  total: number;
  notes: string;
}

interface EnrollmentForSelect {
  _id: string;
  studentIds: { name: string; alias?: string }[];
  planId: { name: string };
  enrollmentType: "single" | "couple" | "group";
  initialBalance?: number;
}

interface EnrollmentBalance {
  enrollmentId: string;
  studentName: string;
  planName: string;
  totalAvailable: number;
  usedInNormal: number;
  usedInSubstitutes: number;
  remaining: number;
}

interface Totals {
  subtotals: {
    normalProfessors: {
      totalTeacher: number;
      totalBespoke: number;
      balanceRemaining: number;
    };
    specialProfessor: {
      total: number;
      balanceRemaining: number;
    };
    excedents: {
      totalExcedente: number;
    };
  };
  grandTotal: {
    balanceRemaining: number;
  };
}

interface ReportState {
  general: ProfessorReport[];
  special: SpecialProfessorReport | null;
  excedente: ExcedentReport | null;
  totals?: Totals;
}

function NewReportComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const month = searchParams.get("month");

  const [reportData, setReportData] = useState<ReportState | null>(null);
  const [excedents] = useState<ExcedentRow[]>([]);
  const [realTotal, setRealTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentForSelect[]>([]);
  const [enrollmentBalances, setEnrollmentBalances] = useState<
    EnrollmentBalance[]
  >([]);

  const handleGenerateReport = async (reportMonth: string) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const response = await apiClient(
        `api/incomes/professors-payout-report?month=${reportMonth}`
      );

      console.log("response", response);

      // Preservar todos los valores calculados que vienen de la API
      const initialGeneralReport = response.report.map((prof: any) => ({
        ...prof,
        // Preservar abonos si viene de la API
        abonos: prof.abonos || undefined,
        // Preservar penalizations si viene de la API
        penalizations: prof.penalizations || undefined,
        // Preservar totalTeacher, totalBespoke, totalBalanceRemaining que vienen directamente del objeto prof
        totalTeacher: prof.totalTeacher || 0,
        totalBespoke: prof.totalBespoke || 0,
        totalBalanceRemaining: prof.totalBalanceRemaining || 0,
        // Preservar todos los campos calculados de cada detail
        details: prof.details.map((detail: any) => ({
          ...detail,
          // Solo normalizar campos que realmente necesiten normalización
          amountInDollars: detail.amountInDollars || detail.amount || 0,
          // Preservar type si viene, sino usar "normal" por defecto
          type: detail.type || "normal",
        })),
      }));

      // Preservar todos los valores calculados que vienen de la API
      const initialSpecialReport = response.specialProfessorReport
        ? {
            ...response.specialProfessorReport,
            // Preservar abonos si viene de la API
            abonos: response.specialProfessorReport.abonos || undefined,
            // Preservar penalizations si viene de la API
            penalizations: response.specialProfessorReport.penalizations || undefined,
            // Preservar subtotal que viene de la API
            subtotal: response.specialProfessorReport.subtotal || {
              total: 0,
              balanceRemaining: 0,
            },
            // Preservar todos los campos calculados de cada detail
            details: response.specialProfessorReport.details.map(
              (detail: any) => ({
                ...detail,
                // Solo normalizar campos que realmente necesiten normalización
                amountInDollars: detail.amountInDollars || detail.amount || 0,
                // Preservar type si viene, sino usar "normal" por defecto
                type: detail.type || "normal",
              })
            ),
          }
        : null;

      // Asegurar que excedents tenga la estructura correcta con campos opcionales
      const excedenteData = response.excedents
        ? {
            ...response.excedents,
            totalExcedenteIncomes:
              response.excedents.totalExcedenteIncomes ?? 0,
            totalExcedenteClasses:
              response.excedents.totalExcedenteClasses ?? 0,
            totalBonuses: response.excedents.totalBonuses ?? 0,
            numberOfClassesNotViewed:
              response.excedents.numberOfClassesNotViewed ?? 0,
            numberOfBonuses: response.excedents.numberOfBonuses ?? 0,
            incomeDetails: response.excedents.incomeDetails ?? [],
            classNotViewedDetails:
              response.excedents.classNotViewedDetails ?? [],
            bonusDetails: response.excedents.bonusDetails ?? [],
            // Mantener compatibilidad con estructura antigua
            details:
              response.excedents.incomeDetails ??
              response.excedents.details ??
              [],
            numberOfIncomes:
              response.excedents.numberOfIncomes ??
              response.excedents.incomeDetails?.length ??
              0,
          }
        : null;

      setReportData({
        general: initialGeneralReport,
        special: initialSpecialReport,
        excedente: excedenteData,
        totals: response.totals || undefined,
      });
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to generate report. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Función helper para obtener el valor a mostrar

  // Función helper para obtener el indicador visual del tipo
  const getTypeIndicator = (type: "normal" | "substitute" | "bonus") => {
    switch (type) {
      case "normal":
        return "📚"; // Clase normal
      case "substitute":
        return "🔄"; // Suplencia
      case "bonus":
        return "💰"; // Bono manual
      default:
        return "";
    }
  };

  // Función helper para formatear el nombre del enrollment
  const formatEnrollmentName = (enrollment: EnrollmentForSelect) => {
    const studentName =
      enrollment.studentIds[0]?.alias || enrollment.studentIds[0]?.name || "";
    const planName = enrollment.planId.name;
    const typePrefix =
      enrollment.enrollmentType === "single"
        ? "S"
        : enrollment.enrollmentType === "couple"
        ? "C"
        : "G";
    return `(${typePrefix} - ${planName}) ${studentName}`;
  };

  // Función helper para obtener el balance disponible considerando suplencias previas (versión mejorada)
  // Funciones de edición eliminadas - el reporte es solo de visualización



  useEffect(() => {
    apiClient("api/enrollments").then(setEnrollments).catch(console.error);
    if (month) {
      handleGenerateReport(month);
    } else {
      setError("Month parameter is missing from URL.");
      setIsLoading(false);
    }
  }, [month]);

  // Recalcular balances cuando cambien los datos
  useEffect(() => {
    if (reportData && enrollments.length > 0) {
      // Función para calcular balances dinámicos por enrollment
      const calculateEnrollmentBalances = () => {
        const balances: EnrollmentBalance[] = [];

        enrollments.forEach((enrollment) => {
          let totalUsed = 0;
          let usedInNormal = 0;
          let usedInSubstitutes = 0;

          // Sumar uso en clases normales y suplencias de reportes generales
          if (reportData?.general) {
            reportData.general.forEach((prof) => {
              prof.details.forEach((detail) => {
                if (detail.enrollmentId === enrollment._id) {
                  if (detail.type === "normal") {
                    usedInNormal += detail.amountInDollars || 0;
                  } else if (detail.type === "substitute") {
                    usedInSubstitutes += detail.amountInDollars || 0;
                  }
                  totalUsed += detail.amountInDollars || 0;
                }
              });
            });
          }

          // Sumar uso en reporte especial
          if (reportData?.special) {
            reportData.special.details.forEach((detail) => {
              if (detail.enrollmentId === enrollment._id) {
                if (detail.type === "normal") {
                  usedInNormal += detail.amountInDollars || 0;
                } else if (detail.type === "substitute") {
                  usedInSubstitutes += detail.amountInDollars || 0;
                }
                totalUsed += detail.amountInDollars || 0;
              }
            });
          }

          // Sumar uso en excedentes
          excedents.forEach((excedent) => {
            if (excedent.enrollmentId === enrollment._id) {
              totalUsed += excedent.amountInDollars || 0;
            }
          });

          const initialBalance = enrollment.initialBalance || 0;
          const remaining = initialBalance - totalUsed;

          balances.push({
            enrollmentId: enrollment._id,
            studentName: enrollment.studentIds.map((s) => s.name).join(", "),
            planName: enrollment.planId.name,
            totalAvailable: initialBalance,
            usedInNormal,
            usedInSubstitutes,
            remaining: Math.max(0, remaining), // No permitir balance negativo
          });
        });

        setEnrollmentBalances(balances);
        return balances;
      };

      calculateEnrollmentBalances();
    }
  }, [reportData, excedents, enrollments]);

  // Usar solo los valores que vienen de la API, sin recalcular
  const calculatedData = useMemo(() => {
    if (!reportData) return null;

    // Usar los valores que vienen directamente de la API en totals.subtotals
    const normalProfessorsTotals = reportData.totals?.subtotals
      ?.normalProfessors || {
      totalTeacher: 0,
      totalBespoke: 0,
      balanceRemaining: 0,
    };
    const grandTotal = reportData.totals?.grandTotal?.balanceRemaining || 0;

    const excedentsTotal = reportData.excedente?.totalExcedente || 0;
    const specialBalanceRemaining =
      reportData.special?.subtotal?.balanceRemaining || 0;

    // Para el systemTotal, usamos los valores de totals si están disponibles
    const systemTotal =
      grandTotal ||
      normalProfessorsTotals.balanceRemaining +
        specialBalanceRemaining +
        excedentsTotal;

    // Usar los valores de totals para grandTotals
    const grandTotals = {
      grandTotalTeacher: normalProfessorsTotals.totalTeacher,
      grandTotalBespoke: normalProfessorsTotals.totalBespoke,
      grandTotalBalanceRemaining: normalProfessorsTotals.balanceRemaining,
    };

    const difference = systemTotal - realTotal;

    return {
      // Usar los datos directamente de la API, sin recalcular
      generalReport: reportData.general,
      specialReport: reportData.special,
      excedentsTotal,
      grandTotals,
      summary: { systemTotal, difference },
      totals: reportData.totals,
    };
  }, [reportData, realTotal]);


  const handleGeneratePdf = () => {
    if (!calculatedData || !month) {
      alert("No hay datos de reporte para generar el PDF.");
      return;
    }

    setIsPrinting(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
      });
      let finalY = 15;

      doc.setFontSize(18);
      doc.text(
        `Accounting Report - ${format(new Date(month + "-02"), "MMMM yyyy")}`,
        14,
        finalY
      );
      finalY += 10;

      // --- Tablas de Profesores Generales ---
      calculatedData.generalReport.forEach((prof) => {
        if (finalY > 20) finalY += 5;
        doc.setFontSize(14);
        doc.text(prof.professorName, 14, finalY);
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Period",
              "Plan",
              "Student",
              "Amount",
              "Total Hrs",
              "Price/Hr",
              "Hrs Seen",
              "Pay/Hr",
              "Balance",
              "T. Teacher",
              "T. Bespoke",
              "Bal. Rem.",
            ],
          ],
          body: prof.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${(d.amountInDollars || 0).toFixed(2)}`,
            d.totalHours,
            `$${d.pricePerHour.toFixed(2)}`,
            d.hoursSeen || "",
            `$${d.pPerHour.toFixed(2)}`,
            `$${(d.balance || 0).toFixed(2)}`,
            `$${d.totalTeacher.toFixed(2)}`,
            `$${d.totalBespoke.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 9,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${prof.totalTeacher.toFixed(2)}`,
              `$${prof.totalBespoke.toFixed(2)}`,
              `$${prof.totalBalanceRemaining.toFixed(2)}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [76, 84, 158] },
          styles: { fontSize: 7, cellPadding: 1.5 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;

        // Agregar tabla de abonos si existen
        if (prof.abonos && prof.abonos.details.length > 0) {
          finalY += 5;
          doc.setFontSize(12);
          doc.text("Bonuses", 14, finalY);
          finalY += 6;

          autoTable(doc, {
            startY: finalY,
            head: [["Date", "Description", "Month", "Amount"]],
            body: prof.abonos.details.map((bonus) => [
              formatDateForDisplay(bonus.bonusDate),
              bonus.description,
              bonus.month,
              `$${bonus.amount.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 3,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${prof.abonos.total.toFixed(2)}`,
              ],
            ],
            footStyles: {
              fontStyle: "bold",
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
            },
            theme: "grid",
            headStyles: { fillColor: [76, 84, 158] },
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }
      });

      // --- Tabla de Profesor Especial ---
      if (calculatedData.specialReport) {
        finalY += 5;
        doc.setFontSize(14);
        doc.text(
          `${calculatedData.specialReport.professorName} (Special)`,
          14,
          finalY
        );
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Period",
              "Plan",
              "Student",
              "Amount",
              "Total Hrs",
              "Hrs Seen",
              "Balance",
              "Payment",
              "Total",
              "Bal. Rem.",
            ],
          ],
          body: calculatedData.specialReport.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${(d.amountInDollars || 0).toFixed(2)}`,
            d.totalHours,
            d.hoursSeen || "",
            `$${(d.oldBalance || 0).toFixed(2)}`,
            `$${(d.payment || 0).toFixed(2)}`,
            `$${d.total.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 8,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${calculatedData.specialReport.subtotal.total.toFixed(2)}`,
              `$${calculatedData.specialReport.subtotal.balanceRemaining.toFixed(
                2
              )}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [81, 185, 162] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;

        // Agregar tabla de abonos si existen
        if (
          calculatedData.specialReport.abonos &&
          calculatedData.specialReport.abonos.details.length > 0
        ) {
          finalY += 5;
          doc.setFontSize(12);
          doc.text("Bonuses", 14, finalY);
          finalY += 6;

          autoTable(doc, {
            startY: finalY,
            head: [["Date", "Description", "Month", "Amount"]],
            body: calculatedData.specialReport.abonos.details.map((bonus) => [
              formatDateForDisplay(bonus.bonusDate),
              bonus.description,
              bonus.month,
              `$${bonus.amount.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 3,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${calculatedData.specialReport.abonos.total.toFixed(2)}`,
              ],
            ],
            footStyles: {
              fontStyle: "bold",
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
            },
            theme: "grid",
            headStyles: { fillColor: [81, 185, 162] },
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // --- Tabla de Excedentes ---
      if (reportData?.excedente) {
        const excedente = reportData.excedente;
        let hasExcedents = false;

        // Sección 1: Ingresos Excedentes
        if (excedente.incomeDetails && excedente.incomeDetails.length > 0) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Excedent Incomes", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Date",
                "Deposit Name",
                "Amount",
                "Currency",
                "Amount (USD)",
                "Payment Method",
                "Note",
              ],
            ],
            body: excedente.incomeDetails.map((detail) => [
              formatDateForDisplay(detail.income_date),
              detail.deposit_name,
              detail.amount.toFixed(2),
              detail.divisa,
              `$${detail.amountInDollars.toFixed(2)}`,
              detail.paymentMethod,
              detail.note || "N/A",
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 6,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${excedente.totalExcedenteIncomes.toFixed(2)}`,
              ],
            ],
            footStyles: {
              fontStyle: "bold",
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
            },
            theme: "grid",
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Sección 2: Clases No Vistas
        if (
          excedente.classNotViewedDetails &&
          excedente.classNotViewedDetails.length > 0
        ) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Classes Not Viewed", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Enrollment",
                "Students",
                "Plan",
                "Classes",
                "Price/Hour",
                "Excedent",
              ],
            ],
            body: excedente.classNotViewedDetails.map((detail) => [
              detail.enrollmentAlias || detail.enrollmentId,
              detail.studentNames,
              detail.plan,
              detail.numberOfClasses.toString(),
              `$${detail.pricePerHour.toFixed(2)}`,
              `$${detail.excedente.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 5,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${excedente.totalExcedenteClasses.toFixed(2)}`,
              ],
            ],
            footStyles: {
              fontStyle: "bold",
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
            },
            theme: "grid",
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Sección 3: Bonos de Profesores
        if (excedente.bonusDetails && excedente.bonusDetails.length > 0) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Professor Bonuses", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [["Date", "Professor", "CI Number", "Description", "Amount"]],
            body: excedente.bonusDetails.map((bonus) => [
              formatDateForDisplay(bonus.bonusDate),
              bonus.professorName,
              bonus.professorCiNumber,
              bonus.description,
              {
                content: `$${bonus.negativeAmount.toFixed(2)}`,
                styles: { textColor: [255, 0, 0] }, // Rojo para valores negativos
              },
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 4,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                {
                  content: `-$${excedente.totalBonuses.toFixed(2)}`,
                  styles: { textColor: [255, 0, 0], fontStyle: "bold" },
                },
              ],
            ],
            footStyles: {
              fontStyle: "bold",
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
            },
            theme: "grid",
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Resumen Total de Excedentes
        if (hasExcedents) {
          finalY += 5;
          doc.setFontSize(12);
          doc.text("Excedents Summary", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [["Concept", "Amount"]],
            body: [
              [
                "Total Excedent Incomes",
                `$${excedente.totalExcedenteIncomes.toFixed(2)}`,
              ],
              [
                "Total Classes Not Viewed",
                `$${excedente.totalExcedenteClasses.toFixed(2)}`,
              ],
              [
                "Total Bonuses",
                {
                  content: `-$${excedente.totalBonuses.toFixed(2)}`,
                  styles: { textColor: [255, 0, 0] },
                },
              ],
              [
                {
                  content: "Grand Total:",
                  styles: { fontStyle: "bold" },
                },
                {
                  content: `$${excedente.totalExcedente.toFixed(2)}`,
                  styles: { fontStyle: "bold" },
                },
              ],
            ],
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
            didDrawPage: (data) => {
              finalY = data.cursor?.y || 0;
            },
          });
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // --- Resumen Final ---
      finalY += 5;
      doc.setFontSize(14);
      doc.text("Final Summary", 14, finalY);
      finalY += 8;

      autoTable(doc, {
        startY: finalY,
        head: [["Concept", "Value"]],
        body: [
          ["System Total", `$${calculatedData.summary.systemTotal.toFixed(2)}`],
          ["Real Total (Bank)", `$${realTotal.toFixed(2)}`],
          ["Difference", `$${calculatedData.summary.difference.toFixed(2)}`],
        ],
        theme: "striped",
        headStyles: { fillColor: [41, 41, 41] },
      });

      doc.save(`report-${month}.pdf`);
    } catch (err: unknown) {
      console.error("Error generating PDF:", err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to generate PDF. Please try again."
      );
      alert(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!calculatedData) {
      alert("Report data is not available.");
      return;
    }
    setIsSaving(true);
    const payload = {
      month: month,
      report: calculatedData.generalReport,
      specialProfessorReport: calculatedData.specialReport,
      excedents: { rows: excedents, total: calculatedData.excedentsTotal },
      enrollmentBalances: enrollmentBalances.map((balance) => ({
        enrollmentId: balance.enrollmentId,
        balanceRemaining: balance.remaining,
      })),
      summary: {
        systemTotal: calculatedData.summary.systemTotal,
        realTotal: realTotal,
        difference: calculatedData.summary.difference,
      },
    };
    try {
      const response = await apiClient("api/general-payment-tracker", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert(
        response.message ||
          "Reporte guardado exitosamente. El PDF se generará a continuación."
      );
      await handleGeneratePdf();
      router.push("/accounting/report");
    } catch (err: unknown) {
      console.error("Failed to save report:", err);
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isConflictError
          ? "A report for this month already exists."
          : "Failed to save report. Please try again."
      );
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        <p className="text-xl ml-4">Generating report for {month}...</p>
      </div>
    );
  if (error)
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2 m-8">
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
    );
  if (!calculatedData)
    return <p className="text-center p-8">No report data to display.</p>;

  return (
    <div className="space-y-6 p-4 md:p-2">
      <PageHeader
        title={`New Report: ${
          month ? format(new Date(month + "-02"), "MMMM yyyy") : ""
        }`}
        subtitle="Fill in or modify the details below to calculate and save the report."
      >
        <Button
          variant="outline"
          onClick={() => router.push("/accounting/report")}
          className="border-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <ArrowLeft className="h-4 w-4 text-destructive" />
          Cancel and Go Back
        </Button>
      </PageHeader>
      <div
        id="report-to-print"
        className="space-y-8 bg-card p-4 sm:p-6 rounded-lg"
      >
        {calculatedData.generalReport.map((profReport) => (
          <Card key={profReport.professorId}>
            <CardHeader className="mb-0">
              <CardTitle className="text-lg">
                {profReport.professorName}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Period</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[180px]">Student</TableHead>
                      <TableHead className="w-[110px]">Amount</TableHead>
                      <TableHead className="w-[110px]">Total Hours</TableHead>
                      <TableHead className="w-[110px]">Price/Hour</TableHead>
                      <TableHead className="w-[110px]">Hours Seen</TableHead>
                      <TableHead className="w-[110px]">Pay/Hour</TableHead>
                      <TableHead className="w-[110px]">Balance</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        Total Teacher
                      </TableHead>
                      <TableHead className="text-right">
                        Total Bespoke
                      </TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profReport.details && profReport.details.length > 0 ? (
                      profReport.details.map((detail, detailIndex) => (
                        <TableRow
                          key={detail.enrollmentId || `bonus-${detailIndex}`}
                        >
                          <TableCell className="px-3">
                            {detail.period}
                          </TableCell>
                          <TableCell>
                              <span className="px-1">{detail.plan}</span>
                          </TableCell>
                          <TableCell>
                              <span className="font-medium px-1">
                                    {detail.enrollmentId
                                      ? (() => {
                                          const enrollment = enrollments.find(
                                            (e) => e._id === detail.enrollmentId
                                          );
                                          if (enrollment) {
                                            // Extraer el nombre del estudiante del enrollment o usar detail.studentName
                                            const studentNameFromEnrollment = 
                                              enrollment.studentIds?.[0]?.alias || 
                                              enrollment.studentIds?.[0]?.name || 
                                              "";
                                            
                                            // Si no hay nombre en el enrollment, usar detail.studentName directamente
                                            if (!studentNameFromEnrollment) {
                                              return detail.studentName;
                                            }
                                            
                                            // Construir el formato con el nombre del estudiante
                                            const planName = enrollment.planId?.name || "";
                                            const typePrefix =
                                              enrollment.enrollmentType === "single"
                                                ? "S"
                                                : enrollment.enrollmentType === "couple"
                                                ? "C"
                                                : "G";
                                            
                                            return planName 
                                              ? `(${typePrefix} - ${planName}) ${studentNameFromEnrollment}`
                                              : studentNameFromEnrollment;
                                          }
                                          return detail.studentName;
                                        })()
                                      : detail.studentName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              ${typeof detail.amountInDollars === "number" ? detail.amountInDollars.toFixed(2) : "0.00"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              {typeof detail.totalHours === "number" ? detail.totalHours : "0"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              ${typeof detail.pricePerHour === "number" ? detail.pricePerHour.toFixed(2) : "0.00"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              {typeof detail.hoursSeen === "number" ? detail.hoursSeen : "0"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              ${typeof detail.pPerHour === "number" ? detail.pPerHour.toFixed(2) : "0.00"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              ${typeof detail.balance === "number" ? detail.balance.toFixed(2) : "0.00"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className="text-lg"
                              title={
                                detail.type === "normal"
                                  ? "Clase Normal"
                                  : detail.type === "substitute"
                                  ? "Suplencia"
                                  : "Bono Manual"
                              }
                            >
                              {getTypeIndicator(detail.type)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {detail.totalTeacher.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {detail.totalBespoke.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {detail.balanceRemaining.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="text-center text-muted-foreground"
                        >
                          No details found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={10}></TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.totalTeacher.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.totalBespoke.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-primary">
                        {profReport.totalBalanceRemaining.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Sección de Abonos */}
              {profReport.abonos && profReport.abonos.details.length > 0 && (
                <div className="mt-4 pt-2 border-t">
                  <div>
                    <h3 className="text-lg font-semibold">Bonuses</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profReport.abonos.details.map((bonus) => (
                        <TableRow key={bonus.bonusId}>
                          <TableCell>
                            {formatDateForDisplay(bonus.bonusDate)}
                          </TableCell>
                          <TableCell>{bonus.description}</TableCell>
                          <TableCell>{bonus.month}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${bonus.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-base">
                          ${profReport.abonos.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Sección de Penalizaciones */}
              {profReport.penalizations && profReport.penalizations.count > 0 && (
                <div className="mt-4">
                  <div>
                    <h3 className="text-lg font-semibold">Penalizations</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profReport.penalizations.details?.map((penalization) => (
                        <TableRow key={penalization.penalizationId}>
                          <TableCell>
                            {formatDateForDisplay(penalization.createdAt)}
                          </TableCell>
                          <TableCell>
                            {penalization.description || "No description"}
                          </TableCell>
                          <TableCell>
                            {penalization.penalizationType?.name || "—"}
                          </TableCell>
                          <TableCell>
                            {penalization.penalizationLevel ? (
                              <span>
                                Level {penalization.penalizationLevel.nivel || "—"}
                                {penalization.penalizationLevel.description && (
                                  <span className="text-xs text-muted-foreground block">
                                    {penalization.penalizationLevel.description}
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            ${penalization.penalizationMoney.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-base text-destructive">
                          ${profReport.penalizations.totalMoney.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Total a Pagar - Solo si hay bonos o penalizaciones */}
              {(profReport.abonos || profReport.penalizations) && profReport.totalFinal !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-end items-right">
                    <Label className="text-lg font-semibold mr-2">Total To Be Paid:</Label>
                    <span className="text-xl font-bold text-primary">
                      ${profReport.totalFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Subtotales de referencia para profesores normales */}
        {reportData?.totals?.subtotals?.normalProfessors && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                General Totals (Reference)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 justify-items-center">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Total Teacher
                  </Label>
                  <p className="text-2xl font-bold">
                    $
                    {reportData.totals.subtotals.normalProfessors.totalTeacher.toFixed(
                      2
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Total Bespoke
                  </Label>
                  <p className="text-2xl font-bold">
                    $
                    {reportData.totals.subtotals.normalProfessors.totalBespoke.toFixed(
                      2
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Balance Remaining
                  </Label>
                  <p className="text-2xl font-bold text-primary">
                    $
                    {reportData.totals.subtotals.normalProfessors.balanceRemaining.toFixed(
                      2
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {calculatedData.specialReport && (
          <Card key={calculatedData.specialReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {calculatedData.specialReport.professorName} (Special)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Period</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[200px]">Student</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[120px]">Total Hours</TableHead>
                      <TableHead className="w-[120px]">Hours Seen</TableHead>
                      <TableHead className="w-[120px]">Balance</TableHead>
                      <TableHead className="w-[120px]">Payment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance Rem.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedData.specialReport.details &&
                    calculatedData.specialReport.details.length > 0 ? (
                      calculatedData.specialReport.details.map(
                        (detail) => (
                          <TableRow key={detail.enrollmentId}>
                            <TableCell className="px-3">
                              {detail.period}
                            </TableCell>
                            <TableCell>
                                <span className="px-1">{detail.plan}</span>
                            </TableCell>
                            <TableCell>
                                <span className="font-medium px-1">
                                      {detail.enrollmentId
                                        ? formatEnrollmentName(
                                            enrollments.find(
                                        (e) => e._id === detail.enrollmentId
                                            )!
                                    ) || detail.studentName
                                  : detail.studentName}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                ${typeof detail.amountInDollars === "number" ? detail.amountInDollars.toFixed(2) : "0.00"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                {typeof detail.totalHours === "number" ? detail.totalHours : "0"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                {typeof detail.hoursSeen === "number" ? detail.hoursSeen : "0"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                ${typeof detail.oldBalance === "number" ? detail.oldBalance.toFixed(2) : "0.00"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                ${typeof detail.payment === "number" ? detail.payment.toFixed(2) : "0.00"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className="text-lg"
                                title={
                                  detail.type === "normal"
                                    ? "Clase Normal"
                                    : detail.type === "substitute"
                                    ? "Suplencia"
                                    : "Bono Manual"
                                }
                              >
                                {getTypeIndicator(detail.type)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${detail.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {detail.balanceRemaining.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="text-center text-muted-foreground"
                        >
                          No details found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={9}></TableCell>
                      <TableCell className="text-right font-bold text-base">
                        $
                        {calculatedData.specialReport.subtotal.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-primary">
                        $
                        {calculatedData.specialReport.subtotal.balanceRemaining.toFixed(
                          2
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Sección de Abonos para Special Professor */}
              {calculatedData.specialReport.abonos && calculatedData.specialReport.abonos.details.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Bonuses</h3>
                    <div className="text-lg font-bold">
                      Total: ${calculatedData.specialReport.abonos.total.toFixed(2)}
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculatedData.specialReport.abonos.details.map((bonus) => (
                        <TableRow key={bonus.bonusId}>
                          <TableCell>
                            {formatDateForDisplay(bonus.bonusDate)}
                          </TableCell>
                          <TableCell>{bonus.description}</TableCell>
                          <TableCell>{bonus.month}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${bonus.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Sección de Penalizaciones para Special Professor */}
              {calculatedData.specialReport.penalizations && calculatedData.specialReport.penalizations.count > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Penalizations</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculatedData.specialReport.penalizations.details?.map((penalization) => (
                        <TableRow key={penalization.penalizationId}>
                          <TableCell>
                            {formatDateForDisplay(penalization.createdAt)}
                          </TableCell>
                          <TableCell>
                            {penalization.description || "No description"}
                          </TableCell>
                          <TableCell>
                            {penalization.penalizationType?.name || "—"}
                          </TableCell>
                          <TableCell>
                            {penalization.penalizationLevel ? (
                              <span>
                                Level {penalization.penalizationLevel.nivel || "—"}
                                {penalization.penalizationLevel.description && (
                                  <span className="text-xs text-muted-foreground block">
                                    {penalization.penalizationLevel.description}
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {penalization.endDate ? formatDateForDisplay(penalization.endDate) : "No end date"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            ${penalization.penalizationMoney.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold text-base text-destructive">
                          ${calculatedData.specialReport.penalizations.totalMoney.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Total a Pagar - Solo si hay bonos o penalizaciones */}
              {(calculatedData.specialReport.abonos || calculatedData.specialReport.penalizations) && calculatedData.specialReport.totalFinal !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Total To Be Paid:</Label>
                    <span className="text-2xl font-bold text-primary">
                      ${calculatedData.specialReport.totalFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabla de Excedentes - Debajo del profesor especial */}
        {reportData?.excedente && (
          <Card>
            <CardHeader>
              <CardTitle>Excedents</CardTitle>
              <p className="text-sm text-muted-foreground">
                {reportData.excedente.reportDateRange ||
                  "No date range available"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sección 1: Excedent Incomes */}
              <div>
                <h3 className="text-lg font-semibold">Excedent Incomes</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Deposit Name</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.excedente.incomeDetails &&
                    reportData.excedente.incomeDetails.length > 0 ? (
                      reportData.excedente.incomeDetails.map((detail) => (
                        <TableRow key={detail.incomeId}>
                          <TableCell>
                            {formatDateForDisplay(detail.income_date)}
                          </TableCell>
                          <TableCell>{detail.deposit_name}</TableCell>

                          <TableCell>{detail.note || "N/A"}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${detail.amountInDollars.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No excedent incomes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        $
                        {(
                          reportData.excedente.totalExcedenteIncomes || 0
                        ).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Sección 2: Classes Not Viewed */}
              <div className="border-t pt-2">
                <h3 className="text-lg font-semibold">
                  Classes Not Viewed
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alias / Student Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Classes</TableHead>
                      <TableHead className="text-right">Price/Hour</TableHead>
                      <TableHead className="text-right">Excedent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.excedente.classNotViewedDetails &&
                    reportData.excedente.classNotViewedDetails.length > 0 ? (
                      reportData.excedente.classNotViewedDetails.map(
                        (detail) => (
                          <TableRow key={detail.enrollmentId}>
                            <TableCell>{detail.enrollmentAlias ||detail.studentNames}</TableCell>
                            <TableCell>{detail.plan}</TableCell>
                            <TableCell className="text-right">
                              {detail.numberOfClasses}
                            </TableCell>
                            <TableCell className="text-right">
                              ${detail.pricePerHour.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${detail.excedente.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No classes not viewed found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        $
                        {(
                          reportData.excedente.totalExcedenteClasses || 0
                        ).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Sección 3: Penalizaciones Monetarias */}
              {reportData.excedente.penalizationDetails &&
              reportData.excedente.penalizationDetails.length > 0 && (
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold">Penalizations</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Professor</TableHead>
                        <TableHead>CI Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.excedente.penalizationDetails.map(
                        (penalization) => (
                          <TableRow key={penalization.penalizationId}>
                            <TableCell>
                              {formatDateForDisplay(penalization.createdAt)}
                            </TableCell>
                            <TableCell>{penalization.professorName}</TableCell>
                            <TableCell>
                              {penalization.professorCiNumber}
                            </TableCell>
                            <TableCell>
                              {penalization.description || "No description"}
                            </TableCell>
                            <TableCell>
                              {penalization.penalizationType?.name || "—"}
                            </TableCell>
                            <TableCell>
                              {penalization.penalizationLevel ? (
                                <span>
                                  Level {penalization.penalizationLevel.nivel || "—"}
                                  {penalization.penalizationLevel.description && (
                                    <span className="text-xs text-muted-foreground block">
                                      {penalization.penalizationLevel.description}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${penalization.penalizationMoney.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${(reportData.excedente.totalExcedentePenalizations || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Sección 4: Professor Bonuses */}
              <div className="border-t pt-2">
                <h3 className="text-lg font-semibold">
                  Professor Bonuses
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead>CI Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.excedente.bonusDetails &&
                    reportData.excedente.bonusDetails.length > 0 ? (
                      reportData.excedente.bonusDetails.map((bonus) => (
                        <TableRow key={bonus.bonusId}>
                          <TableCell>
                            {formatDateForDisplay(bonus.bonusDate)}
                          </TableCell>
                          <TableCell>{bonus.professorName}</TableCell>
                          <TableCell>{bonus.professorCiNumber}</TableCell>
                          <TableCell>{bonus.description}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            -${bonus.negativeAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No professor bonuses found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        -${(reportData.excedente.totalBonuses || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              

              {/* Total General de Excedentes */}
              <div>
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      Grand Total:
                    </p>
                    <p className="text-2xl font-bold">
                      ${(reportData.excedente.totalExcedente || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="max-w-md w-full ml-auto">
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Total Balance Remaining:</Label>
              <span className="font-semibold">
                $
                {calculatedData.grandTotals.grandTotalBalanceRemaining.toFixed(
                  2
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label>Total Excedents:</Label>
              <span className="font-semibold">
                ${(reportData?.excedente?.totalExcedente || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">System Total:</Label>
              <span className="text-lg font-bold">
                ${calculatedData.summary.systemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="realTotal">Real Total (from wallets):</Label>
              <Input
                id="realTotal"
                type="number"
                value={realTotal}
                onChange={(e) => setRealTotal(Number(e.target.value))}
                className="w-32 font-semibold"
              />
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">Difference:</Label>
              <span
                className={`text-lg font-bold ${
                  calculatedData.summary.difference !== 0
                    ? "text-destructive"
                    : "text-secondary"
                }`}
              >
                ${calculatedData.summary.difference.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="secondary"
          onClick={handleGeneratePdf}
          disabled={isPrinting || isSaving}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Generate PDF
        </Button>
        <Button onClick={handleSaveReport} disabled={isSaving || isPrinting}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Report
        </Button>
      </div>
    </div>
  );
}

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NewReportComponent />
    </Suspense>
  );
}
