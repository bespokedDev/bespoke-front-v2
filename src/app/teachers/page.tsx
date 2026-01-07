/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { handleApiError, getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
import { DataTable } from "@/components/ui/data-table";
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
  Plus,
  Loader2,
  Trash2,
  Eye,
  ArrowUpDown,
  X,
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

// --- Tipos y Estado Inicial (igual que antes) ---
interface PaymentData {
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
interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
}
interface Professor {
  _id: string;
  name: string;
  ciNumber: string;
  dob: string;
  address: string;
  email: string;
  phone: string;
  occupation: string;
  startDate?: string;
  typeId?: string;
  emergencyContact: EmergencyContact;
  paymentData: PaymentData[];
  isActive: boolean;
}
type ProfessorFormData = Omit<Professor, "_id" | "isActive">;
const initialProfessorState: ProfessorFormData = {
  name: "",
  ciNumber: "",
  dob: "",
  address: "",
  email: "",
  phone: "",
  occupation: "",
  startDate: "",
  typeId: "",
  emergencyContact: { name: "", phone: "" },
  paymentData: [
    {
      bankName: "",
      accountType: "",
      accountNumber: "",
      holderName: "",
      holderCI: "",
      holderEmail: "",
      holderAddress: "",
      routingNumber: "",
    },
  ],
};

interface ProfessorType {
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

// --- COMPONENTE PRINCIPAL ---
export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Professor[]>([]);
  const [professorTypes, setProfessorTypes] = useState<ProfessorType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del diálogo
  const [openDialog, setOpenDialog] = useState<"create" | "status" | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Professor | null>(null);
  const [formData, setFormData] = useState<Partial<ProfessorFormData>>(
    initialProfessorState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // --- Lógica de la API (se mantiene igual) ---
  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching teachers from api/professors...");
      const data = await apiClient("api/professors");
      console.log("Teachers data received:", data);
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      console.log("Error fetching teachers:", errorInfo);
      // Solo mostrar error al usuario si no es un 404 (Not Found)
      // Los 404 pueden ocurrir durante navegación y no deberían mostrarse
      if (errorInfo.statusCode !== 404) {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load teachers. Please try again."
        );
        setError(errorMessage);
      } else {
        // Si es 404, simplemente establecer array vacío sin mostrar error
        console.log("404 error on professors endpoint, setting empty array");
        setTeachers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfessorTypes = async () => {
    try {
      const data = await apiClient("api/professor-types");
      console.log("Professor types data received:", data);
      
      // Manejar diferentes estructuras de respuesta
      let typesArray: ProfessorType[] = [];
      if (Array.isArray(data)) {
        typesArray = data;
      } else if (data && typeof data === 'object' && 'professorTypes' in data) {
        typesArray = Array.isArray(data.professorTypes) ? data.professorTypes : [];
      } else if (data && typeof data === 'object' && 'data' in data) {
        typesArray = Array.isArray(data.data) ? data.data : [];
      }
      
      console.log("Processed professor types:", typesArray);
      setProfessorTypes(typesArray);
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      // Solo loguear errores que no sean 404 (Not Found), ya que este endpoint es opcional
      if (errorInfo.statusCode !== 404) {
        console.error("Error fetching professor types:", err);
      }
      // No mostramos error al usuario ya que este campo es opcional
      setProfessorTypes([]);
    }
  };

  useEffect(() => {
    // Envolver las llamadas para evitar que los errores 404 se muestren en consola
    const loadData = async () => {
      try {
        await Promise.allSettled([
          fetchTeachers(),
          fetchProfessorTypes()
        ]);
      } catch {
        // Los errores ya están manejados en las funciones individuales
        // Este catch solo previene que errores no manejados se propaguen
      }
    };
    
    loadData();
  }, []);

  const handleOpen = (type: "create") => {
    setDialogError(null);
    setFormData(initialProfessorState);
    setOpenDialog(type);
  };
  const handleClose = () => {
    setOpenDialog(null);
    setSelectedTeacher(null);
    setFormData(initialProfessorState);
    setIsSubmitting(false);
    setDialogError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* ... (sin cambios) ... */
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleNestedChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    parentKey: keyof ProfessorFormData,
    childKey: keyof EmergencyContact
  ) => {
    /* ... (sin cambios) ... */
    const { value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [parentKey]: { ...prev[parentKey], [childKey]: value },
    }));
  };
  const handlePaymentDataChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof PaymentData
  ) => {
    /* ... (sin cambios) ... */
    const { value } = e.target;
    const updatedPaymentData = [...(formData.paymentData || [])];
    updatedPaymentData[index] = {
      ...updatedPaymentData[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, paymentData: updatedPaymentData }));
  };
  const addPaymentMethod = () => {
    /* ... (sin cambios) ... */
    const newPaymentData = [...(formData.paymentData || []), { bankName: "" }];
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };
  const removePaymentMethod = (index: number) => {
    /* ... (sin cambios) ... */
    const newPaymentData = (formData.paymentData || []).filter(
      (_, i) => i !== index
    );
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    /* ... (sin cambios) ... */
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    const payload = { ...formData };
    if (!payload.startDate) {
      delete payload.startDate;
    }
    if (
      payload.emergencyContact &&
      !payload.emergencyContact.name &&
      !payload.emergencyContact.phone
    ) {
      delete payload.emergencyContact;
    }
    try {
      await apiClient("api/professors", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchTeachers();
      handleClose();
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

  const handleToggleStatus = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setDialogError(null);
    const action = selectedTeacher.isActive ? "deactivate" : "activate";
    try {
      await apiClient(`api/professors/${selectedTeacher._id}/${action}`, {
        method: "PATCH",
      });
      await fetchTeachers();
      handleClose();
    } catch (err: unknown) {
      const errorInfo = handleApiError(err);
      const errorMessage = getFriendlyErrorMessage(
        err,
        errorInfo.isNotFoundError
          ? "Teacher not found."
          : "Failed to update teacher status. Please try again."
      );
      setDialogError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStatus = (teacher: Professor) => {
    setSelectedTeacher(teacher);
    setDialogError(null);
    setOpenDialog("status");
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

  // --- DEFINICIÓN DE COLUMNAS PARA LA TABLA REUTILIZABLE ---
  const columns: ColumnDef<Professor>[] = [
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
      accessorKey: "isActive",
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
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.original.isActive
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
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
            <Link href={`/teachers/${row.original._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {row.original.isActive ? (
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpenStatus(row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpenStatus(row.original)}
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
      <PageHeader
        title="Teachers"
        subtitle="List of all teachers registered in the academy"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add teacher
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
              data={teachers}
              searchKeys={["name", "email", "phone"]}
            />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={openDialog !== null}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Change teacher status</DialogTitle>
          </DialogHeader>
          {openDialog === "create" && (
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciNumber">CI Number</Label>
                  <Input
                    id="ciNumber"
                    name="ciNumber"
                    value={formData.ciNumber || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    max="9999-12-31"
                    value={formData.dob || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    name="occupation"
                    value={formData.occupation || ""}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    max="9999-12-31"
                    value={formData.startDate || ""}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeId">
                    Professor Type <span className="text-red-500">*</span>
                  </Label>
                  <ProfessorTypeSelect
                    items={professorTypes}
                    selectedId={formData.typeId || ""}
                    onSelectedChange={(id) =>
                      setFormData((prev) => ({ ...prev, typeId: id }))
                    }
                    placeholder={
                      professorTypes.length === 0
                        ? "Loading professor types..."
                        : "Select professor type..."
                    }
                    required
                  />
                </div>
                <fieldset className="md:col-span-2 border p-4 rounded-md border-light-border dark:border-dark-border">
                  <legend className="text-sm font-medium px-1 text-light-subtext dark:text-dark-subtext">
                    Emergency Contact
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Name</Label>
                      <Input
                        id="emergencyName"
                        value={formData.emergencyContact?.name || ""}
                        onChange={(e) =>
                          handleNestedChange(e, "emergencyContact", "name")
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={formData.emergencyContact?.phone || ""}
                        onChange={(e) =>
                          handleNestedChange(e, "emergencyContact", "phone")
                        }
                      />
                    </div>
                  </div>
                </fieldset>
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-lg font-medium text-light-subtext dark:text-dark-subtext">
                    Payment Data
                  </h3>
                  {(formData.paymentData || []).map((payment, index) => (
                    <fieldset
                      key={index}
                      className="border p-4 rounded-md border-light-border dark:border-dark-border relative"
                    >
                      <legend className="text-sm font-medium px-1 text-light-subtext dark:text-dark-subtext">
                        Method {index + 1}
                      </legend>
                      {formData.paymentData &&
                        formData.paymentData.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1 text-accent-1"
                            onClick={() => removePaymentMethod(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input
                            value={payment.bankName}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "bankName")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Input
                            value={payment.accountType || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "accountType")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input
                            value={payment.accountNumber || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "accountNumber")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s Name</Label>
                          <Input
                            value={payment.holderName || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderName")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s CI</Label>
                          <Input
                            value={payment.holderCI || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderCI")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s Email</Label>
                          <Input
                            value={payment.holderEmail || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderEmail")
                            }
                          />
                        </div>
                      </div>
                    </fieldset>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPaymentMethod}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Payment Method
                  </Button>
                </div>
              </div>
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
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  Create Teacher
                </Button>
              </DialogFooter>
            </form>
          )}
          {openDialog === "status" && selectedTeacher && (
            <div>
              <DialogDescription className="text-light-text dark:text-dark-text">
                Are you sure you want to{" "}
                {selectedTeacher.isActive ? "deactivate" : "activate"} the
                teacher{" "}
                <span className="font-bold">{selectedTeacher.name}</span>?
              </DialogDescription>
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
                  variant={selectedTeacher.isActive ? "destructive" : "default"}
                  className={
                    !selectedTeacher.isActive
                      ? "bg-secondary hover:bg-secondary/90 text-white"
                      : ""
                  }
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {selectedTeacher.isActive ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE SEARCHABLE SELECT REUTILIZABLE ---
function SearchableSelect({
  items,
  selectedId,
  onSelectedChange,
  placeholder,
  required,
}: {
  items: { _id: string; name: string }[];
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
          {selectedItem ? selectedItem.name : placeholder}
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
          <CommandEmpty>No item found.</CommandEmpty>
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
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
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
