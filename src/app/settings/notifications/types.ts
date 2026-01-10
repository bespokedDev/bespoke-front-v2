// Types for Notifications Management

export interface NotificationCategory {
  _id: string;
  category_notification_description: string;
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

