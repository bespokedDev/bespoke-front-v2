import type { ColumnDef, Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Pencil, Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { Enrollment, StudentBrief, StudentEnrollmentInfo } from "../types/enrollment.types";

// Tipo para los elementos del array studentIds que puede ser StudentEnrollmentInfo o StudentBrief
type StudentIdElement = StudentEnrollmentInfo | StudentBrief;

// Helper para verificar si un elemento es StudentEnrollmentInfo
const isStudentEnrollmentInfo = (element: StudentIdElement): element is StudentEnrollmentInfo => {
  return 'studentId' in element;
};

// Helper para extraer el nombre de un elemento de studentIds
const getStudentName = (studentElement: StudentIdElement, students: StudentBrief[]): string => {
  // Si es StudentEnrollmentInfo (tiene la propiedad studentId)
  if (isStudentEnrollmentInfo(studentElement)) {
    const studentId = studentElement.studentId;
    
    // Si studentId es un objeto (StudentBrief), tomar su name
    if (typeof studentId === "object" && studentId !== null && "name" in studentId) {
      return studentId.name;
    }
    
    // Si studentId es un string, buscar en el array de students
    if (typeof studentId === "string") {
      const student = students.find((st) => st._id === studentId);
      return student?.name || "N/A";
    }
  }
  
  // Si es StudentBrief directamente (tiene name directamente)
  if ("name" in studentElement && typeof studentElement.name === "string") {
    return studentElement.name;
  }
  
  return "N/A";
};

// Helper para ordenamiento alfabético
const stringLocaleSort =
  (locale = "es") =>
  (rowA: Row<Enrollment>, rowB: Row<Enrollment>, columnId: string) => {
    const a = (rowA.getValue(columnId) ?? "").toString();
    const b = (rowB.getValue(columnId) ?? "").toString();
    return a.localeCompare(b, locale, {
      numeric: true,
      sensitivity: "base",
      ignorePunctuation: true,
    });
  };

export function createEnrollmentColumns(
  students: StudentBrief[],
  onEdit: (enrollment: Enrollment) => void,
  onToggleStatus: (enrollment: Enrollment) => void
): ColumnDef<Enrollment>[] {
  return [
    // Alias o lista de estudiantes (string plano)
    {
      id: "aliasOrStudents",
      accessorFn: (row) => {
        // Si hay alias, usarlo
        if (row.alias?.trim()) return row.alias.trim();
        // Si no, extraer nombres de studentIds
        return row.studentIds
          .map((s: StudentIdElement) => getStudentName(s, students))
          .filter((name) => name !== "N/A" && name.trim() !== "")
          .join(", ");
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Alias / Students
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const alias = row.original.alias;
        if (alias?.trim()) return alias;
        // Extraer nombres de studentIds
        return row.original.studentIds
          .map((s: StudentIdElement) => getStudentName(s, students))
          .filter((name) => name !== "N/A")
          .join(", ");
      },
    },
    // Language
    {
      id: "language",
      accessorFn: (row) => row.language || "N/A",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Language
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.language || "N/A",
    },
    // Plan + tipo (string plano)
    {
      id: "planWithType",
      accessorFn: (row) => {
        const planName = row.planId.name;
        const type =
          row.enrollmentType === "single"
            ? "Single"
            : row.enrollmentType === "couple"
            ? "Couple"
            : "Group";
        return `${type} - ${planName}`;
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Plan
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const planName = row.original.planId.name;
        const t = row.original.enrollmentType;
        const type =
          t === "single" ? "Single" : t === "couple" ? "Couple" : "Group";
        return (
          <div>
            {type} - {planName}
          </div>
        );
      },
    },
    // Profesor (string plano)
    {
      id: "professor",
      accessorFn: (row) => row.professorId?.name || "N/A",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Professor
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.professorId?.name || "N/A",
    },
    // Status (si prefieres alfabético, lo exponemos como texto)
    {
      id: "statusText",
      accessorFn: (row) =>
        row.status === 1
          ? "Active"
          : row.status === 2
          ? "Inactive"
          : row.status === 3
          ? "Paused"
          : "Disolved",
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
          status === 1
            ? "Active"
            : status === 2
            ? "Inactive"
            : status === 3
            ? "Paused"
            : "Disolved";
        const statusClass =
          status === 1
            ? "bg-secondary/20 text-secondary"
            : status === 2
            ? "bg-accent-1/20 text-accent-1"
            : status === 3
            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
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
            <Link href={`/enrollments/${row.original._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
            onClick={() => onToggleStatus(row.original)}
            disabled={row.original.status === 0 || row.original.status === 3}
          >
            {row.original.status === 1 ? (
              <Ban className="h-4 w-4 text-accent-1" />
            ) : row.original.status === 2 ? (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            ) : (
              <Ban className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];
}

