"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { PenalizationsSection } from "@/components/penalizations/PenalizationsSection";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  AlertCircle,
  Plus,
  BookOpen,
  User,
  Ban,
  CheckCircle2,
  X,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GeneralInformationSection } from "./components/GeneralInformationSection";
import { ContactInformationSection } from "./components/ContactInformationSection";
import { PaymentInformationSection } from "./components/PaymentInformationSection";

// --- DEFINICIONES DE TIPOS ---
import type {
  PaymentData,
  EmergencyContact,
  Professor,
  ProfessorFormData,
  ProfessorType as ProfessorTypeInterface,
} from "./types";

// Re-exportar para compatibilidad con el código existente
type ProfessorType = ProfessorTypeInterface;

interface Enrollment {
  _id: string;
  planId: {
    name: string;
  };
  studentIds: Array<{
    _id: string;
    studentId: {
      _id: string;
      studentCode: string;
      name: string;
      email: string;
    };
  }>;
  enrollmentType: string;
  alias?: string | null;
  language: string;
  startDate: string;
  endDate: string;
  status: number;
}

interface ProfessorEnrollmentsResponse {
  message: string;
  professor: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: Enrollment[];
  total: number;
}

interface Bonus {
  _id: string;
  professorId: {
    _id: string;
    name: string;
    ciNumber: string;
    email: string;
  };
  amount: number;
  description?: string;
  bonusDate: string;
  month: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  status: number; // 1 = activo, 2 = anulado
  createdAt: string;
  updatedAt: string;
}

interface BonusesResponse {
  message: string;
  bonuses: Bonus[];
  total: number;
}

interface CreateBonusData {
  professorId: string;
  amount: number;
  description?: string;
  bonusDate?: string;
  month?: string;
}

interface UpdateBonusData {
  amount?: number;
  description?: string;
  bonusDate?: string;
  month?: string;
  status?: number;
}


export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const teacherId = params.id as string;
  
  // Verificar si el usuario es admin
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === "admin";

  const [teacher, setTeacher] = useState<Professor | null>(null);
  const [professorTypes, setProfessorTypes] = useState<ProfessorType[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollmentsLoading, setIsEnrollmentsLoading] = useState(false);
  const [isBonusesLoading, setIsBonusesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfessorFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  
  // Estados para bonos
  const [bonusDialog, setBonusDialog] = useState<
    "create" | "edit" | "view" | "delete" | null
  >(null);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);
  const [bonusFormData, setBonusFormData] = useState<CreateBonusData>({
    professorId: "",
    amount: 0,
    description: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
  });
  const [isBonusSubmitting, setIsBonusSubmitting] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [bonusSuccessMessage, setBonusSuccessMessage] = useState<string | null>(
    null
  );

  // --- OBTENCIÓN DE DATOS ---
  const fetchTeacher = useCallback(async () => {
    // Validar que teacherId sea válido antes de hacer la llamada
    if (!teacherId || typeof teacherId !== 'string' || teacherId.trim() === '') {
      setError("Invalid teacher ID");
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient(`api/professors/${teacherId}`);
      setTeacher(data);
      setFormData({
        ...data,
        dob: data.dob ? extractDatePart(data.dob) : "",
        startDate: data.startDate ? extractDatePart(data.startDate) : "",
        typeId: typeof data.typeId === 'object' && data.typeId?._id ? data.typeId._id : data.typeId || "",
      });
    } catch (err: unknown) {
      // Solo actualizar el estado si el error no es 404 (Not Found) durante navegación
      const errorInfo = handleApiError(err);
      if (errorInfo.statusCode !== 404) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load teacher. Please try again."
      );
      setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  const fetchProfessorTypes = useCallback(async () => {
    try {
      const data = await apiClient("api/professor-types");
      setProfessorTypes(data || []);
    } catch (err: unknown) {
      console.error("Error fetching professor types:", err);
      // No mostramos error al usuario ya que este campo es opcional
    }
  }, []);

  useEffect(() => {
    if (teacherId && typeof teacherId === 'string' && teacherId.trim() !== '') {
      fetchTeacher();
      fetchProfessorTypes();
      // Initialize bonus form data when teacherId is available
      setBonusFormData((prev) => {
        if (!prev.professorId || prev.professorId !== teacherId) {
          return { ...prev, professorId: teacherId };
        }
        return prev;
      });
    }
  }, [teacherId, fetchTeacher, fetchProfessorTypes]);

  // --- OBTENCIÓN DE ENROLLMENTS ---
  const fetchEnrollments = useCallback(async () => {
    try {
      setIsEnrollmentsLoading(true);
      const response: ProfessorEnrollmentsResponse = await apiClient(
        `api/professors/${teacherId}/enrollments`
      );
      console.log("response enrollments", response);
      setEnrollments(response.enrollments || []);
    } catch (err: unknown) {
      console.error("Failed to load enrollments:", err);
      setEnrollments([]);
    } finally {
      setIsEnrollmentsLoading(false);
    }
  }, [teacherId]);

  // --- OBTENCIÓN DE BONOS ---
  const fetchBonuses = useCallback(async () => {
    try {
      setIsBonusesLoading(true);
      const response: BonusesResponse = await apiClient(
        `api/professor-bonuses/professor/${teacherId}`
      );
      setBonuses(response.bonuses || []);
    } catch (err: unknown) {
      console.error("Failed to load bonuses:", err);
      setBonuses([]);
    } finally {
      setIsBonusesLoading(false);
    }
  }, [teacherId]);

  // --- MANEJO DE BONOS ---
  const handleOpenBonusDialog = (
    type: "create" | "edit" | "view" | "delete",
    bonus?: Bonus
  ) => {
    setBonusDialog(type);
    setSelectedBonus(bonus || null);
    setBonusError(null);
    if (type === "create") {
      setBonusFormData({
        professorId: teacherId,
        amount: 0,
        description: "",
        month: new Date().toISOString().slice(0, 7),
      });
    } else if (bonus && type === "edit") {
      setBonusFormData({
        professorId: teacherId,
        amount: bonus.amount,
        description: bonus.description || "",
        month: bonus.month || new Date().toISOString().slice(0, 7),
      });
    }
  };

  const handleCloseBonusDialog = () => {
    setBonusDialog(null);
    setSelectedBonus(null);
    setBonusError(null);
    setBonusFormData({
      professorId: teacherId,
      amount: 0,
      description: "",
      month: new Date().toISOString().slice(0, 7),
    });
  };

  const handleCreateBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBonusSubmitting(true);
    setBonusError(null);

    try {
      const payload: CreateBonusData = {
        professorId: teacherId,
        amount: bonusFormData.amount,
        description: bonusFormData.description || undefined,
        bonusDate: new Date().toISOString(), // Always use current date
        month: bonusFormData.month || undefined,
      };

      await apiClient("api/professor-bonuses", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setBonusSuccessMessage("Bonus created successfully");
      handleCloseBonusDialog();
      fetchBonuses();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setBonusSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : "Failed to create bonus. Please try again."
      );
      setBonusError(errorMessage);
    } finally {
      setIsBonusSubmitting(false);
    }
  };

  const handleUpdateBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBonus) return;

    setIsBonusSubmitting(true);
    setBonusError(null);

    try {
      const payload: UpdateBonusData = {
        amount: bonusFormData.amount,
        description: bonusFormData.description || undefined,
        bonusDate: new Date().toISOString(), // Always use current date
        month: bonusFormData.month || undefined,
      };

      await apiClient(`api/professor-bonuses/${selectedBonus._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setBonusSuccessMessage("Bonus updated successfully");
      handleCloseBonusDialog();
      fetchBonuses();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setBonusSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isValidationError
          ? "Please check all required fields"
          : "Failed to update bonus. Please try again."
      );
      setBonusError(errorMessage);
    } finally {
      setIsBonusSubmitting(false);
    }
  };

  const handleDeleteBonus = async () => {
    if (!selectedBonus) return;

    setIsBonusSubmitting(true);
    setBonusError(null);

    try {
      await apiClient(`api/professor-bonuses/${selectedBonus._id}`, {
        method: "DELETE",
      });

      setBonusSuccessMessage("Bonus deactivated successfully");
      handleCloseBonusDialog();
      fetchBonuses();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setBonusSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to deactivate bonus. Please try again."
      );
      setBonusError(errorMessage);
    } finally {
      setIsBonusSubmitting(false);
    }
  };

  // --- MANEJADORES DE FORMULARIOS ---
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    parentKey: keyof ProfessorFormData,
    childKey: keyof EmergencyContact
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] as EmergencyContact),
        [childKey]: value,
      },
    }));
  };

  const handlePaymentDataChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof PaymentData
  ) => {
    const { value } = e.target;
    const updatedPaymentData = [...(formData.paymentData || [])];
    updatedPaymentData[index] = {
      ...updatedPaymentData[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, paymentData: updatedPaymentData }));
  };

  const addPaymentMethod = () => {
    const newPaymentData = [...(formData.paymentData || []), { bankName: "" }];
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };

  const removePaymentMethod = (index: number) => {
    const newPaymentData = (formData.paymentData || []).filter(
      (_, i) => i !== index
    );
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };

  // --- ACCIONES DE LA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    const payload = { ...formData };
    if (!payload.startDate) {
      delete payload.startDate;
    }
    if (typeof payload.typeId === 'object') {
      // Si typeId es un objeto, solo enviamos el _id
      payload.typeId = payload.typeId._id;
    }
    if (
      payload.emergencyContact &&
      !payload.emergencyContact.name &&
      !payload.emergencyContact.phone
    ) {
      delete payload.emergencyContact;
    }
    try {
      const response = await apiClient(`api/professors/${teacherId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const updatedTeacher = response;
      setTeacher(updatedTeacher);
      setFormData({
        ...updatedTeacher,
        dob: updatedTeacher.dob ? extractDatePart(updatedTeacher.dob) : "",
        startDate: updatedTeacher.startDate
          ? extractDatePart(updatedTeacher.startDate)
          : "",
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
          ? "A teacher with this information already exists."
          : "Failed to save teacher. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (teacher) {
      setFormData({
        ...teacher,
        dob: teacher.dob ? extractDatePart(teacher.dob) : "",
        startDate: teacher.startDate ? extractDatePart(teacher.startDate) : "",
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

  if (error || !teacher) {
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
          <span>{error || "Teacher not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de volver y título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{teacher.name}</h1>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <Tabs defaultValue="information" className="space-y-4">
        <TabsList>
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="enrollments" onClick={fetchEnrollments}>
            Enrollments
          </TabsTrigger>
          <TabsTrigger value="bonuses" onClick={fetchBonuses}>
            Bonuses
          </TabsTrigger>
          <TabsTrigger value="penalizations">Penalizations</TabsTrigger>
        </TabsList>

        <TabsContent value="information">
      {!isEditing ? (
        <div className="space-y-6">
          <GeneralInformationSection
            data={teacher}
            isEditing={false}
            professorTypes={professorTypes}
            isAdmin={isAdmin}
          />
          <ContactInformationSection
            data={teacher}
            isEditing={false}
          />
          <PaymentInformationSection
            data={teacher}
            isEditing={false}
          />
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

          <GeneralInformationSection
            data={formData}
            isEditing={true}
            professorTypes={professorTypes}
            isAdmin={isAdmin}
            onFormChange={handleFormChange}
            typeSelectComponent={
              <ProfessorTypeSelect
                items={professorTypes}
                selectedId={typeof formData.typeId === 'string' ? formData.typeId : (typeof formData.typeId === 'object' && formData.typeId?._id ? formData.typeId._id : "") || ""}
                onSelectedChange={(id: string) =>
                  setFormData((prev) => ({ ...prev, typeId: id }))
                }
                placeholder="Select professor type..."
                required
              />
            }
          />
          <ContactInformationSection
            data={formData}
            isEditing={true}
            onFormChange={handleFormChange}
            onNestedChange={handleNestedChange}
          />
          <PaymentInformationSection
            data={formData}
            isEditing={true}
            onPaymentDataChange={handlePaymentDataChange}
            onAddPaymentMethod={addPaymentMethod}
            onRemovePaymentMethod={removePaymentMethod}
          />
        </form>
      )}
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {isEnrollmentsLoading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : enrollments.length > 0 ? (
                <div className="space-y-6">
                  {enrollments.map((enrollment, index) => (
                    <div key={enrollment._id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          {/* Nombres de estudiantes - Más prominente */}
                          <div>
                            <Label className="text-sm text-muted-foreground font-semibold">
                              Students
                            </Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {enrollment.studentIds.map((student) => (
                                <div
                                  key={student._id}
                                  className="flex items-center gap-2"
                                >
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-base font-bold">
                                    {student.studentId.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Resto de información en el orden especificado */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                Language
                              </Label>
                              <p className="text-sm mt-1">{enrollment.language}</p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                Plan
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm">{enrollment.planId.name}</p>
                                {enrollment.alias && (
                                  <span className="text-xs text-muted-foreground">
                                    ({enrollment.alias})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                Enrollment Type
                              </Label>
                              <p className="text-sm mt-1 capitalize">
                                {enrollment.enrollmentType}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                Status
                              </Label>
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                                  enrollment.status === 1
                                    ? "bg-secondary/20 text-secondary"
                                    : enrollment.status === 2
                                    ? "bg-accent-1/20 text-accent-1"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {enrollment.status === 1
                                  ? "Active"
                                  : enrollment.status === 2
                                  ? "Inactive"
                                  : "Other"}
                              </span>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                Start Date
                              </Label>
                              <p className="text-sm mt-1">
                                {formatDateForDisplay(enrollment.startDate)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground font-semibold">
                                End Date
                              </Label>
                              <p className="text-sm mt-1">
                                {formatDateForDisplay(enrollment.endDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="ml-4"
                        >
                          <Link href={`/professor/enrollments/${enrollment._id}`}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                      {index < enrollments.length - 1 && (
                        <div className="border-t my-6" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No enrollments found for this teacher.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bonuses</CardTitle>
                <Button
                  variant="default"
                  onClick={() => handleOpenBonusDialog("create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bonus
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bonusSuccessMessage && (
                <div className="bg-secondary/10 border border-secondary/20 text-secondary dark:text-secondary-foreground px-4 py-3 rounded flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{bonusSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setBonusSuccessMessage(null)}
                    className="text-secondary hover:opacity-80 dark:text-secondary-foreground"
                    aria-label="Close success message"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {isBonusesLoading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : bonuses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>Bonus Date</TableHead>
                      <TableHead>Month To Be Paid In</TableHead>
                      <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonuses.map((bonus) => (
                        <TableRow key={bonus._id}>
                          <TableCell>
                            {formatDateForDisplay(bonus.bonusDate)}
                          </TableCell>
                          <TableCell>{bonus.month}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={bonus.description}>
                            {bonus.description || "-"}
                          </TableCell>
                          <TableCell className="font-bold">
                            ${bonus.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {bonus.userId?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                bonus.status === 1
                                  ? "bg-secondary/20 text-secondary"
                                  : "bg-accent-1/20 text-accent-1"
                              }`}
                            >
                              {bonus.status === 1 ? "Active" : "Deactivated"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {bonus.status === 1 && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-primary border-primary/50 hover:bg-primary/10"
                                    onClick={() =>
                                      handleOpenBonusDialog("edit", bonus)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
                                    onClick={() =>
                                      handleOpenBonusDialog("delete", bonus)
                                    }
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No bonuses found for this professor.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalizations">
          <PenalizationsSection
            entityId={teacherId}
            entityType="professor"
            entityName={teacher?.name}
          />
        </TabsContent>
      </Tabs>

      {/* Bonus Dialogs */}
      <Dialog open={bonusDialog !== null} onOpenChange={handleCloseBonusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bonusDialog === "create" && "Add Bonus"}
              {bonusDialog === "edit" && "Edit Bonus"}
              {bonusDialog === "view" && "Bonus Details"}
              {bonusDialog === "delete" && "Deactivate Bonus"}
            </DialogTitle>
          </DialogHeader>

          {bonusDialog === "view" && selectedBonus && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Amount</Label>
                  <p className="text-base font-bold">
                    ${selectedBonus.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedBonus.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedBonus.status === 1 ? "Active" : "Deactivated"}
                  </span>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Bonus Date</Label>
                  <p className="text-sm">
                    {formatDateForDisplay(selectedBonus.bonusDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Month</Label>
                  <p className="text-sm">{selectedBonus.month}</p>
                </div>
                {selectedBonus.description && (
                  <div>
                    <Label className="text-sm font-semibold">Description</Label>
                    <p className="text-sm">{selectedBonus.description}</p>
                  </div>
                )}
                {selectedBonus.userId && (
                  <div>
                    <Label className="text-sm font-semibold">Created By</Label>
                    <p className="text-sm">{selectedBonus.userId.name}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm">
                    {formatDateForDisplay(selectedBonus.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(bonusDialog === "create" || bonusDialog === "edit") && (
            <form
              onSubmit={
                bonusDialog === "create"
                  ? handleCreateBonus
                  : handleUpdateBonus
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="bonusAmount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={bonusFormData.amount}
                  onChange={(e) =>
                    setBonusFormData({
                      ...bonusFormData,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonusMonth">
                  Month to be paid in <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bonusMonth"
                  type="month"
                  required
                  value={bonusFormData.month}
                  onChange={(e) =>
                    setBonusFormData({
                      ...bonusFormData,
                      month: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Select the month to which this bonus belongs for reporting purposes (e.g., if the bonus is for January&apos;s performance, select January).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonusDescription">Description</Label>
                <Textarea
                  id="bonusDescription"
                  value={bonusFormData.description || ""}
                  onChange={(e) =>
                    setBonusFormData({
                      ...bonusFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g., Bonus for excellent performance..."
                />
              </div>

              {bonusError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bonusError}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseBonusDialog}
                  disabled={isBonusSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isBonusSubmitting}>
                  {isBonusSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {bonusDialog === "create" ? "Create" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {bonusDialog === "delete" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deactivate this bonus? The bonus will
                be marked as deactivated and will not appear in future reports.
              </p>
              {selectedBonus && (
                <div className="bg-muted/50 p-4 rounded">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-semibold">Amount</Label>
                      <p className="text-base font-bold">
                        ${selectedBonus.amount.toFixed(2)}
                      </p>
                    </div>
                    {selectedBonus.description && (
                      <div>
                        <Label className="text-sm font-semibold">
                          Description
                        </Label>
                        <p className="text-sm">{selectedBonus.description}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-semibold">Month</Label>
                      <p className="text-sm">{selectedBonus.month}</p>
                    </div>
                  </div>
                </div>
              )}

              {bonusError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bonusError}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseBonusDialog}
                  disabled={isBonusSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteBonus}
                  disabled={isBonusSubmitting}
                >
                  {isBonusSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Deactivate
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE SELECTOR DE PROFESSOR TYPE CON TARIFAS ---
function ProfessorTypeSelect({
  items,
  selectedId,
  onSelectedChange,
  placeholder,
  required,
}: {
  items: ProfessorType[];
  selectedId: string;
  onSelectedChange: (id: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item._id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          {selectedItem ? (
            <div className="flex flex-col items-start flex-1">
              <span className="font-medium">{selectedItem.name}</span>
              <span className="text-xs text-muted-foreground">
                Single: ${selectedItem.rates.single.toFixed(2)} | Couple: ${selectedItem.rates.couple.toFixed(2)} | Group: ${selectedItem.rates.group.toFixed(2)}
              </span>
            </div>
          ) : (
            placeholder
          )}
          <div className="flex items-center gap-1">
            {!required && selectedItem && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectedChange("");
                }}
              />
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No professor type found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {!required && selectedItem && (
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onSelectedChange("");
                  setOpen(false);
                }}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear selection
              </CommandItem>
            )}
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => {
                  onSelectedChange(item._id);
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    selectedId === item._id ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Single: ${item.rates.single.toFixed(2)} | Couple: ${item.rates.couple.toFixed(2)} | Group: ${item.rates.group.toFixed(2)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

