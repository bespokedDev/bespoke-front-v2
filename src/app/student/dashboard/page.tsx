"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StudentInfo {
  student: {
    id: string;
    name: string;
    email: string;
    studentCode: string;
  };
  totalAvailableBalance: number;
  enrollmentDetails: Array<{
    enrollmentId: string;
    planName: string;
    amount: number;
    rescheduleHours: number;
    enrollmentType: string;
    startDate: string;
    endDate: string;
    status: number;
  }>;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentInfo = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient(`api/students/info/${user.id}`);
      const data: StudentInfo = {
        student: response.student,
        totalAvailableBalance: response.totalAvailableBalance,
        enrollmentDetails: response.enrollmentDetails || [],
      };
      console.log("data: ", data);
      setStudentInfo(data);
    } catch (err: unknown) {
      console.error("Error fetching student info:", err);
      const error = err as Error & { statusCode?: number; apiMessage?: string };
      
      if (error.statusCode === 404) {
        setError(
          "Student information not found. Please contact support."
        );
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load student information. Please try again."
        );
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStudentInfo();
  }, [fetchStudentInfo]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !studentInfo) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Student information not found"}</span>
        </div>
      </div>
    );
  }

  const activeEnrollments = studentInfo.enrollmentDetails.filter(
    (e) => e.status === 1
  );
  const totalRescheduleHours = activeEnrollments.reduce(
    (acc, e) => acc + e.rescheduleHours,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <WelcomeBanner userName={studentInfo.student.name} fallbackName="Student" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">
              ${studentInfo.totalAvailableBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <SummaryCard
          title="Active Enrollments"
          count={activeEnrollments.length}
          color="primary"
        />
        <SummaryCard
          title="Reschedule Hours"
          count={totalRescheduleHours}
          color="accent-1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Active Enrollments
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/student/profile?tab=enrollments">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeEnrollments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No active enrollments found.
              </p>
            ) : (
              <div className="space-y-3">
                {activeEnrollments.slice(0, 3).map((enrollment) => (
                  <div
                    key={enrollment.enrollmentId}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="font-semibold break-words">
                        {enrollment.planName}
                      </Label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span className="break-words">
                            {formatDateForDisplay(enrollment.startDate)} /{" "}
                            {formatDateForDisplay(enrollment.endDate)}
                          </span>
                        </div>
                        <span className="capitalize">
                          {enrollment.enrollmentType}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-sm font-semibold text-secondary">
                        ${enrollment.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Button asChild>
                <Link href="/student/profile">View Profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/student/profile?tab=balance">View Balance</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/student/profile?tab=enrollments">
                  View Enrollments
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

