// Types for Penalization Registry

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
  alias?: string;
  language: string;
  enrollmentType: string;
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
  status: number;
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

