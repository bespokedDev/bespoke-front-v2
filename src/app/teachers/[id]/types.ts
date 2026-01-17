// Tipos compartidos para los componentes de Teacher Detail

export interface PaymentData {
  _id?: string;
  bankName: string;
  accountType?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  holderCI?: string | null;
  holderEmail?: string | null;
  holderAddress?: string | null;
  routingNumber?: string | null;
}

export interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
}

export interface Professor {
  _id: string;
  name: string;
  ciNumber: string;
  dob: string;
  address: string;
  email: string;
  phone: string;
  password?: string | null;
  occupation: string;
  startDate: string;
  typeId?: string | { _id: string; name: string; rates?: { single: number; couple: number; group: number } };
  emergencyContact: EmergencyContact;
  paymentData: PaymentData[];
  isActive: boolean;
}

export type ProfessorFormData = Omit<Professor, "_id" | "isActive">;

export interface ProfessorType {
  _id: string;
  name: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  status: number;
  statusText?: string;
  createdAt?: string;
  updatedAt?: string;
}

