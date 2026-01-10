"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  formatDateForDisplay,
  extractDatePart,
} from "@/lib/dateUtils";
import { EnrollmentsBalanceCard } from "./components/EnrollmentsBalanceCard";
import { CanvaDocsSection } from "./components/CanvaDocsSection";
import { PenalizationsSection } from "@/components/penalizations/PenalizationsSection";
import { getInitials, convertImageToBase64, validateImageFile } from "./utils/studentHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Info,
  StickyNote,
  Hash,
  DollarSign,
  Upload,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- DEFINICIONES DE TIPOS ---
interface Note {
  _id?: string;
  date: string;
  text: string;
}

interface Student {
  _id: string;
  studentCode: string;
  name: string;
  dob: string;
  gender: string;
  kid: number; // 0 = estudiante normal, 1 = kid
  representativeName?: string | null;
  email: string;
  phone: string;
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

type StudentFormData = Omit<
  Student,
  | "_id"
  | "studentCode"
  | "createdAt"
  | "updatedAt"
  | "disenrollmentReason"
>;

interface StudentInfo {
  student: {
    id: string;
    name: string;
    email: string;
    studentCode: string;
  };
  totalAvailableBalance: number;
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
      minutesClassDefault: number;
      minutesViewed: number;
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
        minutesClassDefault: number;
        minutesViewed: number;
        availableMinutes: number;
        availableHours: string;
      }>;
    };
    rescheduleClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        classDate: string;
        classTime: string | null;
        reschedule: number;
      }>;
    };
    viewedClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        classDate: string;
        classTime: string | null;
      }>;
    };
    pendingClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        classDate: string;
        classTime: string | null;
      }>;
    };
    lostClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
        classDate: string;
        classTime: string | null;
        enrollmentEndDate: string;
      }>;
    };
    noShowClasses?: {
      total: number;
      details: Array<{
        classRegistryId: string;
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

interface EnrollmentDetail {
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

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params.id as string;

  // Detectar rol del usuario
  const userRole = user?.role?.toLowerCase();
  const isProfessor = userRole === "professor";
  const isStudent = userRole === "student";
  const isAdmin = userRole === "admin";

  const [student, setStudent] = useState<Student | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentDetail | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [studentAvatar, setStudentAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- OBTENCIÓN DE DATOS ---
  const fetchStudentInfo = useCallback(async (id: string) => {
    try {
      const infoResponse = await apiClient(`api/students/info/${id}`);
      const studentInfoData: StudentInfo = {
        student: infoResponse.student,
        totalAvailableBalance: infoResponse.totalAvailableBalance,
        enrollmentDetails: infoResponse.enrollmentDetails || [],
        rescheduleTime: infoResponse.rescheduleTime,
        rescheduleClasses: infoResponse.rescheduleClasses,
        viewedClasses: infoResponse.viewedClasses,
        pendingClasses: infoResponse.pendingClasses,
        lostClasses: infoResponse.lostClasses,
        noShowClasses: infoResponse.noShowClasses,
        classLostClasses: infoResponse.classLostClasses,
        enrollmentStatistics: infoResponse.enrollmentStatistics,
        incomeHistory: infoResponse.incomeHistory,
      };
      console.log("studentInfoData", studentInfoData);
      setStudentInfo(studentInfoData);
    } catch (infoErr) {
      console.warn("Could not fetch student info:", infoErr);
    }
  }, []);

  const fetchStudent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient(`api/students/${studentId}`);
      console.log("data", data);
      setStudent(data);
      setStudentAvatar(data.avatar || null);
      
      // Normalize form data
      setFormData({
        ...data,
        kid: data.kid ?? 0, // Asegurar que kid siempre sea 0 o 1, nunca null o undefined
        dob: data.dob ? extractDatePart(data.dob) : "",
        notes: data.notes?.map((note: Note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
        avatar: data.avatar || null,
      });

      // Fetch additional info for student or admin
      if (isStudent || isAdmin) {
        await fetchStudentInfo(studentId);
      }
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load student. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, isStudent, isAdmin, fetchStudentInfo]);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId, fetchStudent]);

  // --- MANEJADORES DE FORMULARIOS ---
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (
    name: keyof StudentFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNoteChange = (
    index: number,
    field: "date" | "text",
    value: string
  ) => {
    const newNotes = [...(formData.notes || [])];
    newNotes[index] = { ...newNotes[index], [field]: value };
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };

  const addNote = () => {
    const newNotes = [
      ...(formData.notes || []),
      { date: new Date().toISOString().split("T")[0], text: "" },
    ];
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };

  const removeNote = (index: number) => {
    const newNotes = (formData.notes || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };

  // --- MANEJADORES DE AVATAR ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setDialogError(validation.error || "Invalid image file.");
      return;
    }

    try {
      const base64 = await convertImageToBase64(file);
      setStudentAvatar(base64);
      setFormData((prev) => ({ ...prev, avatar: base64 }));
      setDialogError(null);
    } catch {
      setDialogError("Failed to process image. Please try again.");
    }
  };

  const handleRemoveAvatar = () => {
    setStudentAvatar(null);
    setFormData((prev) => ({ ...prev, avatar: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // --- ACCIONES DE LA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    try {
      // Enviar solo la fecha en formato YYYY-MM-DD (sin hora)
      const payload = {
        ...formData,
        kid: formData.kid ?? 0, // Asegurar que kid siempre sea 0 o 1
        dob: formData.dob || undefined,
        notes: formData.notes?.map((note) => ({
          ...note,
          date: note.date || undefined,
        })),
        avatar: formData.avatar || null,
      };

      const response = await apiClient(`api/students/${studentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // La respuesta puede venir como { student: {...} } o directamente como el objeto
      const updatedStudent = response.student || response;
      
      if (!updatedStudent || !updatedStudent._id) {
        throw new Error("Invalid response structure from server");
      }

      setStudent(updatedStudent);
      // Actualizar también el formData y el avatar con los datos actualizados
      if (updatedStudent.avatar) {
        setStudentAvatar(updatedStudent.avatar);
      } else {
        setStudentAvatar(null);
      }
      setFormData({
        ...updatedStudent,
        kid: updatedStudent.kid ?? 0, // Asegurar que kid siempre sea 0 o 1
        dob: updatedStudent.dob ? extractDatePart(updatedStudent.dob) : "",
        notes: updatedStudent.notes?.map((note: Note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
        avatar: updatedStudent.avatar || null,
      });
      setIsEditing(false);
      setDialogError(null);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields and try again."
          : errorInfo.isConflictError
          ? "A student with this information already exists."
          : "Failed to save student. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (student) {
      if (student.avatar) {
        setStudentAvatar(student.avatar);
      } else {
        setStudentAvatar(null);
      }
      setFormData({
        ...student,
        kid: student.kid ?? 0, // Asegurar que kid siempre sea 0 o 1
        dob: student.dob ? extractDatePart(student.dob) : "",
        notes: student.notes?.map((note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
        avatar: student.avatar || null,
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsEditing(false);
    setDialogError(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleViewEnrollment = async (enrollmentId: string) => {
    try {
      const enrollmentData = await apiClient(`api/enrollments/${enrollmentId}/detail`);
      if (enrollmentData.enrollments && enrollmentData.enrollments.length > 0) {
        setSelectedEnrollment(enrollmentData.enrollments[0]);
        setIsEnrollmentModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load enrollment details:", err);
    }
  };

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Student not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de volver y título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{student.name}</h1>
        </div>
      </div>

      {/* Renderizado condicional según rol */}
      {isProfessor ? (
        // Vista de Profesor: Sin tabs, toda la información en tarjetas separadas
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Full Name
                  </Label>
                  <p className="text-sm font-semibold">{student.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    Student Code
                  </Label>
                  <p className="text-sm font-semibold">
                    {student.studentCode}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date of Birth
                  </Label>
                  <p className="text-sm">
                    {student.dob
                      ? formatDateForDisplay(student.dob)
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Gender
                  </Label>
                  <p className="text-sm">{student.gender || "N/A"}</p>
                </div>
                {student.representativeName && (
                  <div className="space-y-2">
                    <Label className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Representative
                    </Label>
                    <p className="text-sm">
                      {student.representativeName}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Occupation
                  </Label>
                  <p className="text-sm">{student.occupation || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email
                  </Label>
                  <p className="text-sm">{student.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Phone
                  </Label>
                  <p className="text-sm">{student.phone}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Address
                  </Label>
                  <p className="text-sm">{student.address}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    City
                  </Label>
                  <p className="text-sm">{student.city}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Country
                  </Label>
                  <p className="text-sm">{student.country}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Status
                  </Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      student.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : student.status === 0
                        ? "bg-accent-1/20 text-accent-1"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {student.status === 1
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {student.notes && student.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {student.notes.map((note, index) => (
                    <div
                      key={note._id || index}
                      className="border p-4 rounded-md"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">
                            Date
                          </Label>
                          <p className="text-sm font-semibold">
                            {note.date
                              ? formatDateForDisplay(note.date)
                              : "N/A"}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm text-muted-foreground">
                            Note
                          </Label>
                          <p className="text-sm">{note.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Vista de Admin o Estudiante: Con tabs
        <Tabs 
          defaultValue={isStudent ? "profile" : "details"} 
          className="space-y-4"
        >
          <TabsList>
            {isStudent ? (
              <>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                <TabsTrigger value="canvaDocs">CanvaDocs</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="penalizations">Penalizations</TabsTrigger>
                )}
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="details">Student Details</TabsTrigger>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                <TabsTrigger value="canvaDocs">CanvaDocs</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="penalizations">Penalizations</TabsTrigger>
                )}
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </>
            )}
          </TabsList>

        {/* Tab: Profile (Estudiante) */}
        {isStudent && (
          <TabsContent value="profile">
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Name
                      </Label>
                      <p className="text-sm">{student.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Date of Birth
                      </Label>
                      <p className="text-sm">
                        {student.dob
                          ? formatDateForDisplay(student.dob)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Gender
                      </Label>
                      <p className="text-sm">{student.gender || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Occupation
                      </Label>
                      <p className="text-sm">{student.occupation || "N/A"}</p>
                    </div>
                    {student.representativeName && (
                      <div className="space-y-2">
                        <Label className="font-semibold flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Representative
                        </Label>
                        <p className="text-sm">{student.representativeName}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email
                      </Label>
                      <p className="text-sm">{student.email}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Phone
                      </Label>
                      <p className="text-sm">{student.phone}</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Address
                      </Label>
                      <p className="text-sm">
                        {student.address}, {student.city}, {student.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {student.disenrollmentReason && (
                      <div className="space-y-2">
                        <Label className="font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Disenrollment Reason
                        </Label>
                        <p className="text-sm">{student.disenrollmentReason}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Tab: Student Details (Admin) */}
        {!isStudent && (
          <TabsContent value="details">
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>

              {!isEditing ? (
                <>
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar Section - Left */}
                        <div className="flex-shrink-0">
                          <Avatar className="h-32 w-32">
                            {studentAvatar ? (
                              <AvatarImage src={studentAvatar} alt={student.name} />
                            ) : null}
                            <AvatarFallback className="text-2xl">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {/* Student Information - Right */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              Full Name
                            </Label>
                            <p className="text-sm font-semibold">{student.name}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold flex items-center gap-2">
                              <Hash className="h-4 w-4 text-primary" />
                              Student Code
                            </Label>
                            <p className="text-sm font-semibold">
                              {student.studentCode}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              Date of Birth
                            </Label>
                            <p className="text-sm">
                              {student.dob
                                ? formatDateForDisplay(student.dob)
                                : "N/A"}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              Gender
                            </Label>
                            <p className="text-sm">{student.gender || "N/A"}</p>
                          </div>
                          {student.representativeName && (
                            <div className="space-y-2">
                              <Label className="font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Representative
                              </Label>
                              <p className="text-sm">
                                {student.representativeName}
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="font-semibold flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" />
                              Occupation
                            </Label>
                            <p className="text-sm">{student.occupation || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            Email
                          </Label>
                          <p className="text-sm">{student.email}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            Phone
                          </Label>
                          <p className="text-sm">{student.phone}</p>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Address
                          </Label>
                          <p className="text-sm">{student.address}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            City
                          </Label>
                          <p className="text-sm">{student.city}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Country
                          </Label>
                          <p className="text-sm">{student.country}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        Additional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            Status
                          </Label>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              student.status === 1
                                ? "bg-secondary/20 text-secondary"
                                : student.status === 0
                                ? "bg-accent-1/20 text-accent-1"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {student.status === 1
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  {student.notes && student.notes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <StickyNote className="h-5 w-5 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {student.notes.map((note, index) => (
                            <div
                              key={note._id || index}
                              className="border p-4 rounded-md"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm text-muted-foreground">
                                    Date
                                  </Label>
                                  <p className="text-sm font-semibold">
                                    {note.date
                                      ? formatDateForDisplay(note.date)
                                      : "N/A"}
                                  </p>
                                </div>
                                <div className="md:col-span-2">
                                  <Label className="text-sm text-muted-foreground">
                                    Note
                                  </Label>
                                  <p className="text-sm">{note.text}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save
                    </Button>
                  </div>

                  {dialogError && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{dialogError}</span>
                    </div>
                  )}

                  {/* Avatar Section */}
                  <fieldset className="border p-4 rounded-md">
                    <legend className="px-1 text-sm">Avatar</legend>
                    <div className="flex items-center gap-6 mt-2">
                      <Avatar className="h-24 w-24">
                        {studentAvatar ? (
                          <AvatarImage src={studentAvatar} alt={formData.name || "Student"} />
                        ) : null}
                        <AvatarFallback className="text-lg">
                          {formData.name ? getInitials(formData.name) : "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Avatar
                          </Button>
                          {studentAvatar && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveAvatar}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Image files only, max 300KB
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border p-4 rounded-md">
                    <legend className="px-1 text-sm">Personal Info</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          name="name"
                          value={formData.name || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input
                          name="dob"
                          type="date"
                          max="9999-12-31"
                          value={formData.dob || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select
                          name="gender"
                          onValueChange={(v) => handleSelectChange("gender", v)}
                          value={formData.gender || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Representative</Label>
                        <Input
                          name="representativeName"
                          value={formData.representativeName || ""}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input
                          name="occupation"
                          value={formData.occupation || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          name="status"
                          onValueChange={(v) =>
                            handleSelectChange("status", parseInt(v))
                          }
                          value={formData.status?.toString() || "1"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="0">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="border p-4 rounded-md">
                    <legend className="px-1 text-sm">Contact & Address</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          name="phone"
                          type="tel"
                          value={formData.phone || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <Input
                          name="address"
                          value={formData.address || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          name="city"
                          value={formData.city || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          name="country"
                          value={formData.country || ""}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                  </fieldset>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notes</h3>
                    {(formData.notes || []).map((note, index) => (
                      <fieldset
                        key={note._id || index}
                        className="border p-4 rounded-md relative"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              max="9999-12-31"
                              value={note.date}
                              onChange={(e) =>
                                handleNoteChange(index, "date", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Note</Label>
                            <Textarea
                              value={note.text}
                              onChange={(e) =>
                                handleNoteChange(index, "text", e.target.value)
                              }
                              required
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 text-accent-1 hover:bg-accent-1/10"
                          onClick={() => removeNote(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </fieldset>
                    ))}
                    <Button type="button" variant="outline" onClick={addNote}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
        )}

        {/* Tab: Enrollments */}
        <TabsContent value="enrollments">
          <EnrollmentsBalanceCard
            totalBalance={studentInfo?.totalAvailableBalance ?? 0}
            enrollments={studentInfo?.enrollmentDetails ?? []}
            onViewEnrollment={handleViewEnrollment}
            isLoading={!studentInfo}
            studentId={studentId}
          />

          {/* Income History - Solo Admin y Estudiante */}
          {(isAdmin || isStudent) && studentInfo?.incomeHistory && studentInfo.incomeHistory.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Income History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {studentInfo.incomeHistory.map((incomeGroup, groupIndex) => (
                    <div key={incomeGroup.enrollment._id}>
                      <div className="mb-4 pb-2 border-b">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <Label className="font-semibold">
                            {incomeGroup.enrollment.planId.name}
                          </Label>
                          <span className="text-sm text-muted-foreground capitalize">
                            ({incomeGroup.enrollment.enrollmentType})
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateForDisplay(incomeGroup.enrollment.startDate)} - {formatDateForDisplay(incomeGroup.enrollment.endDate)}
                        </div>
                      </div>
                      {incomeGroup.incomes.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Deposit Name</TableHead>
                              <TableHead className="text-right">Amount (USD)</TableHead>
                              <TableHead>Currency</TableHead>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {incomeGroup.incomes.map((income) => (
                              <TableRow key={income._id}>
                                <TableCell>
                                  {formatDateForDisplay(income.income_date)}
                                </TableCell>
                                <TableCell>{income.deposit_name}</TableCell>
                                <TableCell className="text-right font-medium">
                                  ${income.amountInDollars.toFixed(2)}
                                </TableCell>
                                <TableCell>{income.idDivisa.name}</TableCell>
                                <TableCell>{income.idPaymentMethod.name}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {income.note || "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm py-4">
                          No income records for this enrollment.
                        </p>
                      )}
                      {groupIndex < (studentInfo.incomeHistory?.length ?? 0) - 1 && (
                        <div className="border-t my-6" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: CanvaDocs */}
        <TabsContent value="canvaDocs">
          <CanvaDocsSection studentId={studentId} />
        </TabsContent>

        {/* Tab: Penalizations (Admin only) */}
        {isAdmin && (
          <TabsContent value="penalizations">
            <PenalizationsSection
              entityId={studentId}
              entityType="student"
              entityName={student?.name}
            />
          </TabsContent>
        )}

        {/* Tab: Attendance */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Classes Attended</Label>
                  <p className="text-2xl font-bold text-secondary">
                    {studentInfo?.viewedClasses?.total ?? 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Classes Remaining</Label>
                  <p className="text-2xl font-bold">
                    {studentInfo?.pendingClasses?.total ?? 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Reschedule Hours Available</Label>
                  <p className="text-2xl font-bold">
                    {studentInfo?.rescheduleTime?.totalAvailableHours 
                      ? `${studentInfo.rescheduleTime.totalAvailableHours.toFixed(2)} hrs`
                      : "0 hrs"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Available Balance</Label>
                  <p className="text-2xl font-bold text-secondary">
                    {studentInfo 
                      ? `$${studentInfo.totalAvailableBalance.toFixed(2)}`
                      : "$0.00"}
                  </p>
                </div>
                {studentInfo?.rescheduleClasses && studentInfo.rescheduleClasses.total > 0 && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Classes in Reschedule</Label>
                    <p className="text-2xl font-bold">
                      {studentInfo.rescheduleClasses.total}
                    </p>
                  </div>
                )}
                {isAdmin && studentInfo?.lostClasses && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-red-600">Lost Classes</Label>
                    <p className="text-2xl font-bold text-red-600">
                      {studentInfo.lostClasses.total}
                    </p>
                  </div>
                )}
                {!isStudent && studentInfo?.noShowClasses && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-orange-600">No Show Classes</Label>
                    <p className="text-2xl font-bold text-orange-600">
                      {studentInfo.noShowClasses.total}
                    </p>
                  </div>
                )}
                {isAdmin && studentInfo?.classLostClasses && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-red-600">Class Lost (Auto)</Label>
                    <p className="text-2xl font-bold text-red-600">
                      {studentInfo.classLostClasses.total}
                    </p>
                  </div>
                )}
              </div>

              {/* Enrollment Statistics - Detailed Statistics by Enrollment */}
              {studentInfo?.enrollmentStatistics && studentInfo.enrollmentStatistics.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">Statistics by Enrollment</h3>
                  <div className="space-y-6">
                    {studentInfo.enrollmentStatistics.map((stat, index) => (
                      <Card key={stat.enrollmentId || index} className="bg-muted/30">
                        <CardHeader>
                          <CardTitle className="text-base">
                            {stat.enrollmentInfo.planName} ({stat.enrollmentInfo.enrollmentType})
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            {formatDateForDisplay(stat.enrollmentInfo.startDate)} - {formatDateForDisplay(stat.enrollmentInfo.endDate)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stat.rescheduleTime && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Reschedule Time</Label>
                                <p className="font-semibold">
                                  {stat.rescheduleTime.totalAvailableHours.toFixed(2)} hrs
                                </p>
                              </div>
                            )}
                            {stat.rescheduleClasses && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Reschedule Classes</Label>
                                <p className="font-semibold">{stat.rescheduleClasses.total}</p>
                              </div>
                            )}
                            {stat.viewedClasses && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Viewed Classes</Label>
                                <p className="font-semibold text-secondary">{stat.viewedClasses.total}</p>
                              </div>
                            )}
                            {stat.pendingClasses && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Pending Classes</Label>
                                <p className="font-semibold">{stat.pendingClasses.total}</p>
                              </div>
                            )}
                            {isAdmin && stat.lostClasses && stat.lostClasses.total > 0 && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground text-red-600">Lost Classes</Label>
                                <p className="font-semibold text-red-600">{stat.lostClasses.total}</p>
                              </div>
                            )}
                            {!isStudent && stat.noShowClasses && stat.noShowClasses.total > 0 && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground text-orange-600">No Show Classes</Label>
                                <p className="font-semibold text-orange-600">{stat.noShowClasses.total}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Notifications section - Coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Modal de Detalle de Enrollment */}
      <Dialog open={isEnrollmentModalOpen} onOpenChange={setIsEnrollmentModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Enrollment Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this enrollment
            </DialogDescription>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Plan Name</Label>
                  <p className="font-medium">{selectedEnrollment.planId.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Enrollment Type</Label>
                  <p className="font-medium capitalize">
                    {selectedEnrollment.enrollmentType}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Language</Label>
                  <p className="font-medium">{selectedEnrollment.language}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">
                    {selectedEnrollment.status === 1 ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {formatDateForDisplay(selectedEnrollment.startDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {formatDateForDisplay(selectedEnrollment.endDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Date</Label>
                  <p className="font-medium">
                    {formatDateForDisplay(selectedEnrollment.purchaseDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monthly Classes</Label>
                  <p className="font-medium">{selectedEnrollment.monthlyClasses}</p>
                </div>
                {selectedEnrollment.planId.weeklyClasses && (
                  <div>
                    <Label className="text-muted-foreground">Weekly Classes</Label>
                    <p className="font-medium">
                      {selectedEnrollment.planId.weeklyClasses}
                    </p>
                  </div>
                )}
                {selectedEnrollment.planId.weeks && (
                  <div>
                    <Label className="text-muted-foreground">Weeks</Label>
                    <p className="font-medium">{selectedEnrollment.planId.weeks}</p>
                  </div>
                )}
                {selectedEnrollment.scheduledDays && selectedEnrollment.scheduledDays.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Scheduled Days</Label>
                    <p className="font-medium">
                      {selectedEnrollment.scheduledDays.map((day) => day.day).join(", ")}
                    </p>
                  </div>
                )}
                {selectedEnrollment.alias && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Alias</Label>
                    <p className="font-medium">{selectedEnrollment.alias}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

