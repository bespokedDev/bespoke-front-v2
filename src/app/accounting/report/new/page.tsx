/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo, Suspense, Fragment } from "react";
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
  lostClasses?: {
    count: number;
  } | null;
  cycleRemaining?: number | null;
  studentReserveTotal?: number | null;
  prepaidExtra?: number | null;
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
  enrollmentAlias?: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  amountInDollars: number;
  balance: number | null;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number | null;
  oldBalance: number | null;
  payment: number | null;
  total: number;
  balanceRemaining: number;
  lostClasses?: {
    count: number;
  } | null;
  cycleRemaining?: number | null;
  studentReserveTotal?: number | null;
  prepaidExtra?: number | null;
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

/** Desglose por precio cuando hay varios ciclos/precios en el mismo enrollment (API). */
interface ClassNotViewedGroupedByPrice {
  pricePerHour: number;
  numberOfClasses: number;
  excedente: number;
  classesNotViewed?: Array<{
    classId: string;
    classDate: string;
    classViewed: number;
    pricePerHour: number;
  }>;
}

interface ClassNotViewedDetail {
  enrollmentId: string;
  enrollmentAlias: string | null;
  studentNames: string;
  professorName?: string;
  plan: string;
  numberOfClasses: number;
  /** `null` si hay varios precios en el enrollment; usar `classesNotViewedGroupedByPrice`. */
  pricePerHour: number | null;
  excedente: number;
  classesNotViewed: any[]; // Array de ClassRegistry objects
  classesNotViewedGroupedByPrice?: ClassNotViewedGroupedByPrice[];
}

/** Desglose en sub-filas solo cuando hay más de un precio distinto (varios grupos). */
function shouldShowGroupedClassNotViewedBreakdown(
  detail: ClassNotViewedDetail
): boolean {
  const groups = detail.classesNotViewedGroupedByPrice;
  return groups != null && groups.length > 1;
}

/**
 * Precio a mostrar en fila única: raíz si viene; si es null y hay un solo grupo, el del grupo.
 */
function resolveClassNotViewedDisplayPrice(
  detail: ClassNotViewedDetail
): number | null {
  if (typeof detail.pricePerHour === "number" && !Number.isNaN(detail.pricePerHour)) {
    return detail.pricePerHour;
  }
  const groups = detail.classesNotViewedGroupedByPrice;
  if (groups?.length === 1) {
    const p = groups[0].pricePerHour;
    return typeof p === "number" && !Number.isNaN(p) ? p : null;
  }
  return null;
}

function formatMoney2(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPricePerHourCell(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return formatMoney2(value);
}

/** Filas para jsPDF: una fila plana o cabecera + una fila por grupo cuando hay varios precios. */
function buildClassNotViewedPdfBodyRows(
  details: ClassNotViewedDetail[]
): string[][] {
  const rows: string[][] = [];
  for (const detail of details) {
    const enrollmentLabel = String(
      detail.enrollmentAlias || detail.enrollmentId
    );
    if (shouldShowGroupedClassNotViewedBreakdown(detail)) {
      const groups = detail.classesNotViewedGroupedByPrice!;
      rows.push([
        enrollmentLabel,
        detail.studentNames,
        detail.plan,
        detail.numberOfClasses.toString(),
        "Varios",
        formatMoney2(detail.excedente),
      ]);
      for (const g of groups) {
        rows.push([
          "",
          "",
          "",
          g.numberOfClasses.toString(),
          formatMoney2(g.pricePerHour),
          formatMoney2(g.excedente),
        ]);
      }
    } else {
      const price = resolveClassNotViewedDisplayPrice(detail);
      rows.push([
        enrollmentLabel,
        detail.studentNames,
        detail.plan,
        detail.numberOfClasses.toString(),
        formatPricePerHourCell(price),
        formatMoney2(detail.excedente),
      ]);
    }
  }
  return rows;
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
  studentId?: string | null;
  studentName?: string;
  studentCode?: string | null;
  professorId?: string;
  professorName?: string;
  professorCiNumber?: string;
  penalizationMoney: number;
  totalIncomesAmount?: number;
  excedenteAmount?: number;
  isFullyPaid?: boolean;
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
  linkedIncomes?: Array<{
    incomeId: string;
    amount: number;
    income_date: string;
    divisa: string;
    paymentMethod: string;
  }>;
}

interface PrepaidEnrollmentDetail {
  enrollmentId: string;
  enrollmentAlias: string | null;
  studentNames: string;
  professorName: string;
  plan: string;
  startDate: string;
  endDate: string;
  balance: number;
  incomes: ExcedentDetail[];
}

/** Usado en pausedEnrollmentsDetails y en dissolvedEnrollments.details (misma forma según API) */
interface PausedEnrollmentDetail {
  enrollmentId: string;
  enrollmentAlias: string | null;
  studentNames: string;
  professorName: string;
  plan: string;
  status: number;
  pauseDate: string | null;
  disolveDate?: string | null;
  balance_transferred_to_enrollment?: string | null;
  availableBalance: number;
  excedente: number;
}

interface ExcedentReport {
  reportDateRange: string;
  totalExcedente: number;
  totalExcedenteIncomes: number;
  totalExcedenteClasses: number;
  totalPrepaidEnrollments?: number;
  totalPausedEnrollments?: number;
  totalBonuses: number;
  totalExcedentePenalizations?: number;
  numberOfIncomes: number;
  numberOfClassesNotViewed: number;
  numberOfBonuses: number;
  numberOfPausedEnrollments?: number;
  numberOfPenalizations?: number;
  incomeDetails: ExcedentDetail[];
  classNotViewedDetails: ClassNotViewedDetail[];
  prepaidEnrollmentsDetails?: PrepaidEnrollmentDetail[];
  pausedEnrollmentsDetails?: PausedEnrollmentDetail[];
  /** Enrollments disueltos (status 0) sin transferencia; details tienen la misma forma que pausedEnrollmentsDetails */
  dissolvedEnrollments?: {
    total: number;
    count: number;
    details: PausedEnrollmentDetail[];
  };
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
      totalFinal: number;
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

      // Asegurar que excedente tenga la estructura correcta con campos opcionales
      // Nota: El campo puede venir como "excedente" (singular) o "excedents" (plural) según la versión de la API
      const excedenteResponse = response.excedente || response.excedents;
      const excedenteData = excedenteResponse
        ? {
            ...excedenteResponse,
            totalExcedenteIncomes:
              excedenteResponse.totalExcedenteIncomes ?? 0,
            totalExcedenteClasses:
              excedenteResponse.totalExcedenteClasses ?? 0,
            totalPrepaidEnrollments:
              excedenteResponse.totalPrepaidEnrollments ?? 0,
            totalPausedEnrollments:
              excedenteResponse.totalPausedEnrollments ?? 0,
            totalBonuses: excedenteResponse.totalBonuses ?? 0,
            totalExcedentePenalizations:
              excedenteResponse.totalExcedentePenalizations ?? 0,
            numberOfClassesNotViewed:
              excedenteResponse.numberOfClassesNotViewed ?? 0,
            numberOfBonuses: excedenteResponse.numberOfBonuses ?? 0,
            numberOfPausedEnrollments:
              excedenteResponse.numberOfPausedEnrollments ?? 0,
            incomeDetails: excedenteResponse.incomeDetails ?? [],
            classNotViewedDetails:
              excedenteResponse.classNotViewedDetails ?? [],
            prepaidEnrollmentsDetails:
              excedenteResponse.prepaidEnrollmentsDetails ?? [],
            pausedEnrollmentsDetails:
              excedenteResponse.pausedEnrollmentsDetails ?? [],
            bonusDetails: excedenteResponse.bonusDetails ?? [],
            penalizationDetails: excedenteResponse.penalizationDetails ?? [],
            dissolvedEnrollments: excedenteResponse.dissolvedEnrollments ?? {
              total: 0,
              count: 0,
              details: [],
            },
            // Mantener compatibilidad con estructura antigua
            details:
              excedenteResponse.incomeDetails ??
              excedenteResponse.details ??
              [],
            numberOfIncomes:
              excedenteResponse.numberOfIncomes ??
              excedenteResponse.incomeDetails?.length ??
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
              "Cycle Rem.",
              "Prepaid Extra",
              "T. Teacher",
              "T. Bespoke",
              "Lost Classes",
              "Bal. Rem.",
            ],
          ],
          body: prof.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${(d.balance || 0).toFixed(2)}`,
            d.totalHours,
            `$${d.pricePerHour.toFixed(2)}`,
            d.hoursSeen || "",
            `$${d.pPerHour.toFixed(2)}`,
            `$${Number(
              typeof d.cycleRemaining === "number" ? d.cycleRemaining : 0
            ).toFixed(2)}`,
            `$${Number(
              typeof d.prepaidExtra === "number" ? d.prepaidExtra : 0
            ).toFixed(2)}`,
            `$${d.totalTeacher.toFixed(2)}`,
            `$${d.totalBespoke.toFixed(2)}`,
            Number(d.lostClasses?.count ?? 0),
            `$${Number(
              typeof d.studentReserveTotal === "number"
                ? d.studentReserveTotal
                : d.balanceRemaining
            ).toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 11,
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
              "Lost Classes",
              "Bal. Rem.",
            ],
          ],
          body: calculatedData.specialReport.details.map((d) => [
            d.period,
            d.plan,
            d.enrollmentAlias || d.studentName,
            `$${(d.balance || 0).toFixed(2)}`,
            d.totalHours,
            d.hoursSeen || "",
            `$${(d.oldBalance || 0).toFixed(2)}`,
            `$${(d.payment || 0).toFixed(2)}`,
            `$${d.total.toFixed(2)}`,
            Number(d.lostClasses?.count ?? 0),
            `$${Number(
              typeof d.studentReserveTotal === "number"
                ? d.studentReserveTotal
                : d.balanceRemaining
            ).toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 9,
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
            body: buildClassNotViewedPdfBodyRows(
              excedente.classNotViewedDetails
            ),
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

        // Sección 3: Prepaid Enrollments
        if (
          excedente.prepaidEnrollmentsDetails &&
          excedente.prepaidEnrollmentsDetails.length > 0
        ) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Prepaid Enrollments", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Alias / Student",
                "Professor",
                "Plan",
                "Start Date",
                "End Date",
                "Balance",
              ],
            ],
            body: excedente.prepaidEnrollmentsDetails.map((detail) => [
              detail.enrollmentAlias || detail.studentNames,
              detail.professorName,
              detail.plan,
              formatDateForDisplay(detail.startDate),
              formatDateForDisplay(detail.endDate),
              `$${detail.balance.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 5,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${(excedente.totalPrepaidEnrollments || 0).toFixed(2)}`,
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

        // Sección 4: Paused Enrollments
        if (
          excedente.pausedEnrollmentsDetails &&
          excedente.pausedEnrollmentsDetails.length > 0
        ) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Paused Enrollments", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Date",
                "Student",
                "Plan",
                "Professor",
                "Excedent",
              ],
            ],
            body: excedente.pausedEnrollmentsDetails.map((detail) => [
              detail.pauseDate
                ? formatDateForDisplay(detail.pauseDate)
                : "N/A",
              detail.enrollmentAlias || detail.studentNames,
              detail.plan,
              detail.professorName,
              `$${detail.excedente.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 4,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${(excedente.totalPausedEnrollments || 0).toFixed(2)}`,
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

        // Dissolved Enrollments (dentro de excedente según doc API)
        if (
          excedente.dissolvedEnrollments &&
          excedente.dissolvedEnrollments.count > 0
        ) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Dissolved Enrollments", 14, finalY);
          finalY += 6;
          doc.setFontSize(9);
          doc.text(
            `${excedente.dissolvedEnrollments.count} dissolved · Total excedente: $${excedente.dissolvedEnrollments.total.toFixed(2)}`,
            14,
            finalY
          );
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Date",
                "Student",
                "Plan",
                "Professor",
                "Balance transferred",
                "Excedent",
              ],
            ],
            body: excedente.dissolvedEnrollments.details.map((d) => [
              d.disolveDate ? formatDateForDisplay(d.disolveDate) : "N/A",
              d.studentNames,
              d.enrollmentAlias?.trim() || d.plan,
              d.professorName,
              d.balance_transferred_to_enrollment ? "Yes" : "—",
              `$${d.excedente.toFixed(2)}`,
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 5,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${excedente.dissolvedEnrollments.total.toFixed(2)}`,
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

        // Sección 5: Penalizaciones de Estudiantes
        if (
          excedente.penalizationDetails &&
          excedente.penalizationDetails.length > 0
        ) {
          hasExcedents = true;
          finalY += 5;
          doc.setFontSize(14);
          doc.text("Student Penalizations (with linked incomes)", 14, finalY);
          finalY += 8;

          autoTable(doc, {
            startY: finalY,
            head: [
              [
                "Date",
                "Student",
                "Student Code",
                "Description",
                "Type",
                "Penalization",
                "Paid",
                "Excedent",
                "Status",
              ],
            ],
            body: excedente.penalizationDetails.map((penalization) => [
              formatDateForDisplay(penalization.createdAt),
              penalization.studentName || "—",
              penalization.studentCode || "—",
              penalization.description || "No description",
              penalization.penalizationType?.name || "—",
              `$${penalization.penalizationMoney.toFixed(2)}`,
              `$${(penalization.totalIncomesAmount || 0).toFixed(2)}`,
              `$${(penalization.excedenteAmount || 0).toFixed(2)}`,
              penalization.isFullyPaid ? "Fully Paid" : "Partially Paid",
            ]),
            foot: [
              [
                {
                  content: "Total:",
                  colSpan: 8,
                  styles: { halign: "right", fontStyle: "bold" },
                },
                `$${(excedente.totalExcedentePenalizations || 0).toFixed(2)}`,
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

        // Sección 6: Bonos de Profesores
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

          const excedentsBody: any[] = [
            [
              "Total Excedent Incomes",
              `$${excedente.totalExcedenteIncomes.toFixed(2)}`,
            ],
            [
              "Total Classes Not Viewed",
              `$${excedente.totalExcedenteClasses.toFixed(2)}`,
            ],
          ];

          // Add Prepaid Enrollments if available
          if (excedente.totalPrepaidEnrollments && excedente.totalPrepaidEnrollments > 0) {
            excedentsBody.push([
              "Total Prepaid Enrollments",
              `$${excedente.totalPrepaidEnrollments.toFixed(2)}`,
            ]);
          }

          // Add Paused Enrollments if available
          if (excedente.totalPausedEnrollments && excedente.totalPausedEnrollments > 0) {
            excedentsBody.push([
              "Total Paused Enrollments",
              `$${excedente.totalPausedEnrollments.toFixed(2)}`,
            ]);
          }

          // Add Penalizations if available
          if (excedente.totalExcedentePenalizations && excedente.totalExcedentePenalizations > 0) {
            excedentsBody.push([
              "Total Penalizations",
              `$${excedente.totalExcedentePenalizations.toFixed(2)}`,
            ]);
          }

          excedentsBody.push([
            "Total Bonuses",
            {
              content: `-$${excedente.totalBonuses.toFixed(2)}`,
              styles: { textColor: [255, 0, 0] },
            },
          ]);

          excedentsBody.push([
            {
              content: "Grand Total:",
              styles: { fontStyle: "bold" },
            },
            {
              content: `$${excedente.totalExcedente.toFixed(2)}`,
              styles: { fontStyle: "bold" },
            },
          ]);

          autoTable(doc, {
            startY: finalY,
            head: [["Concept", "Amount"]],
            body: excedentsBody,
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
                      <TableHead className="w-[110px]">Cycle Rem.</TableHead>
                      <TableHead className="w-[110px]">Prepaid Extra</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        Total Teacher
                      </TableHead>
                      <TableHead className="text-right">
                        Total Bespoke
                      </TableHead>
                      <TableHead className="text-right">Lost Classes</TableHead>
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
                              ${typeof detail.balance === "number" ? detail.balance.toFixed(2) : "0.00"}
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
                              ${typeof detail.cycleRemaining === "number" ? detail.cycleRemaining.toFixed(2) : "0.00"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2">
                              ${typeof detail.prepaidExtra === "number" ? detail.prepaidExtra.toFixed(2) : "0.00"}
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
                          <TableCell className="text-right font-medium">
                            {Number(detail.lostClasses?.count ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {Number(
                              typeof detail.studentReserveTotal === "number"
                                ? detail.studentReserveTotal
                                : detail.balanceRemaining
                            ).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={15}
                          className="text-center text-muted-foreground"
                        >
                          No details found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={12}></TableCell>
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
                    {reportData.totals.subtotals.normalProfessors.totalFinal.toFixed(
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
                    <TableHead>Lost Classes</TableHead>
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
                                  {detail.enrollmentAlias || detail.studentName || "—"}
                                </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2">
                                ${typeof detail.balance === "number" ? detail.balance.toFixed(2) : "0.00"}
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
                            <TableCell className="text-right font-medium">
                              {Number(detail.lostClasses?.count ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {Number(
                                typeof detail.studentReserveTotal === "number"
                                  ? detail.studentReserveTotal
                                  : detail.balanceRemaining
                              ).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={12}
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
                        (detail) => {
                          if (
                            shouldShowGroupedClassNotViewedBreakdown(detail)
                          ) {
                            const groups =
                              detail.classesNotViewedGroupedByPrice!;
                            return (
                              <Fragment key={detail.enrollmentId}>
                                <TableRow>
                                  <TableCell>
                                    {detail.enrollmentAlias ||
                                      detail.studentNames}
                                  </TableCell>
                                  <TableCell>{detail.plan}</TableCell>
                                  <TableCell className="text-right">
                                    {detail.numberOfClasses}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    Varios
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatMoney2(detail.excedente)}
                                  </TableCell>
                                </TableRow>
                                {groups.map((g, i) => (
                                  <TableRow
                                    key={`${detail.enrollmentId}-g-${i}`}
                                    className="bg-muted/40"
                                  >
                                    <TableCell />
                                    <TableCell className="pl-6 text-sm text-muted-foreground">
                                      Por precio
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {g.numberOfClasses}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatMoney2(g.pricePerHour)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatMoney2(g.excedente)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </Fragment>
                            );
                          }
                          const displayPrice =
                            resolveClassNotViewedDisplayPrice(detail);
                          return (
                            <TableRow key={detail.enrollmentId}>
                              <TableCell>
                                {detail.enrollmentAlias ||
                                  detail.studentNames}
                              </TableCell>
                              <TableCell>{detail.plan}</TableCell>
                              <TableCell className="text-right">
                                {detail.numberOfClasses}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPricePerHourCell(displayPrice)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatMoney2(detail.excedente)}
                              </TableCell>
                            </TableRow>
                          );
                        }
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

              {/* Sección 3: Prepaid Enrollments */}
              {reportData.excedente.prepaidEnrollmentsDetails &&
              reportData.excedente.prepaidEnrollmentsDetails.length > 0 && (
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold">
                    Prepaid Enrollments
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alias / Student Name</TableHead>
                        <TableHead>Professor</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.excedente.prepaidEnrollmentsDetails.map(
                        (detail) => (
                          <TableRow key={detail.enrollmentId}>
                            <TableCell>
                              {detail.enrollmentAlias || detail.studentNames}
                            </TableCell>
                            <TableCell>{detail.professorName}</TableCell>
                            <TableCell>{detail.plan}</TableCell>
                            <TableCell>
                              {formatDateForDisplay(detail.startDate)}
                            </TableCell>
                            <TableCell>
                              {formatDateForDisplay(detail.endDate)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${detail.balance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          $
                          {(
                            reportData.excedente.totalPrepaidEnrollments || 0
                          ).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Sección 4: Paused Enrollments */}
              {reportData.excedente.pausedEnrollmentsDetails &&
              reportData.excedente.pausedEnrollmentsDetails.length > 0 && (
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold">
                    Paused Enrollments
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Professor</TableHead>
                        <TableHead className="text-right">Excedent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.excedente.pausedEnrollmentsDetails.map(
                        (detail) => (
                          <TableRow key={detail.enrollmentId}>
                            <TableCell>
                              {detail.pauseDate
                                ? formatDateForDisplay(detail.pauseDate)
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {detail.enrollmentAlias || detail.studentNames}
                            </TableCell>
                            <TableCell>{detail.plan}</TableCell>
                            <TableCell>{detail.professorName}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${detail.excedente.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
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
                            reportData.excedente.totalPausedEnrollments || 0
                          ).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}

              {/* Dissolved Enrollments (dentro de excedente según doc API) */}
              {reportData.excedente?.dissolvedEnrollments &&
                reportData.excedente.dissolvedEnrollments.count > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="text-lg font-semibold">
                      Dissolved Enrollments
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Professor</TableHead>
                          <TableHead>Balance transferred</TableHead>
                          <TableHead className="text-right">Excedent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.excedente.dissolvedEnrollments.details.map(
                          (d) => (
                            <TableRow key={d.enrollmentId}>
                              <TableCell>
                                {d.disolveDate
                                  ? formatDateForDisplay(d.disolveDate)
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{d.studentNames}</TableCell>
                              <TableCell>
                                {d.enrollmentAlias?.trim() || d.plan}
                              </TableCell>
                              <TableCell>{d.professorName}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {d.balance_transferred_to_enrollment
                                  ? "Yes"
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${d.excedente.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={5} className="text-right font-bold">
                            Total:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            $
                            {reportData.excedente.dissolvedEnrollments.total.toFixed(
                              2
                            )}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}

              {/* Sección 5: Penalizaciones Monetarias de Estudiantes */}
              {reportData.excedente.penalizationDetails &&
              reportData.excedente.penalizationDetails.length > 0 && (
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold">
                    Student Penalizations (with linked incomes)
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Student Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Penalization Amount</TableHead>
                        <TableHead className="text-right">Paid Amount</TableHead>
                        <TableHead className="text-right">Excedent Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.excedente.penalizationDetails.map(
                        (penalization) => (
                          <TableRow key={penalization.penalizationId}>
                            <TableCell>
                              {formatDateForDisplay(penalization.createdAt)}
                            </TableCell>
                            <TableCell>
                              {penalization.studentName || "—"}
                            </TableCell>
                            <TableCell>
                              {penalization.studentCode || "—"}
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
                            <TableCell className="text-right">
                              ${(penalization.totalIncomesAmount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${(penalization.excedenteAmount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {penalization.isFullyPaid ? (
                                <span className="text-green-600 font-semibold">
                                  Fully Paid
                                </span>
                              ) : (
                                <span className="text-orange-600 font-semibold">
                                  Partially Paid
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={9} className="text-right font-bold">
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

              {/* Sección 6: Professor Bonuses */}
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
