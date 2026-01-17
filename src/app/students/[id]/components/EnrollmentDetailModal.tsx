"use client";

import { BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { EnrollmentDetail } from "../types";

interface EnrollmentDetailModalProps {
  enrollment: EnrollmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollmentDetailModal({
  enrollment,
  open,
  onOpenChange,
}: EnrollmentDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enrollment Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this enrollment
          </DialogDescription>
        </DialogHeader>
        {enrollment && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Plan Name</Label>
                <p className="font-medium">{enrollment.planId.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Enrollment Type</Label>
                <p className="font-medium capitalize">
                  {enrollment.enrollmentType}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Language</Label>
                <p className="font-medium">{enrollment.language}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium">
                  {enrollment.status === 1 ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Start Date</Label>
                <p className="font-medium">
                  {formatDateForDisplay(enrollment.startDate)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">End Date</Label>
                <p className="font-medium">
                  {formatDateForDisplay(enrollment.endDate)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Purchase Date</Label>
                <p className="font-medium">
                  {formatDateForDisplay(enrollment.purchaseDate)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Monthly Classes</Label>
                <p className="font-medium">{enrollment.monthlyClasses}</p>
              </div>
              {enrollment.planId.weeklyClasses && (
                <div>
                  <Label className="text-muted-foreground">Weekly Classes</Label>
                  <p className="font-medium">
                    {enrollment.planId.weeklyClasses}
                  </p>
                </div>
              )}
              {enrollment.planId.weeks && (
                <div>
                  <Label className="text-muted-foreground">Weeks</Label>
                  <p className="font-medium">{enrollment.planId.weeks}</p>
                </div>
              )}
              {enrollment.scheduledDays && enrollment.scheduledDays.length > 0 && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Scheduled Days</Label>
                  <p className="font-medium">
                    {enrollment.scheduledDays.map((day) => day.day).join(", ")}
                  </p>
                </div>
              )}
              {enrollment.alias && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Alias</Label>
                  <p className="font-medium">{enrollment.alias}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

