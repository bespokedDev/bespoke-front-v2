"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Eye, ExternalLink } from "lucide-react";
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
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Plan
              </Label>
              <p className="text-sm">{enrollment.planId.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Type
              </Label>
              <p className="text-sm">{enrollment.enrollmentType}</p>
            </div>
            {enrollment.scheduledDays && enrollment.scheduledDays.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">
                  Class Days
                </Label>
                <p className="text-sm">
                  {enrollment.scheduledDays.map((d) => d.day).join(", ")}
                </p>
              </div>
            )}
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

        {/* Información adicional del estudiante (para un solo estudiante) */}
        {isSingleStudent && (
          <div className="border-t pt-3 mt-3 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Language Level
              </Label>
              <p className="text-sm">{firstStudent.languageLevel || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Student Since
              </Label>
              <p className="text-sm">
                {(firstStudent.studentId.enrollmentDate || firstStudent.studentId.createdAt)
                  ? formatDateForDisplay(
                      firstStudent.studentId.enrollmentDate || firstStudent.studentId.createdAt || ""
                    )
                  : "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Image to Social Media Authorization
              </Label>
              <p className="text-sm">
                {firstStudent.studentId.avatarPermission === true
                  ? "Yes"
                  : firstStudent.studentId.avatarPermission === false
                  ? "No"
                  : "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Learning Style
              </Label>
              <p className="text-sm">{firstStudent.learningType || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Wants Homework
              </Label>
              <p className="text-sm">
                {firstStudent.willingHomework === 1
                  ? "Yes"
                  : firstStudent.willingHomework === 0
                  ? "No"
                  : "N/A"}
              </p>
            </div>
            {/* Canva & Doc */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Canva & Doc
              </Label>
              {firstStudent.studentId.canvaDocUrl ? (
                <a
                  href={firstStudent.studentId.canvaDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {firstStudent.studentId.canvaDocUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        )}

        {/* Información adicional de estudiantes (para múltiples estudiantes) */}
        {!isSingleStudent && (
          <div className="border-t pt-3 mt-3 space-y-4">
            {enrollment.studentIds.map((studentInfo) => (
              <div key={studentInfo._id} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {studentInfo.studentId.name}
                </p>
                <div className="space-y-2 pl-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Language Level
                    </Label>
                    <p className="text-sm">{studentInfo.languageLevel || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Student Since
                    </Label>
                    <p className="text-sm">
                      {(studentInfo.studentId.enrollmentDate || studentInfo.studentId.createdAt)
                        ? formatDateForDisplay(
                            studentInfo.studentId.enrollmentDate || studentInfo.studentId.createdAt || ""
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Image to Social Media Authorization
                    </Label>
                    <p className="text-sm">
                      {studentInfo.studentId.avatarPermission === true
                        ? "Yes"
                        : studentInfo.studentId.avatarPermission === false
                        ? "No"
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Learning Style
                    </Label>
                    <p className="text-sm">{studentInfo.learningType || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Wants Homework
                    </Label>
                    <p className="text-sm">
                      {studentInfo.willingHomework === 1
                        ? "Yes"
                        : studentInfo.willingHomework === 0
                        ? "No"
                        : "N/A"}
                    </p>
                  </div>
                  {/* Canva & Doc para múltiples estudiantes */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Canva & Doc
                    </Label>
                    {studentInfo.studentId.canvaDocUrl ? (
                      <a
                        href={studentInfo.studentId.canvaDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {studentInfo.studentId.canvaDocUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información del Representante (si existe) */}
        {hasRepresentative && (
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
        )}
      </CardContent>
    </Card>
  );
}
