import type { EnrollmentFormData, StudentEnrollmentFormData } from "../types/enrollment.types";
import type { Plan, StudentBrief } from "../types/enrollment.types";

/**
 * Valida los campos obligatorios de un estudiante
 * Retorna el mensaje de error o null si todo está bien
 */
export function validateStudentFields(
  student: StudentEnrollmentFormData,
  index: number,
  students: StudentBrief[]
): string | null {
  const studentName =
    students.find((s) => s._id === student.studentId)?.name ||
    `Student ${index + 1}`;

  if (!student.goals?.trim()) {
    return `${studentName}: Main goal is required.`;
  }

  if (!student.preferences?.trim()) {
    return `${studentName}: Preferences is required.`;
  }

  if (!student.learningType?.trim()) {
    return `${studentName}: At least one learning type must be selected.`;
  }

  if (!student.firstTimeLearningLanguage?.trim()) {
    return `${studentName}: First time learning a language is required.`;
  }

  if (!student.previousExperience?.trim()) {
    return `${studentName}: Previous experience is required.`;
  }

  if (!student.experiencePastClass?.trim()) {
    return `${studentName}: How was that experience is required.`;
  }

  if (!student.howWhereTheClasses?.trim()) {
    return `${studentName}: How were the classes is required.`;
  }

  if (!student.roleGroup?.trim()) {
    return `${studentName}: Role in a group is required.`;
  }

  if (!student.dailyLearningTime?.trim()) {
    return `${studentName}: ATP (per day) is required.`;
  }

  if (!student.learningDifficulties?.trim()) {
    return `${studentName}: Learning difficulties is required.`;
  }

  return null;
}

/**
 * Valida todos los campos obligatorios del formulario de enrollment
 * Retorna el mensaje de error o null si todo está bien
 */
export function validateEnrollmentForm(
  formData: EnrollmentFormData,
  students: StudentBrief[],
  plans: Plan[]
): string | null {
  // Validar plan
  if (!formData.planId) {
    return "Plan is required.";
  }

  // Validar estudiantes
  if (!formData.studentIds || formData.studentIds.length === 0) {
    return "At least one student is required.";
  }

  // Validar campos de cada estudiante
  for (let i = 0; i < formData.studentIds.length; i++) {
    const error = validateStudentFields(formData.studentIds[i], i, students);
    if (error) {
      return error;
    }
  }

  // Validar profesor
  if (!formData.professorId) {
    return "Professor is required.";
  }

  // Validar días programados
  if (!formData.scheduledDays || formData.scheduledDays.length === 0) {
    return "At least one scheduled day is required.";
  }

  // Validar que la cantidad de días coincida con weeklyClasses del plan
  const selectedPlan = plans.find((p) => p._id === formData.planId);
  if (
    selectedPlan &&
    formData.scheduledDays.length !== selectedPlan.weeklyClasses
  ) {
    return `The selected plan requires ${selectedPlan.weeklyClasses} classes per week. Please select exactly ${selectedPlan.weeklyClasses} days.`;
  }

  // Validar fecha de inicio
  if (!formData.startDate) {
    return "Start date is required.";
  }

  // Validar idioma
  if (!formData.language) {
    return "Language is required.";
  }

  // Validar lateFee
  if (
    formData.lateFee === undefined ||
    formData.lateFee === null ||
    formData.lateFee < 0
  ) {
    return "Late fee is required and must be a non-negative number.";
  }

  return null;
}

