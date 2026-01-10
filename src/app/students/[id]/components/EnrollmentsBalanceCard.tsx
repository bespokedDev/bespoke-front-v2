"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { EnrollmentList } from "./EnrollmentList";

interface Enrollment {
  enrollmentId: string;
  planName: string;
  amount: number;
  rescheduleHours: number;
  enrollmentType: string;
  startDate: string;
  endDate: string;
}

interface EnrollmentsBalanceCardProps {
  totalBalance: number;
  enrollments: Enrollment[];
  onViewEnrollment: (enrollmentId: string) => void;
  isLoading?: boolean;
  studentId?: string;
}

export function EnrollmentsBalanceCard({
  totalBalance,
  enrollments,
  onViewEnrollment,
  isLoading = false,
  studentId,
}: EnrollmentsBalanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Enrollments & Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Total */}
        <div className="bg-secondary/10 p-4 rounded-lg">
          <Label className="text-sm text-muted-foreground">
            Total Available Balance
          </Label>
          <p className="text-3xl font-bold text-secondary">
            ${totalBalance.toFixed(2)}
          </p>
        </div>

        {/* Lista de Enrollments */}
        <EnrollmentList
          enrollments={enrollments}
          onViewEnrollment={onViewEnrollment}
          isLoading={isLoading}
          studentId={studentId}
        />
      </CardContent>
    </Card>
  );
}

