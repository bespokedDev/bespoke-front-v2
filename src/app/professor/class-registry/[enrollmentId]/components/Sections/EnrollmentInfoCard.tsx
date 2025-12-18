"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Eye } from "lucide-react";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Enrollment } from "../../types";

interface EnrollmentInfoCardProps {
  enrollment: Enrollment;
}

export function EnrollmentInfoCard({ enrollment }: EnrollmentInfoCardProps) {
  const isSingleStudent = enrollment.studentIds.length === 1;
  const firstStudent = enrollment.studentIds[0];
  const hasRepresentative = enrollment.studentIds.some(
    (s) => s.studentId.representativeName
  );

  // Función para obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Función para formatear fecha de nacimiento para mostrar
  const formatDateOfBirth = (dob?: string) => {
    if (!dob) return null;
    try {
      return formatDateForDisplay(dob);
    } catch {
      return dob;
    }
  };

  return (
    <Card className="md:col-span-1 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
      <CardContent className="space-y-4 text-sm">
        {/* Estudiantes con Avatar */}
        <div className="space-y-3">
          {isSingleStudent ? (
            // Un solo estudiante: avatar centrado con icono arriba a la izquierda
            <div className="relative flex flex-col items-center space-y-2">
              <Avatar className="h-20 w-20">
                {firstStudent.studentId.photo && (
                  <AvatarImage
                    src={firstStudent.studentId.photo}
                    alt={firstStudent.studentId.name}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(firstStudent.studentId.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0"
                asChild
              >
                <Link href={`/students/${firstStudent.studentId._id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <div className="text-center">
                <p className="font-semibold text-base">
                  {firstStudent.studentId.name}
                </p>
                {firstStudent.studentId.dob && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateOfBirth(firstStudent.studentId.dob)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Varios estudiantes: avatar a la izquierda, nombre a la derecha, icono al final
            <div className="space-y-2">
              {enrollment.studentIds.map((studentInfo) => (
                <div
                  key={studentInfo._id}
                  className="flex items-center gap-3 p-2 border rounded"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    {studentInfo.studentId.photo && (
                      <AvatarImage
                        src={studentInfo.studentId.photo}
                        alt={studentInfo.studentId.name}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(studentInfo.studentId.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {studentInfo.studentId.name}
                    </p>
                    {studentInfo.studentId.dob && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateOfBirth(studentInfo.studentId.dob)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    asChild
                  >
                    <Link href={`/students/${studentInfo.studentId._id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información del Enrollment */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Language
              </Label>
              <p className="text-sm">{enrollment.language}</p>
            </div>
            {isSingleStudent && firstStudent.studentId.dob && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">
                  Date of Birth
                </Label>
                <p className="text-sm">
                  {formatDateOfBirth(firstStudent.studentId.dob)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Plan
              </Label>
              <p className="text-sm">{enrollment.planId.name}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Type
              </Label>
              <p className="text-sm">{enrollment.enrollmentType}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Period
            </Label>
            <p className="text-sm">
              {formatDateForDisplay(enrollment.startDate)} /{" "}
              {formatDateForDisplay(enrollment.endDate)}
            </p>
          </div>
        </div>

        {/* Información del Representante (si existe) */}
        {hasRepresentative && (
          <>
            <div className="border-t pt-3 mt-3">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Representative
              </Label>
              <div className="space-y-2">
                {enrollment.studentIds
                  .filter((s) => s.studentId.representativeName)
                  .map((studentInfo) => (
                    <div key={studentInfo._id} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {studentInfo.studentId.name}:
                      </p>
                      <p className="text-sm font-medium">
                        {studentInfo.studentId.representativeName}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
