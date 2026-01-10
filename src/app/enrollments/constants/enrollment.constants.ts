import { getCurrentDateString } from "@/lib/dateUtils";
import type { EnrollmentFormData } from "../types/enrollment.types";

export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const LEARNING_TYPES = [
  "Visual",
  "Auditivo",
  "Verbal",
  "Lógico",
  "Kinestésico",
] as const;

export const LEARNING_TYPE_DESCRIPTIONS: Record<string, string> = {
  Visual: "Aprende mejor con imágenes, colores y gráficos.",
  Auditivo: "Retiene información al escuchar explicaciones o música.",
  Verbal: "Aprende mejor mediante el lenguaje hablado y escrito. Se beneficia de explicaciones, debates y lectura para procesar información.",
  Lógico: "Se enfoca en patrones, estructuras y razonamientos analíticos.",
  Kinestésico: "Prefiere actividades prácticas y el aprendizaje mediante movimiento.",
};

export const ROLE_GROUP_OPTIONS = [
  "Coordinador: Me gusta tomar la iniciativa y liderar",
  "Participante: Prefiero contribuir activamente y apoyar",
  "Observador: Soy más de observar y participar cuando se me indica",
  "Adaptativo: Me adapto a lo que el grupo necesite",
  "Prefiero aprender de manera individual.",
] as const;

export const FIRST_TIME_LEARNING_OPTIONS = ["Yes", "No"] as const;

export const PREVIOUS_EXPERIENCE_OPTIONS = [
  "online",
  "on-site classes",
  "self-taught",
  "online & on-site",
  "none",
] as const;

export const HOW_WHERE_CLASSES_OPTIONS = [
  "personalized",
  "group lessons",
  "n/a",
] as const;

export const LANGUAGE_OPTIONS = ["English", "French"] as const;

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
  { value: 3, label: "Paused" },
] as const;

export const initialEnrollmentState: EnrollmentFormData = {
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

