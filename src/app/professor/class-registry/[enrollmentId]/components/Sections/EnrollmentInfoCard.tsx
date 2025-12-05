"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BookOpen, Eye } from "lucide-react";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Enrollment } from "../../types";

interface EnrollmentInfoCardProps {
  enrollment: Enrollment;
}

export function EnrollmentInfoCard({ enrollment }: EnrollmentInfoCardProps) {
  return (
    <Card className="md:col-span-1 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Enrollment Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Plan</Label>
          <p className="text-sm">{enrollment.planId.name}</p>
        </div>
        {enrollment.alias && (
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Alias</Label>
            <p className="text-sm">{enrollment.alias}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Language</Label>
            <p className="text-sm">{enrollment.language}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
            <p className="text-sm capitalize">{enrollment.enrollmentType}</p>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Students</Label>
          <div className="space-y-1 mt-1">
            {enrollment.studentIds.map((studentInfo) => (
              <div
                key={studentInfo._id}
                className="flex items-center justify-between p-1.5 border rounded text-xs"
              >
                <div>
                  <p className="font-medium">{studentInfo.studentId.name}</p>
                  <p className="text-muted-foreground">{studentInfo.studentId.studentCode}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  asChild
                >
                  <Link href={`/students/${studentInfo.studentId._id}`}>
                    <Eye className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Start</Label>
            <p className="text-sm">{formatDateForDisplay(enrollment.startDate)}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">End</Label>
            <p className="text-sm">{formatDateForDisplay(enrollment.endDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

