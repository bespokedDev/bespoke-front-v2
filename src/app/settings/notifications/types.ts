// Types for Notifications Management

export interface NotificationCategory {
  _id: string;
  category_notification_description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryNotificationsResponse {
  message: string;
  count: number;
  categoryNotifications: NotificationCategory[];
}

export interface NotificationPenalization {
  _id: string;
  name: string;
  description?: string | null;
}

export interface NotificationEnrollment {
  _id: string;
  alias?: string | null;
  language: string;
  enrollmentType: string;
}

export interface NotificationProfessor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface NotificationStudent {
  _id: string;
  name: string;
  studentCode: string;
  email: string;
  phone?: string;
}

export interface Notification {
  _id: string;
  idCategoryNotification: NotificationCategory;
  notification_description: string;
  idPenalization?: NotificationPenalization | null;
  idEnrollment?: NotificationEnrollment | null;
  idProfessor?: NotificationProfessor | null;
  idStudent?: NotificationStudent | NotificationStudent[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFormData {
  idCategoryNotification: string;
  notification_description: string;
  idPenalization?: string | null;
  idEnrollment?: string | null;
  idProfessor?: string | null;
  idStudent?: string | string[] | null;
  isActive?: boolean;
}

export interface NotificationsResponse {
  message?: string;
  count?: number;
  notifications: Notification[];
}

// API Response types for related entities
export interface PenalizationApiResponse {
  _id: string;
  name: string;
  description?: string | null;
  status: number; // 1 = activo
}

export interface EnrollmentApiResponse {
  _id: string;
  alias?: string | null;
  language: string;
  enrollmentType: string;
}

export interface ProfessorApiResponse {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface StudentApiResponse {
  _id: string;
  name: string;
  studentCode: string;
  email: string;
  phone?: string;
  status: number; // 1 = activo
}

// Payload types for create/update
export interface CreateNotificationPayload {
  idCategoryNotification: string;
  notification_description: string;
  isActive: boolean;
  idPenalization?: string | null;
  idEnrollment?: string | null;
  idProfessor?: string | null;
  idStudent?: string | string[] | null;
}

export interface UpdateNotificationPayload {
  idCategoryNotification: string;
  notification_description: string;
  isActive: boolean;
  idPenalization: string | null;
  idEnrollment: string | null;
  idProfessor: string | null;
  idStudent: string | string[] | null;
}

// Response types for create/update
export interface NotificationCreateResponse {
  message?: string;
  notification: Notification;
}

export interface NotificationUpdateResponse {
  message?: string;
  notification: Notification;
}

