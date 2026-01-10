/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatDateForDisplay,
  getCurrentDateString,
  extractDatePart,
} from "@/lib/dateUtils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { normalizeText } from "@/lib/utils";
import {
  Plus,
  Ban,
  CheckCircle2,
  Loader2,
  FileDown,
  ArrowUpDown,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Declaración de Tipos para jsPDF ---
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// --- DEFINICIONES DE TIPOS (ACTUALIZADAS) ---
interface PaymentMethod {
  _id: string;
  bankName: string;
  accountType?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  holderCI?: string | null;
  holderEmail?: string | null;
  isActive?: boolean;
}
interface Professor {
  _id: string;
  name: string;
  paymentData: PaymentMethod[];
  email?: string;
  phone?: string;
  typeId?: {
    rates: { single: number; couple: number; group: number };
  };
}

// Tipos según la nueva documentación de la API
interface EnrollmentInfo {
  enrollmentId: string;
  studentName: string;
  plan: string;
  subtotal: number;
  totalHours: number;
  hoursSeen: number;
  pPerHour: number;
  period: string;
}

interface BonusInfo {
  id: string;
  amount: number;
  reason?: string;
  createdAt?: string;
}

interface PenalizationInfo {
  id: string;
  penalizationMoney: number;
  penalization_description?: string;
  createdAt?: string;
}

interface PayoutPreview {
  professorId: string;
  professorName: string;
  month: string;
  reportDateRange: string;
  enrollments: EnrollmentInfo[];
  bonusInfo: BonusInfo[];
  penalizationInfo: PenalizationInfo[];
  totals: {
    subtotalEnrollments: number;
    totalBonuses: number;
    totalPenalizations: number;
    grandTotal: number;
  };
}

interface Payout {
  _id: string;
  professorId: Professor;
  month: string;
  enrollmentsInfo: EnrollmentInfo[];
  bonusInfo: BonusInfo[];
  penalizationInfo: PenalizationInfo[];
  total: number;
  paymentMethodId: string | null; // Puede ser _id o ID compuesto (bankName_accountNumber)
  paidAt: string;
  isActive: boolean;
  note?: string;
  createdAt: string;
}

type PayoutFormData = {
  professorId: string;
  month: string;
  preview: PayoutPreview | null;
  paymentMethodId: string;
  paidAt: string;
  note?: string;
};

// --- ESTADO INICIAL ---
const initialPayoutState: PayoutFormData = {
  professorId: "",
  month: `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`,
  preview: null,
  paymentMethodId: "",
  paidAt: getCurrentDateString(),
  note: "",
};

// --- GENERADOR DE PDF ---
const generatePayoutPDF = async (payout: Payout) => {
  console.log("Generating PDF for payout:", payout);
  console.log("Professor data:", payout.professorId);
  console.log("Payment method data:", payout.paymentMethodId);
  console.log("Enrollments:", payout.enrollmentsInfo);
  console.log("Bonuses:", payout.bonusInfo);
  console.log("Penalizations:", payout.penalizationInfo);
  
  // Obtener los datos completos del profesor desde el API
  let professor: any = payout.professorId;
  let paymentMethod: PaymentMethod | null = null;
  
  try {
    const professorId = typeof payout.professorId === 'string' 
      ? payout.professorId 
      : (payout.professorId as any)?._id;
    
    if (professorId) {
      const professorDetails = await apiClient(`api/professors/${professorId}`);
      professor = professorDetails;
      console.log("Professor details from API:", professorDetails);
      
      // Función helper para generar ID compuesto (igual que en el componente)
      const getPaymentMethodId = (pm: PaymentMethod): string => {
        if (pm._id) {
          return String(pm._id);
        }
        const bankName = pm.bankName || "";
        const accountNumber = pm.accountNumber || "";
        return `${bankName}_${accountNumber}`;
      };
      
      // Buscar el método de pago usando el paymentMethodId del payout
      const paymentMethodId = typeof payout.paymentMethodId === 'string' 
        ? payout.paymentMethodId 
        : (payout.paymentMethodId as any)?._id || null;
      
      if (paymentMethodId) {
        const professorPaymentData = professor.paymentData || [];
        paymentMethod = professorPaymentData.find((pm: PaymentMethod) => {
          const methodId = getPaymentMethodId(pm);
          return methodId === paymentMethodId || pm._id === paymentMethodId;
        }) || null;
      } else if (professor.paymentData && professor.paymentData.length > 0) {
        // Si no hay paymentMethodId, usar el primer método de pago
        paymentMethod = professor.paymentData[0];
      }
      
      console.log("Payment method found:", paymentMethod);
    }
  } catch (err) {
    console.error("Error fetching professor details:", err);
    // Si falla, usar los datos que ya tenemos
    professor = payout.professorId;
  }
  
  // Función helper para cargar imagen y obtener sus dimensiones
  const loadImageWithDimensions = async (imagePath: string): Promise<{ base64: string; width: number; height: number } | null> => {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Obtener dimensiones de la imagen
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            base64,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = reject;
        img.src = base64;
      });
    } catch (error) {
      console.error("Error loading logo:", error);
      return null;
    }
  };
  
  // Cargar el logo con sus dimensiones
  const logoData = await loadImageWithDimensions("/logo-alt.png");
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colores
  const primaryColor = "#4C549E";
  const paidDate = formatDateForDisplay(payout.paidAt);
  const creationDate = formatDateForDisplay(payout.createdAt);
  const payoutCode = payout._id.slice(-6).toUpperCase();

  // Formatear mes y año
  const [year, month] = payout.month.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[parseInt(month) - 1];
  const monthYear = `${monthName} ${year}`;
  
  let currentY = 0;
  
  // ========== HEADER ==========
  const headerHeight = 40;
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  
  // Logo (izquierda)
  if (logoData) {
    try {
      // Calcular dimensiones manteniendo la proporción
      // Altura máxima del logo: 30px (dejando 5px arriba y abajo en un header de 40px)
      const maxLogoHeight = 30;
      const aspectRatio = logoData.width / logoData.height;
      
      let logoHeight = maxLogoHeight;
      let logoWidth = logoHeight * aspectRatio;
      
      // Si el ancho es muy grande, ajustar basándose en el ancho máximo
      const maxLogoWidth = 80;
      if (logoWidth > maxLogoWidth) {
        logoWidth = maxLogoWidth;
        logoHeight = logoWidth / aspectRatio;
      }
      
      const logoX = 20;
      const logoY = (headerHeight - logoHeight) / 2; // Centrar verticalmente
      doc.addImage(logoData.base64, "PNG", logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.error("Error adding logo to PDF:", error);
      // Fallback a texto si falla la imagen
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Bespoke", 20, 20);
    }
  } else {
    // Fallback si no se puede cargar el logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Bespoke", 20, 20);
  }
  
  // Información de la empresa (derecha) - Texto en blanco
  doc.setTextColor(255, 255, 255);
  const companyInfoX = pageWidth - 20;
  let infoY = 15;
  
  // "Payroll - [mes año]" en negrita y más grande, en la misma línea
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const payrollText = `Payroll - ${monthYear}`;
  doc.text(payrollText, companyInfoX, infoY, { align: "right" });
  
  // Información de contacto más pequeña
  infoY += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("info.bespoked@gmail.com", companyInfoX, infoY, { align: "right" });
  infoY += 4;
  doc.text("+58 414 1750237", companyInfoX, infoY, { align: "right" });
  infoY += 4;
  doc.text("Venezuela, 5001", companyInfoX, infoY, { align: "right" });
  
  currentY = headerHeight + 15;
  
  // ========== PAID TO / INVOICE SECTION ==========
  doc.setTextColor(0, 0, 0);
  
  // Paid To (izquierda)
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Paid To:", 20, currentY);
  // Subrayar
  const paidToWidth = doc.getTextWidth("Paid To:");
  doc.line(20, currentY + 1, 20 + paidToWidth, currentY + 1);
  
  // Nombre del profesor más grande
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  let paidToY = currentY + 8;
  doc.text(professor.name || "N/A", 20, paidToY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  paidToY += 6;
  // Obtener address del profesor
  const address = (professor as any).address || null;
  if (address) {
    doc.text(address, 20, paidToY);
    paidToY += 4;
  }
  doc.text(professor.email || "N/A", 20, paidToY);
  paidToY += 4;
  doc.text(professor.phone || "N/A", 20, paidToY);
  
  // Invoice # (derecha)
  const invoiceX = pageWidth - 20;
  let invoiceY = currentY;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Invoice #", invoiceX, invoiceY, { align: "right" });
  // Subrayar
  const invoiceWidth = doc.getTextWidth("Invoice #");
  doc.line(invoiceX - invoiceWidth, invoiceY + 1, invoiceX, invoiceY + 1);
  invoiceY += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(payoutCode, invoiceX, invoiceY, { align: "right" });
  invoiceY += 8;
  doc.setFont("helvetica", "bolditalic");
  doc.text("Date", invoiceX, invoiceY, { align: "right" });
  // Subrayar
  const dateWidth = doc.getTextWidth("Date");
  doc.line(invoiceX - dateWidth, invoiceY + 1, invoiceX, invoiceY + 1);
  invoiceY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(creationDate, invoiceX, invoiceY, { align: "right" });
  invoiceY += 8;
  doc.setFont("helvetica", "bolditalic");
  doc.text("Payment Date", invoiceX, invoiceY, { align: "right" });
  // Subrayar
  const paymentDateWidth = doc.getTextWidth("Payment Date");
  doc.line(invoiceX - paymentDateWidth, invoiceY + 1, invoiceX, invoiceY + 1);
  invoiceY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(paidDate, invoiceX, invoiceY, { align: "right" });
  
  currentY = Math.max(paidToY, invoiceY) + 15;
  
  // ========== TABLAS ==========
  
  // Tabla Bespoke Students (Enrollments)
  if (payout.enrollmentsInfo && payout.enrollmentsInfo.length > 0) {
  doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bespoke Students", 20, currentY);
    currentY += 5;

    const enrollmentRows = payout.enrollmentsInfo.map((enrollment) => [
      enrollment.studentName,
      enrollment.plan,
      enrollment.hoursSeen.toString(),
      `$${enrollment.pPerHour.toFixed(2)}`,
      `$${enrollment.subtotal.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [["Student", "Plan", "Hours", "Rate", "Total"]],
      body: enrollmentRows,
      headStyles: { fillColor: primaryColor, textColor: 255, halign: "center" },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Tabla Bonos
  if (payout.bonusInfo && payout.bonusInfo.length > 0) {
    const bonusRows = payout.bonusInfo.map((bonus) => [
      bonus.reason || "Bonus",
      `$${bonus.amount.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [["Description", "Amount"]],
      body: bonusRows,
      headStyles: { fillColor: primaryColor, textColor: 255, halign: "center" },
      styles: { fontSize: 9 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Tabla Penalizaciones
  if (payout.penalizationInfo && payout.penalizationInfo.length > 0) {
    const penalizationRows = payout.penalizationInfo.map((penalization) => [
      penalization.penalization_description || "Penalization",
      `-$${penalization.penalizationMoney.toFixed(2)}`,
      ]);
    
  autoTable(doc, {
      startY: currentY,
      head: [["Description", "Amount"]],
      body: penalizationRows,
      headStyles: { fillColor: primaryColor, textColor: 255, halign: "center" },
      styles: { fontSize: 9 },
  });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // ========== RESUMEN (NOTAS IZQUIERDA, TOTALES DERECHA) ==========
  const summaryStartY = currentY;
  
  // Notas (izquierda)
  let notesHeight = 0;
  if (payout.note) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const notesText = doc.splitTextToSize(payout.note, 80);
    doc.text(notesText, 20, summaryStartY);
    notesHeight = notesText.length * 4;
  }
  
  // Totales (derecha) - montos al lado derecho del texto (menos espacio)
  const totalsX = pageWidth - 20;
  const amountX = totalsX - 60; // Reducido de 100 a 60 para menos espacio
  let totalsY = summaryStartY;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Calcular subtotales
  const subtotalEnrollments = payout.enrollmentsInfo?.reduce((sum, e) => sum + e.subtotal, 0) || 0;
  const subtotalBonuses = payout.bonusInfo?.reduce((sum, b) => sum + b.amount, 0) || 0;
  const subtotalPenalizations = payout.penalizationInfo?.reduce((sum, p) => sum + p.penalizationMoney, 0) || 0;
  
  doc.text(`Subtotal Enrollments:`, amountX, totalsY, { align: "right" });
  doc.text(`$${subtotalEnrollments.toFixed(2)}`, totalsX, totalsY, { align: "right" });
  totalsY += 6;
  
  if (subtotalBonuses > 0) {
    doc.text(`Subtotal Bonuses:`, amountX, totalsY, { align: "right" });
    doc.text(`$${subtotalBonuses.toFixed(2)}`, totalsX, totalsY, { align: "right" });
    totalsY += 6;
  }
  
  if (subtotalPenalizations > 0) {
    doc.text(`Subtotal Penalizations:`, amountX, totalsY, { align: "right" });
    doc.text(`-$${subtotalPenalizations.toFixed(2)}`, totalsX, totalsY, { align: "right" });
    totalsY += 6;
  }
  
  doc.setFont("helvetica", "bold");
  doc.text(`Total:`, amountX, totalsY, { align: "right" });
  doc.text(`$${payout.total.toFixed(2)}`, totalsX, totalsY, { align: "right" });
  
  currentY = Math.max(
    summaryStartY + notesHeight + 10,
    totalsY
  ) + 15;
  
  // ========== FOOTER (PAYMENT METHOD IZQUIERDA, SIGNATURE DERECHA) ==========
  
  // Payment Details (izquierda) - Tabla con columnas específicas
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Details", 20, currentY);
  currentY += 8;

  if (paymentMethod) {
    const paymentMethodName = paymentMethod.bankName || "N/A";
    const confirmationNumber = ""; // Vacío por ahora
    const paidOn = paidDate;
    const receivedBy = ""; // Vacío por ahora
    const date = "";
    
    autoTable(doc, {
      startY: currentY,
      head: [["Payment Method", "Confirmation Number", "Paid On", "Received By", "Date"]],
      body: [[paymentMethodName, confirmationNumber, paidOn, receivedBy, date]],
      headStyles: { fillColor: primaryColor, textColor: 255, halign: "center", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 20 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;
  } else {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("No payment method selected", 20, currentY);
    currentY += 10;
  }
  
  // Signature (derecha)
  const signatureX = pageWidth - 20;
  const signatureY = currentY;
  doc.line(signatureX - 60, signatureY + 20, signatureX, signatureY + 20);
  doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
  doc.text("Signature", signatureX - 30, signatureY + 25, { align: "center" });
  
  doc.save(
    `payout_${professor.name.replace(/\s+/g, "_")}_${payout.month}.pdf`
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selectedProfessorPaymentData, setSelectedProfessorPaymentData] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollmentsLoading, setIsEnrollmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState<"create" | "status" | null>(
    null
  );

  // Filtrar payouts basado en el término de búsqueda
  const filteredPayouts = useMemo(() => {
    const normalizedTerm = normalizeText(searchTerm.trim());
    if (!normalizedTerm) return payouts;

    return payouts.filter((payout) => {
      const professorMatch = normalizeText(payout.professorId?.name ?? "").includes(
        normalizedTerm
      );

      const monthMatch = normalizeText(payout.month ?? "").includes(normalizedTerm);

      const totalMatch = normalizeText(payout.total?.toString() ?? "").includes(
        normalizedTerm
      );

      const paidAtMatch = normalizeText(
        formatDateForDisplay(payout.paidAt)
      ).includes(normalizedTerm);

      return professorMatch || monthMatch || totalMatch || paidAtMatch;
    });
  }, [payouts, searchTerm]);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [formData, setFormData] = useState<PayoutFormData>(initialPayoutState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [payoutData, professorData] = await Promise.all([
          apiClient("api/payouts"),
          apiClient("api/professors"),
        ]);
        setPayouts(payoutData);
        console.log("Payouttttsss!!!!", payoutData);
        console.log("Professors data:", professorData);
        // Verificar si los profesores tienen paymentData
        if (professorData && professorData.length > 0) {
          console.log("First professor paymentData:", professorData[0]?.paymentData);
        }
        setProfessors(professorData);
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

  // --- FUNCIÓN PARA CARGAR PREVIEW ---
  const handleLoadPreview = async () => {
    if (!formData.professorId || !formData.month) {
      setDialogError("Please select both professor and month.");
        return;
      }
    
      setIsEnrollmentsLoading(true);
    setDialogError(null);
    try {
      const preview = await apiClient(
        `api/payouts/preview/${formData.professorId}?month=${formData.month}`
        );
      setFormData((prev) => ({ ...prev, preview }));
      } catch (err: unknown) {
        const errorMessage = getFriendlyErrorMessage(
          err,
        "Could not load payout preview. Please try again."
        );
        setDialogError(errorMessage);
      } finally {
        setIsEnrollmentsLoading(false);
      }
    };

  // --- CÁLCULO DE TOTALES (basado en preview) ---
  const totals = useMemo(() => {
    if (!formData.preview) {
      return {
        subtotalEnrollments: 0,
        totalBonuses: 0,
        totalPenalizations: 0,
        grandTotal: 0,
      };
    }
    return formData.preview.totals;
  }, [formData.preview]);

  // Función helper para generar un ID único basado en bankName + accountNumber
  const getPaymentMethodId = (pm: PaymentMethod): string => {
    // Si tiene _id, usarlo
    if (pm._id) {
      return String(pm._id);
    }
    // Si no, usar combinación de bankName + accountNumber
    const bankName = pm.bankName || "";
    const accountNumber = pm.accountNumber || "";
    return `${bankName}_${accountNumber}`;
  };

  const selectedPaymentMethod = useMemo(() => {
    if (!formData.paymentMethodId) return null;
    return selectedProfessorPaymentData.find((pm) => {
      const methodId = getPaymentMethodId(pm);
      return methodId === formData.paymentMethodId;
    }) || null;
  }, [formData.paymentMethodId, selectedProfessorPaymentData]);

  // Actualizar métodos de pago cuando se selecciona un profesor
  useEffect(() => {
    if (formData.professorId && professors.length > 0) {
    const professor = professors.find((p) => p._id === formData.professorId);
      if (professor) {
        const paymentMethods = Array.isArray(professor.paymentData) 
          ? professor.paymentData 
          : [];
        
        console.log("Professor found:", professor);
        console.log("Payment methods from professor:", paymentMethods);
        
        // Guardar los métodos de pago en un estado local
        setSelectedProfessorPaymentData(paymentMethods);
        
        // Seleccionar automáticamente el primer método de pago si hay métodos disponibles
        if (paymentMethods.length > 0) {
          setFormData((prev) => {
            // Si no hay método seleccionado o el método seleccionado no está en la lista, seleccionar el primero
            if (!prev.paymentMethodId) {
              const firstMethod = paymentMethods[0];
              const firstMethodId = getPaymentMethodId(firstMethod);
              return { ...prev, paymentMethodId: firstMethodId };
            }
            // Verificar si el método seleccionado aún existe
            const currentMethodExists = paymentMethods.some((pm) => {
              const methodId = getPaymentMethodId(pm);
              return methodId === prev.paymentMethodId;
            });
            if (!currentMethodExists) {
              const firstMethod = paymentMethods[0];
              const firstMethodId = getPaymentMethodId(firstMethod);
              return { ...prev, paymentMethodId: firstMethodId };
            }
            return prev;
          });
        } else {
          setSelectedProfessorPaymentData([]);
        }
      } else {
        console.log("Professor not found for ID:", formData.professorId);
        setSelectedProfessorPaymentData([]);
      }
    } else {
      setSelectedProfessorPaymentData([]);
    }
  }, [formData.professorId, professors]);

  const handleOpen = (type: "create" | "status", payout?: Payout) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedPayout(null);
      setFormData(initialPayoutState);
      setSelectedProfessorPaymentData([]); // Limpiar métodos de pago al abrir modal
    } else if (payout) {
      setSelectedPayout(payout);
    }
    setOpenDialog(type);
  };
  const handleClose = () => {
    setOpenDialog(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);

    if (!formData.preview) {
      setDialogError("Please load the payout preview first.");
      setIsSubmitting(false);
      return;
    }

    // Convertir paidAt a ISO string si existe
    const paidAtISO = formData.paidAt 
      ? new Date(formData.paidAt).toISOString() 
      : null;

    // Obtener el ID del método de pago seleccionado (puede ser _id o ID compuesto)
    const selectedPaymentMethodForSubmit = selectedProfessorPaymentData.find((pm) => {
      const methodId = getPaymentMethodId(pm);
      return methodId === formData.paymentMethodId;
    });
    // Si tiene _id, enviar el _id, si no, enviar el ID compuesto
    const paymentMethodIdForApi = selectedPaymentMethodForSubmit?._id || formData.paymentMethodId || null;

    // Construir payload según la documentación de la API
    const payload = {
      professorId: formData.professorId,
      month: formData.month,
      enrollments: formData.preview.enrollments,
      bonusInfo: formData.preview.bonusInfo.map(b => ({ id: b.id, amount: b.amount })),
      penalizationInfo: formData.preview.penalizationInfo.map(p => ({ 
        id: p.id, 
        penalizationMoney: p.penalizationMoney 
      })),
      totals: formData.preview.totals,
      note: formData.note || null,
      paymentMethodId: paymentMethodIdForApi,
      paidAt: paidAtISO,
    };
    console.log("lo que envia", payload);
    try {
      const response = await apiClient("api/payouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("LO DEL RESSS", response);
      const newPayout = await apiClient(`api/payouts/${response.payout._id}`);
      console.log("LO QUE MANDDAAAA", newPayout);
      await generatePayoutPDF(newPayout);
      const payoutData = await apiClient("api/payouts");
      setPayouts(payoutData);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isConflictError
          ? "A payout with this information already exists."
          : "Failed to save payout. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedPayout) return;
    setIsSubmitting(true);
    setDialogError(null);
    const action = selectedPayout.isActive ? "deactivate" : "activate";
    try {
      await apiClient(`api/payouts/${selectedPayout._id}/${action}`, {
        method: "PATCH",
      });
      const payoutData = await apiClient("api/payouts");
      setPayouts(payoutData);
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Payout not found."
          : "Failed to update payout status. Please try again."
      );
      setDialogError(errorMessage); // Mostrar error dentro del modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const stringLocaleSort = (locale = "es") => {
    return (rowA: any, rowB: any, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };
    };

  const columns: ColumnDef<Payout>[] = [
    {
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
      accessorKey: "professorId",
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.professorId?.name || "N/A",
    },
    {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Month
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      accessorKey: "month",
      sortingFn: stringLocaleSort(),
    },
    {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Total Paid
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      accessorKey: "total",
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => `$${(row.original.total || 0).toFixed(2)}`,
    },
    {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Date Paid
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      accessorKey: "paidAt",
      sortingFn: (rowA: any, rowB: any) => {
        const dateA = extractDatePart(String(rowA.original.paidAt || ""));
        const dateB = extractDatePart(String(rowB.original.paidAt || ""));
        return dateA.localeCompare(dateB);
      },
      cell: ({ row }) => formatDateForDisplay(row.original.paidAt),
    },
    {
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
      accessorKey: "isActive",
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.original.isActive
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {row.original.isActive ? "Paid" : "Voided"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            title="Download Receipt"
            size="icon"
            variant="outline"
            onClick={() => {
              generatePayoutPDF(row.original).catch((err) => {
                console.error("Error generating PDF:", err);
              });
            }}
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            title={row.original.isActive ? "Void Payout" : "Re-activate Payout"}
            size="icon"
            variant="outline"
            onClick={() => handleOpen("status", row.original)}
          >
            {row.original.isActive ? (
              <Ban className="h-4 w-4 text-accent-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        subtitle="Manage professor payments and salaries"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Payout
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
        <Card>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredPayouts}
              searchKeys={[]}
              searchPlaceholder=""
            />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={openDialog === "create"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Payout</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4"
          >
            <fieldset className="border p-4 rounded-md">
              <legend className="px-1 text-sm">Professor and Period</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label>Professor</Label>
                  <Select
                    value={formData.professorId}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        professorId: v,
                      preview: null,
                        paymentMethodId: "",
                      }))
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
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={formData.month}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, month: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </fieldset>
            {formData.professorId && formData.month && (
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Payout Preview</legend>
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadPreview}
                    disabled={isEnrollmentsLoading}
                  >
                    {isEnrollmentsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Load Preview
                      </>
                    )}
                  </Button>
                </div>
                {isEnrollmentsLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : formData.preview ? (
                  <div className="space-y-4">
                    {formData.preview.professorName && (
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Professor:</strong> {formData.preview.professorName}</p>
                        <p><strong>Period:</strong> {formData.preview.reportDateRange}</p>
                      </div>
                    )}
                    {/* Enrollments Table */}
                    {formData.preview.enrollments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                          Enrollments ({formData.preview.enrollments.length})
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Plan</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead className="text-right">Total Hours</TableHead>
                              <TableHead className="text-right">Hours Seen</TableHead>
                              <TableHead className="text-right">Pay/Hour</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {formData.preview.enrollments.map((enrollment, index) => (
                              <TableRow key={enrollment.enrollmentId || index}>
                                    <TableCell className="max-w-xs truncate">
                                  {enrollment.studentName}
                                    </TableCell>
                                <TableCell>{enrollment.plan}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {enrollment.period}
                                    </TableCell>
                                <TableCell className="text-right">
                                  {enrollment.totalHours}
                                    </TableCell>
                                <TableCell className="text-right">
                                  {enrollment.hoursSeen}
                                    </TableCell>
                                <TableCell className="text-right">
                                  ${enrollment.pPerHour.toFixed(2)}
                                    </TableCell>
                                <TableCell className="text-right font-medium">
                                  ${enrollment.subtotal.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    )}
                    {/* Bonuses */}
                    {formData.preview.bonusInfo.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                          Bonuses ({formData.preview.bonusInfo.length})
                      </h4>
                      <div className="space-y-2">
                          {formData.preview.bonusInfo.map((bonus) => (
                            <div
                              key={bonus.id}
                              className="flex justify-between items-center p-2 bg-muted/50 rounded-md"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  ${bonus.amount.toFixed(2)}
                                </p>
                                {bonus.reason && (
                                  <p className="text-xs text-muted-foreground">
                                    {bonus.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      </div>
                    )}
                    {/* Penalizations */}
                    {formData.preview.penalizationInfo.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Penalizations ({formData.preview.penalizationInfo.length})
                        </h4>
                        <div className="space-y-2">
                          {formData.preview.penalizationInfo.map((penalization) => (
                            <div
                              key={penalization.id}
                              className="flex justify-between items-center p-2 bg-destructive/10 rounded-md"
                            >
                              <div>
                                <p className="text-sm font-medium text-destructive">
                                  -${penalization.penalizationMoney.toFixed(2)}
                                </p>
                                {penalization.penalization_description && (
                                  <p className="text-xs text-muted-foreground">
                                    {penalization.penalization_description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                    </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Click &quot;Load Preview&quot; to see the payout details for this professor and month.
                  </div>
                )}
              </fieldset>
            )}
            {formData.professorId && (
            <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Payment Information</legend>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={formData.paymentMethodId}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, paymentMethodId: v }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method..." />
                      </SelectTrigger>
                      <SelectContent>
                          {selectedProfessorPaymentData && selectedProfessorPaymentData.length > 0 ? (
                            selectedProfessorPaymentData.map((pm) => {
                                const paymentMethodId = getPaymentMethodId(pm);
                                return (
                                  <SelectItem key={paymentMethodId} value={paymentMethodId}>
                                    {pm.bankName || "Payment Method"} ({pm.accountNumber?.slice(-4) || "N/A"})
                            </SelectItem>
                                );
                              })
                          ) : (
                            <SelectItem value="no-methods" disabled>
                              No payment methods available
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                    {selectedPaymentMethod && (
                        <div className="text-xs p-3 bg-muted/50 rounded-md space-y-1 border">
                        <p>
                            <strong>Bank:</strong>{" "}
                            {selectedPaymentMethod.bankName || "N/A"}
                        </p>
                        <p>
                          <strong>Account:</strong>{" "}
                            {selectedPaymentMethod.accountNumber || "N/A"}
                        </p>
                        <p>
                          <strong>Type:</strong>{" "}
                            {selectedPaymentMethod.accountType || "N/A"}
                          </p>
                          {selectedPaymentMethod.holderName && (
                            <p>
                              <strong>Holder:</strong>{" "}
                              {selectedPaymentMethod.holderName}
                        </p>
                          )}
                          {selectedPaymentMethod.holderEmail && (
                        <p>
                          <strong>Email:</strong>{" "}
                          {selectedPaymentMethod.holderEmail}
                        </p>
                          )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </fieldset>
            )}
            {formData.preview && (
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Summary</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-2">
                  <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date Paid</Label>
                    <Input
                      type="date"
                        max="9999-12-31"
                      value={formData.paidAt}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, paidAt: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-md space-y-2 flex flex-col justify-center">
                  <div className="flex justify-between">
                      <p>Subtotal Enrollments:</p>
                      <p>${totals.subtotalEnrollments.toFixed(2)}</p>
                  </div>
                    {totals.totalBonuses > 0 && (
                      <div className="flex justify-between text-green-600">
                        <p>Bonuses:</p>
                        <p>+${totals.totalBonuses.toFixed(2)}</p>
                  </div>
                    )}
                    {totals.totalPenalizations > 0 && (
                      <div className="flex justify-between text-destructive">
                        <p>Penalizations:</p>
                        <p>-${totals.totalPenalizations.toFixed(2)}</p>
                      </div>
                    )}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <p>Total to Pay:</p>
                      <p>${totals.grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </fieldset>
            )}
            <fieldset className="border p-4 rounded-md">
              <legend className="px-1 text-sm">Notes (Optional)</legend>
              <div className="mt-2">
                <Textarea
                  name="note"
                  value={formData.note || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, note: e.target.value }))
                  }
                  className="w-full h-20 p-2 border rounded-md bg-transparent"
                  placeholder="Add any relevant notes for this payout..."
                />
              </div>
            </fieldset>
            {dialogError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.preview || totals.grandTotal <= 0}>
                Create Payout & Download PDF
              </Button>
            </DialogFooter>
          </form>
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
            {selectedPayout?.isActive ? "void" : "re-activate"} this payout?
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
              variant={selectedPayout?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2" />}
              {selectedPayout?.isActive ? "Void Payout" : "Re-activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
