"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Loader2,
  AlertCircle,
  X,
  ArrowUpDown,
  BookOpen,
  Eye,
  ClipboardList,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

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

export default function ProfessorClassRegistryPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = async () => {
    if (!user?.id) {
      setError("User ID not found. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response: ProfessorEnrollmentsResponse = await apiClient(
        `api/professors/${user.id}/enrollments`
      );
      console.log("response: ", response);
      setEnrollments(response.enrollments || []);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollments. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Solo hacer fetch si el usuario está autenticado y es profesor
    if (!isAuthLoading && user?.id && user?.role?.toLowerCase() === "professor") {
      fetchEnrollments();
    } else if (!isAuthLoading && (!user || user?.role?.toLowerCase() !== "professor")) {
      setError("You must be logged in as a professor to view enrollments.");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  const stringLocaleSort =
    (locale = "es") =>
    (rowA: { getValue: (columnId: string) => unknown }, rowB: { getValue: (columnId: string) => unknown }, columnId: string): number => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  const columns: ColumnDef<Enrollment>[] = [
    {
      id: "students",
      accessorFn: (row) => {
        // Función para extraer los nombres de estudiantes como string para búsqueda
        return row.studentIds.map((s) => s.studentId.name).join(" ");
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Students
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => {
        const studentNames = row.original.studentIds.map(
          (s) => s.studentId.name
        );
        return (
          <div className="flex flex-wrap items-center gap-1">
            {studentNames.map((name, index) => (
              <span key={index} className="text-sm font-semibold text-foreground">
                {name}
                {index < studentNames.length - 1 && (
                  <span className="text-foreground">, </span>
                )}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "plan",
      accessorFn: (row) => {
        // Función para extraer el nombre del plan como string para búsqueda
        return row.planId?.name || "";
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
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.planId.name}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-primary border-primary/50 hover:bg-primary/10"
          >
            <Link href={`/professor/enrollments/${row.original._id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-primary border-primary/50 hover:bg-primary/10"
          >
            <Link href={`/professor/class-registry/${row.original._id}`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Class Registry
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        subtitle="View and manage your enrollments"
      />

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
            className="text-red-700 hover:text-red-900"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={enrollments}
              searchKeys={["students", "plan"]}
              searchPlaceholder="Search by student name or plan..."
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && enrollments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No enrollments found. You don&apos;t have any active enrollments assigned.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

