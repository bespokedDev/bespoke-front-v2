export interface Plan {
  _id: string;
  name: string;
  weeklyClasses: number;
  pricing: { single: number; couple: number; group: number };
}

export interface StudentBrief {
  _id: string;
  name: string;
  status?: number; // 1 = activo, 0 = inactivo
}

export interface ProfessorBrief {
  _id: string;
  name: string;
}

export interface SubstituteProfessor {
  professorId: string;
  status: number; // 1=activo, 0=inactivo
  assignedDate: string;
  expiryDate: string;
}

export interface ScheduledDay {
  _id?: string;
  day: string;
}

export interface StudentEnrollmentInfo {
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

export interface Enrollment {
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

export type StudentEnrollmentFormData = {
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

export type EnrollmentFormData = {
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

