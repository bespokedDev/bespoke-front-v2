"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, Eye, ExternalLink } from "lucide-react";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { useRouter } from "next/navigation";

interface Enrollment {
  enrollmentId: string;
  planName: string;
  amount: number;
  rescheduleHours: number;
  enrollmentType: string;
  startDate: string;
  endDate: string;
}

interface EnrollmentListProps {
  enrollments: Enrollment[];
  onViewEnrollment: (enrollmentId: string) => void;
  isLoading?: boolean;
  studentId?: string;
}

export function EnrollmentList({
  enrollments,
  onViewEnrollment,
  isLoading = false,
  studentId,
}: EnrollmentListProps) {
  const router = useRouter();

  const handleViewEnrollmentDetails = (enrollmentId: string) => {
    const url = studentId 
      ? `/enrollments/${enrollmentId}?from=student&studentId=${studentId}`
      : `/enrollments/${enrollmentId}`;
    router.push(url);
  };

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Loading enrollment information...
      </p>
    );
  }

  if (enrollments.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No active enrollments found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Label className="text-lg font-semibold">Active Enrollments</Label>
      {enrollments.map((enrollment, index) => (
        <div key={enrollment.enrollmentId}>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold">{enrollment.planName}</Label>
                <span className="text-sm text-muted-foreground capitalize">
                  ({enrollment.enrollmentType})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDateForDisplay(enrollment.startDate)} /{" "}
                    {formatDateForDisplay(enrollment.endDate)}
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
            <div className="flex flex-col gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewEnrollment(enrollment.enrollmentId)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewEnrollmentDetails(enrollment.enrollmentId)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Details
              </Button>
            </div>
          </div>
          {index < enrollments.length - 1 && (
            <div className="border-t my-6" />
          )}
        </div>
      ))}
    </div>
  );
}

