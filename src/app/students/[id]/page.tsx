"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  formatDateForDisplay,
  extractDatePart,
} from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Eye,
  BookOpen,
  Calendar,
  User,
} from "lucide-react";

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
  representativeName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  status: number;
  isActive: boolean;
  notes: Note[];
  createdAt: string;
  updatedAt?: string;
  disenrollmentReason?: string | null;
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

  // --- OBTENCIÓN DE DATOS ---
  const fetchStudent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient(`api/students/${studentId}`);
      setStudent(data);
      setFormData({
        ...data,
        dob: data.dob ? extractDatePart(data.dob) : "",
        notes: data.notes?.map((note: Note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
      });

      // Si es estudiante o admin, también obtener información de balance y enrollments
      // Admin: userRole !== "professor" && userRole !== "student"
      // Estudiante: userRole === "student"
      if (isStudent || (!isProfessor && userRole !== "student")) {
        try {
          const infoResponse = await apiClient(`api/students/info/${studentId}`);
          const studentInfoData: StudentInfo = {
            student: infoResponse.student,
            totalAvailableBalance: infoResponse.totalAvailableBalance,
            enrollmentDetails: infoResponse.enrollmentDetails || [],
            rescheduleTime: infoResponse.rescheduleTime,
            rescheduleClasses: infoResponse.rescheduleClasses,
            viewedClasses: infoResponse.viewedClasses,
            pendingClasses: infoResponse.pendingClasses,
            lostClasses: infoResponse.lostClasses, // Solo admin
            noShowClasses: infoResponse.noShowClasses, // Solo admin y professor
            incomeHistory: infoResponse.incomeHistory, // Solo student y admin
          };
          setStudentInfo(studentInfoData);
        } catch (infoErr) {
          console.warn("Could not fetch student info:", infoErr);
        }
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
  }, [studentId, isStudent, isProfessor, userRole]);

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

  // --- ACCIONES DE LA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    try {
      // Enviar solo la fecha en formato YYYY-MM-DD (sin hora)
      const payload = {
        ...formData,
        dob: formData.dob || undefined,
        notes: formData.notes?.map((note) => ({
          ...note,
          date: note.date || undefined,
        })),
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
      // Actualizar también el formData con los datos actualizados
      setFormData({
        ...updatedStudent,
        dob: updatedStudent.dob ? extractDatePart(updatedStudent.dob) : "",
        notes: updatedStudent.notes?.map((note: Note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
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
      setFormData({
        ...student,
        dob: student.dob ? extractDatePart(student.dob) : "",
        notes: student.notes?.map((note) => ({
          ...note,
          date: note.date ? extractDatePart(note.date) : "",
        })) || [],
      });
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
        // Vista de Profesor: Sin tabs, toda la información en una tarjeta
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Student Code</Label>
                  <p className="text-sm font-semibold">
                    {student.studentCode}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Full Name</Label>
                  <p className="text-sm font-semibold">{student.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Date of Birth</Label>
                  <p className="text-sm">
                    {student.dob
                      ? formatDateForDisplay(student.dob)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Gender</Label>
                  <p className="text-sm">{student.gender || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Representative</Label>
                  <p className="text-sm">
                    {student.representativeName || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Occupation</Label>
                  <p className="text-sm">{student.occupation || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Email</Label>
                  <p className="text-sm">{student.email}</p>
                </div>
                <div>
                  <Label className="font-semibold">Phone</Label>
                  <p className="text-sm">{student.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold">Address</Label>
                  <p className="text-sm">{student.address}</p>
                </div>
                <div>
                  <Label className="font-semibold">City</Label>
                  <p className="text-sm">{student.city}</p>
                </div>
                <div>
                  <Label className="font-semibold">Country</Label>
                  <p className="text-sm">{student.country}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
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

              {student.notes && student.notes.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium">Notes</h3>
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
              )}
            </div>
          </CardContent>
        </Card>
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
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="details">Student Details</TabsTrigger>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </>
            )}
          </TabsList>

        {/* Tab: Profile (Estudiante) */}
        {isStudent && (
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-semibold">Name</Label>
                      <p className="text-sm">{student.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Email</Label>
                      <p className="text-sm">{student.email}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Phone</Label>
                      <p className="text-sm">{student.phone}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Date of Birth</Label>
                      <p className="text-sm">
                        {student.dob
                          ? formatDateForDisplay(student.dob)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Gender</Label>
                      <p className="text-sm">{student.gender || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Occupation</Label>
                      <p className="text-sm">{student.occupation || "N/A"}</p>
                    </div>
                    {student.representativeName && (
                      <div className="space-y-2">
                        <Label className="font-semibold">Representative</Label>
                        <p className="text-sm">{student.representativeName}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="font-semibold">Address</Label>
                      <p className="text-sm">
                        {student.address}, {student.city}, {student.country}
                      </p>
                    </div>
                    {student.disenrollmentReason && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="font-semibold">Disenrollment Reason</Label>
                        <p className="text-sm">{student.disenrollmentReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Student Details (Admin) */}
        {!isStudent && (
          <TabsContent value="details">
          <Card>
            <CardContent>
              {!isEditing ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <Label className="font-semibold">Student Code</Label>
                      <p className="text-sm font-semibold">
                        {student.studentCode}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Full Name</Label>
                      <p className="text-sm font-semibold">{student.name}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Date of Birth</Label>
                      <p className="text-sm">
                        {student.dob
                          ? formatDateForDisplay(student.dob)
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Gender</Label>
                      <p className="text-sm">{student.gender || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Representative</Label>
                      <p className="text-sm">
                        {student.representativeName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Occupation</Label>
                      <p className="text-sm">{student.occupation || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Email</Label>
                      <p className="text-sm">{student.email}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Phone</Label>
                      <p className="text-sm">{student.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="font-semibold">Address</Label>
                      <p className="text-sm">{student.address}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">City</Label>
                      <p className="text-sm">{student.city}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Country</Label>
                      <p className="text-sm">{student.country}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Status</Label>
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

                  {student.notes && student.notes.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-lg font-medium">Notes</h3>
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
                  )}
                </div>
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
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Tab: Enrollments */}
        <TabsContent value="enrollments">
          {isStudent ? (
            // Vista de Estudiante: Balance + Enrollments activos
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Enrollments & Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Balance Total */}
                {studentInfo && (
                  <div className="bg-secondary/10 p-4 rounded-lg">
                    <Label className="text-sm text-muted-foreground">
                      Total Available Balance
                    </Label>
                    <p className="text-3xl font-bold text-secondary">
                      ${studentInfo.totalAvailableBalance.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Lista de Enrollments */}
                {studentInfo && studentInfo.enrollmentDetails.length > 0 ? (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Active Enrollments</Label>
                    {studentInfo.enrollmentDetails.map((enrollment) => (
                      <Card key={enrollment.enrollmentId}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <Label className="font-semibold">
                                  {enrollment.planName}
                                </Label>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {formatDateForDisplay(enrollment.startDate)} -{" "}
                                    {formatDateForDisplay(enrollment.endDate)}
                                  </span>
                                </div>
                                <div>
                                  <span className="capitalize">
                                    {enrollment.enrollmentType}
                                  </span>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">
                                    Available Balance
                                  </Label>
                                  <p className="font-semibold text-secondary">
                                    ${enrollment.amount.toFixed(2)}
                                  </p>
                                </div>
                                {enrollment.rescheduleHours > 0 && (
                                  <div>
                                    <Label className="text-muted-foreground">
                                      Reschedule Hours
                                    </Label>
                                    <p>{enrollment.rescheduleHours} hours</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEnrollment(enrollment.enrollmentId)}
                              className="ml-4"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No active enrollments found.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            // Vista de Admin: Balance + Enrollments activos
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Enrollments & Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Balance Total */}
                {studentInfo && (
                  <div className="bg-secondary/10 p-4 rounded-lg">
                    <Label className="text-sm text-muted-foreground">
                      Total Available Balance
                    </Label>
                    <p className="text-3xl font-bold text-secondary">
                      ${studentInfo.totalAvailableBalance.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Lista de Enrollments */}
                {studentInfo && studentInfo.enrollmentDetails.length > 0 ? (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Active Enrollments</Label>
                    {studentInfo.enrollmentDetails.map((enrollment) => (
                      <Card key={enrollment.enrollmentId}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <Label className="font-semibold">
                                  {enrollment.planName}
                                </Label>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {formatDateForDisplay(enrollment.startDate)} -{" "}
                                    {formatDateForDisplay(enrollment.endDate)}
                                  </span>
                                </div>
                                <div>
                                  <span className="capitalize">
                                    {enrollment.enrollmentType}
                                  </span>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">
                                    Available Balance
                                  </Label>
                                  <p className="font-semibold text-secondary">
                                    ${enrollment.amount.toFixed(2)}
                                  </p>
                                </div>
                                {enrollment.rescheduleHours > 0 && (
                                  <div>
                                    <Label className="text-muted-foreground">
                                      Reschedule Hours
                                    </Label>
                                    <p>{enrollment.rescheduleHours} hours</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEnrollment(enrollment.enrollmentId)}
                              className="ml-4"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {studentInfo 
                      ? "No active enrollments found."
                      : "Loading enrollment information..."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
                {!isStudent && studentInfo?.lostClasses && (
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
              </div>
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

