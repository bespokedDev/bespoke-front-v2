// Types for Penalization Registry

/** Status of a penalization registry (API: 0 = Inactive, 1 = Active, 2 = Paid/Applied) */
export type PenalizationStatus = 0 | 1 | 2;

export const PENALIZATION_STATUS_LABELS: Record<PenalizationStatus, string> = {
  0: "Inactive",
  1: "Active",
  2: "Paid",
};

export function getPenalizationStatusLabel(status: number): string {
  if (status === 0 || status === 1 || status === 2) {
    return PENALIZATION_STATUS_LABELS[status as PenalizationStatus];
  }
  return "Unknown";
}

/** Returns Tailwind classes for the status badge (bg and text). */
export function getPenalizationStatusBadgeClass(status: number): string {
  switch (status) {
    case 1:
      return "bg-secondary/20 text-secondary";
    case 2:
      return "bg-primary/20 text-primary";
    case 0:
    default:
      return "bg-muted text-muted-foreground";
  }
}

export interface PenalizationLevel {
  _id: string; // ObjectId del elemento dentro del array penalizationLevels
  tipo: string;
  nivel: number;
  description?: string;
}

export interface PenalizationType {
  _id: string;
  name: string;
  penalizationLevels?: PenalizationLevel[];
  status: number;
}

export interface EnrollmentBrief {
  _id: string;
  alias?: string | null;
  language: string;
  enrollmentType: string;
  planId?: {
    _id: string;
    name: string;
  };
  professorId?: ProfessorBrief | null;
  studentIds?: Array<{
    studentId?: {
      _id: string;
      name: string;
    } | string;
  }>;
}

export interface ProfessorBrief {
  _id: string;
  name: string;
  email: string;
}

export interface StudentBrief {
  _id: string;
  name: string;
  studentCode: string;
  email: string;
}

export interface PenalizationRegistry {
  _id: string;
  idPenalizacion?: PenalizationType | null; // Puede venir poblado desde el backend
  idpenalizationLevel?: string | null; // ObjectId del elemento dentro de penalizationLevels
  enrollmentId?: EnrollmentBrief | null;
  professorId?: ProfessorBrief | null;
  studentId?: StudentBrief | null;
  penalization_description: string;
  penalizationMoney?: number | null;
  lateFee?: number | null;
  endDate?: string | null;
  support_file?: string | null;
  userId?: string | null;
  payOutId?: string | null;
  status: PenalizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PenalizationRegistryFormData {
  idPenalizacion: string;
  idpenalizationLevel?: string | null; // ObjectId del elemento dentro de penalizationLevels
  enrollmentId: string;
  professorId: string;
  studentId: string;
  penalization_description: string;
  penalizationMoney?: number | null;
  lateFee?: number | null;
  endDate?: string | null;
  support_file?: string | null;
  notification: number; // 0 or 1
  notification_description?: string;
}

