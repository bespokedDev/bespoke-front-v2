/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  getCurrentDateString,
} from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Ban,
  CheckCircle2,
  Loader2,
  Eye,
  ArrowUpDown,
  X,
  AlertCircle,
  Trash2,
  Upload,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

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
  kid: number; // 0 = estudiante normal, 1 = kid (obligatorio)
  representativeName?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  occupation?: string | null;
  status: number; // 0=inactivo, 1=activo
  dislike?: string | null; // En la base de datos es "dislike", pero el label será "Dislikes"
  strengths?: string | null;
  academicPerformance?: string | null;
  rutinePriorBespoke?: string | null;
  specialAssitance?: number | null;
  helpWithElectronicClassroom?: number | null;
  avatar?: string | null;
  avatarPermission?: number | null;
  notes: Note[];
}

type StudentFormData = Omit<
  Student,
  | "_id"
  | "studentCode"
  | "disenrollmentDate"
  | "disenrollmentReason"
  | "createdAt"
  | "updatedAt"
  | "__v"
>;

// --- ESTADO INICIAL ---
const initialStudentState: StudentFormData = {
  name: "",
  dob: "",
  gender: "",
  kid: 0, // Por defecto estudiante normal (no kid)
  representativeName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  occupation: "",
  status: 1, // Por defecto activo (siempre activo al crear)
  dislike: "",
  strengths: "",
  academicPerformance: "",
  rutinePriorBespoke: "",
  specialAssitance: null,
  helpWithElectronicClassroom: null,
  avatar: null,
  avatarPermission: null,
  notes: [],
} as StudentFormData;

// --- COMPONENTE PRINCIPAL ---
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "status" | null
  >(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] =
    useState<Partial<StudentFormData>>(initialStudentState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [studentAvatar, setStudentAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvaDocDescription, setCanvaDocDescription] = useState<string>("");

  // --- OBTENCIÓN DE DATOS ---
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/students");
      console.log("data: ", data);
      setStudents(data);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load students. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // --- MANEJADORES DE DIÁLOGOS ---
  const handleOpen = (
    type: "create" | "status",
    student?: Student
  ) => {
    setDialogError(null);
    setDeactivationReason("");
    if (type === "create") {
      setSelectedStudent(null);
      setFormData(initialStudentState);
      setStudentAvatar(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (student) {
      setSelectedStudent(student);
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedStudent(null);
    setFormData(initialStudentState);
    setIsSubmitting(false);
    setDialogError(null);
    setStudentAvatar(null);
    setCanvaDocDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- MANEJADORES DE FORMULARIOS ---
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (
    name: keyof StudentFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleCheckboxChange = (
    name: keyof StudentFormData,
    checked: boolean
  ) => {
    setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
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
      { date: getCurrentDateString(), text: "" },
    ];
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };
  const removeNote = (index: number) => {
    const newNotes = (formData.notes || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };

  // --- MANEJADORES DE AVATAR ---
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      setDialogError("Please select a valid image file.");
      return;
    }

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      setDialogError("Image size must be less than 5MB.");
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

  // Función helper para obtener iniciales del nombre
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // --- ACCIONES DE LA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    try {
      // Enviar solo la fecha en formato YYYY-MM-DD (sin hora)
      const payload: Partial<StudentFormData> = {
        ...formData,
        kid: formData.kid ?? 0, // Inicializar en 0 si no está definido (0 = no kid, 1 = kid)
        status: 1, // Siempre activo al crear
        dob: formData.dob || undefined,
        representativeName: formData.kid === 1 ? formData.representativeName : null,
        dislike: formData.dislike || null,
        strengths: formData.kid === 1 ? (formData.strengths || null) : null,
        academicPerformance: formData.kid === 1 ? (formData.academicPerformance || null) : null,
        rutinePriorBespoke: formData.kid === 1 ? (formData.rutinePriorBespoke || null) : null,
        specialAssitance: formData.kid === 1 ? (formData.specialAssitance ?? null) : null,
        helpWithElectronicClassroom: formData.kid === 1 ? (formData.helpWithElectronicClassroom ?? null) : null,
        avatar: formData.avatar || null,
        avatarPermission: formData.avatarPermission ?? null,
        notes: formData.notes?.filter((note) => note.date && note.text).map((note) => ({
          _id: note._id,
          date: note.date,
          text: note.text,
        })),
      };

      if (openDialog === "create") {
        const response = await apiClient("api/students", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        
        // Si se proporcionó una descripción de CanvaDoc, crear el documento
        if (canvaDocDescription && canvaDocDescription.trim() && response?._id) {
          try {
            await apiClient("api/canva-docs", {
              method: "POST",
              body: JSON.stringify({
                description: canvaDocDescription.trim(),
                studentId: response._id,
                isActive: true,
              }),
            });
          } catch (canvaDocError) {
            // Si falla la creación del CanvaDoc, no fallar toda la creación del estudiante
            console.error("Failed to create CanvaDoc:", canvaDocError);
          }
        }
      }
      await fetchStudents();
      handleClose();
      setCanvaDocDescription(""); // Limpiar el campo después de crear
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
  const handleToggleStatus = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setDialogError(null);

    try {
      // Usar endpoints específicos según la documentación
      if (selectedStudent.status === 1) {
        // Desactivar: PATCH /api/students/:id/deactivate
        const body = deactivationReason ? { reason: deactivationReason } : {};
        await apiClient(`api/students/${selectedStudent._id}/deactivate`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        // Activar: PATCH /api/students/:id/activate
        await apiClient(`api/students/${selectedStudent._id}/activate`, {
          method: "PATCH",
        });
      }
      await fetchStudents();
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Student not found."
          : errorInfo.isValidationError
          ? "Please check the information and try again."
          : "Failed to update student status. Please try again."
      );
      setDialogError(errorMessage); // Mostrar error dentro del modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const stringLocaleSort =
    (locale = "es") =>
    (rowA: any, rowB: any, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  // --- DEFINICIÓN DE COLUMNAS PARA LA TABLA ---
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "studentCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Code
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Name
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Email
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Phone
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Status
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const status = row.original.status;
        const statusText =
          status === 1 ? "Active" : "Inactive";
        const statusClass =
          status === 1
            ? "bg-secondary/20 text-secondary"
            : status === 0
            ? "bg-accent-1/20 text-accent-1"
            : "bg-yellow-100 text-yellow-800";

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="text-secondary border-secondary/50 hover:bg-secondary/10"
            asChild
          >
            <Link href={`/students/${row.original._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {row.original.status === 1 ? (
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpen("status", row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpen("status", row.original)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="space-y-6">
      <PageHeader title="Students" subtitle="Manage all enrolled students">
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add student
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:opacity-80 dark:text-destructive-foreground"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <Card className=" border-none">
          <CardContent>
            <DataTable
              columns={columns}
              data={students}
              searchKeys={["studentCode", "name", "email"]}
              searchPlaceholder="Search by code, name, or email..."
            />
          </CardContent>
        </Card>
      )}

      {/* --- DIÁLOGOS --- */}
      <Dialog
        open={openDialog !== null}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add New Student"}
              {openDialog === "status" && `Confirm Status Change`}
            </DialogTitle>
          </DialogHeader>

          {openDialog === "create" && (
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] overflow-y-auto p-1 pr-4 space-y-6"
            >
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Avatar</legend>
                <div className="flex items-start gap-6 mt-2">
                  <Avatar className="h-24 w-24">
                    {studentAvatar ? (
                      <AvatarImage src={studentAvatar} alt={formData.name || "Student"} />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {formData.name ? getInitials(formData.name) : "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2 flex-1">
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
                      Image files only, max 5MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2 min-w-[200px]">
                    <Label>Authorization for socials</Label>
                    <Select
                      onValueChange={(v) => handleSelectChange("avatarPermission", parseInt(v))}
                      value={formData.avatarPermission?.toString() || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Yes</SelectItem>
                        <SelectItem value="0">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Personal Info</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Date of Birth <span className="text-red-500">*</span>
                    </Label>
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
                    <Label>
                      Gender <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      name="gender"
                      onValueChange={(v) => handleSelectChange("gender", v)}
                      value={formData.gender || ""}
                      required
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
                    <Label>Occupation</Label>
                    <Input
                      name="occupation"
                      value={formData.occupation || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-4">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.kid === 1}
                          onChange={(e) => {
                            handleCheckboxChange("kid", e.target.checked);
                            if (!e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                representativeName: "",
                              }));
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span>
                          Kid <span className="text-red-500">*</span>
                        </span>
                      </Label>
                      {formData.kid === 1 && (
                        <div className="flex-1">
                          <Input
                            name="representativeName"
                            placeholder="Representative Name"
                            value={formData.representativeName || ""}
                            onChange={handleFormChange}
                          />
                        </div>
                      )}
                    </div>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Phone <span className="text-red-500">*</span>
                    </Label>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      name="city"
                      value={formData.city || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </fieldset>
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Learning Information</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dislikes</Label>
                    <Textarea
                      name="dislike"
                      value={formData.dislike || ""}
                      onChange={handleFormChange}
                      placeholder="Things the student doesn't like..."
                    />
                  </div>
                  {formData.kid === 1 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Strengths</Label>
                      <Textarea
                        name="strengths"
                        value={formData.strengths || ""}
                        onChange={handleFormChange}
                        placeholder="Student's strengths..."
                      />
                    </div>
                  )}
                  {formData.kid === 1 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Academic Performance</Label>
                      <Select
                        onValueChange={(v) => handleSelectChange("academicPerformance", v)}
                        value={formData.academicPerformance || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Destacado: Aprende con facilidad y tiene buen rendimiento.">
                            Destacado: Aprende con facilidad y tiene buen rendimiento.
                          </SelectItem>
                          <SelectItem value="Satisfactorio: Se desenvuelve bien, aunque puede tener desafíos ocasionales">
                            Satisfactorio: Se desenvuelve bien, aunque puede tener desafíos ocasionales
                          </SelectItem>
                          <SelectItem value="En desarrollo: Le cuesta avanzar y requiere apoyo adicional.">
                            En desarrollo: Le cuesta avanzar y requiere apoyo adicional.
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.kid === 1 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Routine Prior to Bespoke</Label>
                      <Textarea
                        name="rutinePriorBespoke"
                        value={formData.rutinePriorBespoke || ""}
                        onChange={handleFormChange}
                        placeholder="What is their routine before classes on the platform..."
                      />
                    </div>
                  )}
                  {formData.kid === 1 && (
                    <div className="space-y-2">
                      <Label>The student engages in school or in recreational activities without assistance</Label>
                      <Select
                        onValueChange={(v) => handleSelectChange("specialAssitance", parseInt(v))}
                        value={formData.specialAssitance?.toString() || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Yes</SelectItem>
                          <SelectItem value="0">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.kid === 1 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.helpWithElectronicClassroom === 1}
                          onChange={(e) => {
                            handleCheckboxChange("helpWithElectronicClassroom", e.target.checked);
                          }}
                          className="h-4 w-4"
                        />
                        <span>Does she/he need help using electronic devices or connecting to the classroom?</span>
                      </Label>
                    </div>
                  )}
                </div>
              </fieldset>
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">CanvaDoc (Optional)</legend>
                <div className="space-y-2 mt-2">
                  <Label>CanvaDoc Description</Label>
                  <Textarea
                    value={canvaDocDescription}
                    onChange={(e) => setCanvaDocDescription(e.target.value)}
                    placeholder="Enter CanvaDoc description (optional)..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, a CanvaDoc will be created for this student automatically.
                  </p>
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
              {dialogError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}
              <DialogFooter className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClose}
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
                  )}{" "}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}

          {openDialog === "status" && selectedStudent && (
            <div>
              <DialogDescription className="text-light-text dark:text-dark-text">
                Are you sure you want to{" "}
                {selectedStudent.status === 1 ? "deactivate" : "activate"}{" "}
                <span className="font-bold">{selectedStudent.name}</span>?
              </DialogDescription>
              {selectedStudent.status === 1 && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="reason">
                    Reason for deactivation (optional)
                  </Label>
                  <Input
                    id="reason"
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    placeholder="e.g., Moved to another city"
                  />
                </div>
              )}
              {dialogError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    selectedStudent.status === 1 ? "destructive" : "default"
                  }
                  className={
                    selectedStudent.status !== 1
                      ? "bg-secondary hover:bg-secondary/90 text-white"
                      : ""
                  }
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  {selectedStudent.status === 1 ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
