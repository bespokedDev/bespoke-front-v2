export interface Enrollment {
  _id: string;
  planId: {
    _id: string;
    name: string;
  };
  studentIds: Array<{
    _id: string;
    studentId: {
      _id: string;
      studentCode: string;
      name: string;
      email: string;
      dob?: string; // Fecha de nacimiento
      avatar?: string | null; // Imagen/foto del estudiante (base64)
      representativeName?: string | null; // Nombre del representante
      createdAt?: string; // Fecha de creación del estudiante
      enrollmentDate?: string; // Fecha de inscripción
      avatarPermission?: boolean | null; // Autorización de imagen a redes sociales
    };
    languageLevel?: string; // Nivel de idioma
    learningType?: string; // Estilo de aprendizaje (puede ser string separado por comas)
    willingHomework?: number; // Si quiere tarea (0 o 1)
  }>;
  enrollmentType: string;
  alias?: string | null;
  language: string;
  scheduledDays?: Array<{
    _id?: string;
    day: string;
  }>; // Días de clase programados
  startDate: string;
  endDate: string;
  status: number;
}

export interface ContentClass {
  _id: string;
  name: string;
  status: number;
}

export interface ClassType {
  _id: string;
  name: string;
  status: number;
}

export interface ClassObjective {
  _id: string;
  enrollmentId: {
    _id: string;
    alias?: string;
    language: string;
    enrollmentType: string;
  };
  category: {
    _id: string;
    name: string;
  };
  teachersNote?: string | null;
  objective: string;
  objectiveDate: string;
  objectiveAchieved: boolean;
  isActive: boolean;
}

export interface ClassRegistry {
  _id: string;
  enrollmentId: {
    _id: string;
    alias?: string;
    language: string;
    enrollmentType: string;
  };
  classDate: string;
  hoursViewed?: number | null;
  minutesViewed?: number | null;
  classType: Array<{
    _id: string;
    name: string;
  }>;
  contentType: Array<{
    _id: string;
    name: string;
  }>;
  vocabularyContent?: string | null;
  studentMood?: string | null;
  note?: {
    content: string | null;
    visible: {
      admin: number;
      student: number;
      professor: number;
    };
  } | null;
  homework?: string | null;
  token?: string | null;
  reschedule: number;
  classViewed: number;
  minutesClassDefault: number;
  originalClassId?: string | null;
  evaluations?: Evaluation[];
}

export interface Evaluation {
  _id: string;
  classRegistryId: string | {
    _id: string;
    classDate: string;
    enrollmentId?: string;
  };
  fecha: string; // DD/MM/YYYY
  temasEvaluados?: string | null;
  skillEvaluada?: string | null;
  linkMaterial?: string | null;
  capturePrueba?: string | null; // base64
  puntuacion?: string | null;
  comentario?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationWithClassDate extends Evaluation {
  classDate: string; // Fecha de la clase asociada
}

