// Tipos compartidos para los componentes de Student Detail

export interface Note {
  _id?: string;
  date: string;
  text: string;
}

export interface Student {
  _id: string;
  studentCode: string;
  name: string;
  dob: string;
  gender: string;
  kid: number; // 0 = estudiante normal, 1 = kid
  representativeName?: string | null;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  status: number;
  isActive: boolean;
  notes: Note[];
  avatar?: string | null;
  avatarPermission?: number;
  createdAt: string;
  updatedAt?: string;
  disenrollmentReason?: string | null;
  dislike?: string | null;
  strengths?: string | null;
  academicPerformance?: string | null;
  rutinePriorBespoke?: string | null;
  specialAssitance?: number | null;
  helpWithElectronicClassroom?: number | null;
}

export type StudentFormData = Omit<
  Student,
  | "_id"
  | "studentCode"
  | "createdAt"
  | "updatedAt"
  | "disenrollmentReason"
>;

export interface StudentInfo {
  student: {
    id: string;
    name: string;
    email: string;
    studentCode: string;
  };
  totalAvailableBalance: number;
  totalBalancePerClass: number;
  totalAmount: number;
  enrollmentDetails: Array<{
    enrollmentId: string;
    planName: string;
    amount: number;
    rescheduleHours: number;
    enrollmentType: string;
    startDate: string;
    endDate: string;
    status: number;
  }>;
  rescheduleTime?: {
    totalAvailableMinutes: number;
    totalAvailableHours: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
      originalClassDate: string | null;
      originalMinutesClassDefault: number;
      originalMinutesViewed: number;
      rescheduleMinutesViewed: number;
      availableMinutes: number;
      availableHours: string;
    }>;
  };
  rescheduleClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
      reschedule: number;
      classViewed: number;
    }>;
  };
  viewedClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  pendingClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  lostClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
      enrollmentEndDate: string;
    }>;
  };
  noShowClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  classLostClasses?: {
    total: number;
    details: Array<{
      classRegistryId: string;
      enrollmentId: string;
      classDate: string;
      classTime: string | null;
    }>;
  };
  enrollmentStatistics?: Array<{
    enrollmentId: string;
    enrollmentInfo: {
      planName: string;
      enrollmentType: string;
      startDate: string;
      endDate: string;
      status: number;
    };
    rescheduleTime?: {
      totalAvailableMinutes: number;
      totalAvailableHours: number;
      details: Array<{
        classRegistryId: string;
        classDate: string;
        classTime: string | null;
        originalClassDate: string | null;
        originalMinutesClassDefault: number;
        originalMinutesViewed: number;
        rescheduleMinutesViewed: number;
        availableMinutes: number;
        availableHours: string;
      }>;
    };
    rescheduleClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        enrollmentId: string;
        classDate: string;
        classTime: string | null;
        reschedule: number;
      }>;
    };
    viewedClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        enrollmentId: string;
        classDate: string;
        classTime: string | null;
      }>;
    };
    pendingClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        enrollmentId: string;
        classDate: string;
        classTime: string | null;
      }>;
    };
    lostClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        enrollmentId: string;
        classDate: string;
        classTime: string | null;
        enrollmentEndDate: string;
      }>;
    };
    noShowClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        enrollmentId: string;
        classDate: string;
        classTime: string | null;
      }>;
    };
  }>;
  incomeHistory?: Array<{
    enrollment: {
      _id: string;
      planId: {
        _id: string;
        name: string;
      };
      enrollmentType: string;
      purchaseDate: string;
      startDate: string;
      endDate: string;
    };
    incomes: Array<{
      _id: string;
      income_date: string;
      deposit_name: string;
      amount: number;
      amountInDollars: number;
      tasa: number;
      note: string | null;
      idDivisa: {
        _id: string;
        name: string;
      };
      idPaymentMethod: {
        _id: string;
        name: string;
        type: string;
      };
      idProfessor: {
        _id: string;
        name: string;
        ciNumber: string;
      } | null;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
}

export interface EnrollmentDetail {
  _id: string;
  planId: {
    _id: string;
    name: string;
    weeklyClasses?: number;
    weeks?: number;
    planType?: number;
  };
  enrollmentType: string;
  alias?: string | null;
  language: string;
  scheduledDays: Array<{ _id?: string; day: string }>;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  monthlyClasses: number;
  status: number;
  professorId?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  classCalculationType?: number;
}

