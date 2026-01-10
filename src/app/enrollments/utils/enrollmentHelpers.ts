import type {
  Enrollment,
  StudentEnrollmentFormData,
  EnrollmentFormData,
  StudentEnrollmentInfo,
  StudentBrief,
} from "../types/enrollment.types";
import { extractDatePart, getCurrentDateString } from "@/lib/dateUtils";

// Tipo para los elementos del array studentIds que puede ser StudentEnrollmentInfo o StudentBrief
type StudentIdElement = StudentEnrollmentInfo | StudentBrief;

// Helper para verificar si un elemento es StudentEnrollmentInfo
const isStudentEnrollmentInfo = (element: StudentIdElement): element is StudentEnrollmentInfo => {
  return 'studentId' in element;
};

// Tipo para el payload que se envía al backend al crear/actualizar un enrollment
type StudentEnrollmentPayload = {
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
  experiencePastClass?: string;
  howWhereTheClasses?: string;
  roleGroup?: string;
  willingHomework?: number;
};

/**
 * Transforma un enrollment del backend a EnrollmentFormData para el formulario
 */
export function transformEnrollmentToFormData(
  enrollment: Enrollment
): EnrollmentFormData {
  const scheduledDaysArray =
    enrollment.scheduledDays?.map((d) => d.day) || [];

  // Transformar studentIds: puede venir como StudentEnrollmentInfo[] o StudentBrief[]
  const studentIdsArray = enrollment.studentIds.map((s: StudentIdElement) => {
    // Extraer el ID del estudiante: puede ser string directo o objeto con _id
    let studentIdValue: string;
    
    // Si es StudentEnrollmentInfo (tiene la propiedad studentId)
    if ('studentId' in s) {
      if (typeof s.studentId === "object" && s.studentId !== null && "_id" in s.studentId) {
        // Si studentId es un objeto (StudentBrief), tomar su _id
        studentIdValue = s.studentId._id;
      } else if (typeof s.studentId === "string") {
        // Si studentId es un string
        studentIdValue = s.studentId;
      } else {
        // Fallback: usar _id del objeto si existe
        studentIdValue = s._id || "";
      }
    } else {
      // Si es StudentBrief directamente, usar su _id
      studentIdValue = s._id || "";
    }

    // Si es StudentEnrollmentInfo, extraer todos los campos; si es StudentBrief, usar valores por defecto
    if (isStudentEnrollmentInfo(s)) {
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
        willingHomework:
          s.willingHomework !== undefined && s.willingHomework !== null
            ? s.willingHomework
            : undefined,
      };
    } else {
      // Si es StudentBrief, crear un objeto con valores por defecto
      return {
        studentId: studentIdValue,
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
      };
    }
  });

  return {
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
  };
}

/**
 * Helper para actualizar un campo específico de un estudiante en el formData
 */
export function updateStudentField(
  studentIds: StudentEnrollmentFormData[],
  index: number,
  field: keyof StudentEnrollmentFormData,
  value: string | number | undefined
): StudentEnrollmentFormData[] {
  const updated = [...studentIds];
  updated[index] = {
    ...updated[index],
    [field]: value,
  };
  return updated;
}

/**
 * Helper para actualizar campos de array separados por comas (learningType, roleGroup)
 */
export function updateStudentArrayField(
  studentIds: StudentEnrollmentFormData[],
  index: number,
  field: "learningType" | "roleGroup",
  value: string,
  checked: boolean
): StudentEnrollmentFormData[] {
  const updated = [...studentIds];
  const currentField = studentIds[index][field] || "";
  const currentArray = currentField
    ? currentField.split(",").map((item: string) => item.trim())
    : [];

  let newArray: string[];
  if (checked) {
    if (!currentArray.includes(value)) {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray;
    }
  } else {
    newArray = currentArray.filter((item: string) => item !== value);
  }

  updated[index] = {
    ...updated[index],
    [field]: newArray.join(", "),
  };

  return updated;
}

/**
 * Transforma studentIds del formulario al formato esperado por el backend
 */
export function transformStudentIdsForPayload(
  studentIds: StudentEnrollmentFormData[]
): StudentEnrollmentPayload[] {
  return studentIds.map((student) => {
    const payload: StudentEnrollmentPayload = {
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
    if (student.roleGroup?.trim()) payload.roleGroup = student.roleGroup.trim();
    if (student.willingHomework !== undefined && student.willingHomework !== null)
      payload.willingHomework = student.willingHomework;
    return payload;
  });
}

/**
 * Calcula el precio por estudiante y el tipo de enrollment basado en la cantidad de estudiantes
 */
export function calculatePricing(
  studentCount: number,
  planPricing: { single: number; couple: number; group: number }
): {
  pricePerStudent: number;
  enrollmentType: "single" | "couple" | "group";
  totalAmount: number;
} {
  let pricePerStudent = 0;
  let enrollmentType: "single" | "couple" | "group" = "group";

  if (studentCount === 1) {
    pricePerStudent = planPricing.single;
    enrollmentType = "single";
  } else if (studentCount === 2) {
    pricePerStudent = planPricing.couple;
    enrollmentType = "couple";
  } else if (studentCount > 2) {
    pricePerStudent = planPricing.group;
    enrollmentType = "group";
  }

  const totalAmount = pricePerStudent * studentCount;

  return { pricePerStudent, enrollmentType, totalAmount };
}

