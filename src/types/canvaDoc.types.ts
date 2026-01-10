export interface StudentBrief {
  _id: string;
  name: string;
  studentCode: string;
  email: string;
  phone?: string;
}

export interface CanvaDoc {
  _id: string;
  description: string;
  studentId: StudentBrief | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CanvaDocFormData {
  description: string;
  studentId: string;
  isActive?: boolean;
}

export interface CanvaDocsResponse {
  message: string;
  canvaDocs?: CanvaDoc[];
  canvaDoc?: CanvaDoc;
  count?: number;
}

