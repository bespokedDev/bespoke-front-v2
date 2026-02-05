"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  User,
  DollarSign,
  BookOpen,
  Calendar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { StudentInfo } from "@/app/students/[id]/types";

interface Note {
  _id?: string;
  date: string;
  text: string;
}

interface Student {
  _id: string;
  studentCode: string;
  name: string;
  dob: string;
  gender: string;
  representativeName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  status: number;
  isActive: boolean;
  notes: Note[];
  createdAt: string;
  updatedAt?: string;
  disenrollmentReason?: string | null;
}

export default function StudentProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "profile");
  const [student, setStudent] = useState<Student | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actualizar el tab activo cuando cambie el query parameter
  useEffect(() => {
    if (tabParam && ["profile", "balance", "enrollments"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchStudent = useCallback(async () => {
    if (!user?.id) {
      setError("User ID not found. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Fetch student data from /api/students/:id
      const studentData = await apiClient(`api/students/${user.id}`);
      setStudent(studentData);

      // Also fetch student info for balance and enrollments
      try {
        const infoResponse = await apiClient(`api/students/info/${user.id}`);
        const data: StudentInfo = {
          student: infoResponse.student,
          totalAvailableBalance: infoResponse.totalAvailableBalance,
          totalBalancePerClass: infoResponse.totalBalancePerClass,
          totalAmount: infoResponse.totalAmount,
          enrollmentDetails: infoResponse.enrollmentDetails || [],
          rescheduleTime: infoResponse.rescheduleTime,
          rescheduleClasses: infoResponse.rescheduleClasses,
          viewedClasses: infoResponse.viewedClasses,
          pendingClasses: infoResponse.pendingClasses,
          lostClasses: infoResponse.lostClasses,
          noShowClasses: infoResponse.noShowClasses,
          classLostClasses: infoResponse.classLostClasses,
          enrollmentStatistics: infoResponse.enrollmentStatistics,
          incomeHistory: infoResponse.incomeHistory,
        };
        console.log("studentInfoData", data);
        setStudentInfo(data);
      } catch (infoErr) {
        // If info endpoint fails, we can still show student profile
        console.warn("Could not fetch student info:", infoErr);
      }
    } catch (err: unknown) {
      console.error("Error fetching student:", err);
      const error = err as Error & { statusCode?: number; apiMessage?: string };

      // Si es un 404, el endpoint o el ID no existe
      if (error.statusCode === 404) {
        setError("Student information not found. Please contact support.");
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
    // Solo hacer fetch si el usuario está autenticado y es estudiante
    if (!isAuthLoading && user?.id && user?.role?.toLowerCase() === "student") {
      fetchStudent();
    } else if (
      !isAuthLoading &&
      (!user || user?.role?.toLowerCase() !== "student")
    ) {
      setError("You must be logged in as a student to view your profile.");
      setIsLoading(false);
    }
  }, [user, isAuthLoading, fetchStudent]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive dark:text-destructive-foreground px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Student information not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">
            {student.studentCode} • {student.email}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Balance
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Enrollments
          </TabsTrigger>
        </TabsList>

        {/* Balance Tab */}
        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentInfo ? (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-secondary/10 rounded-lg">
                    <Label className="text-sm text-muted-foreground">
                      Total Available Balance
                    </Label>
                    <p className="text-4xl font-bold text-secondary mt-2">
                      ${studentInfo.totalAvailableBalance.toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Balance by Enrollment
                    </h3>
                    {studentInfo.enrollmentDetails.length === 0 ? (
                      <p className="text-muted-foreground">
                        No active enrollments found.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {studentInfo.enrollmentDetails.map((enrollment) => (
                          <Card key={enrollment.enrollmentId}>
                            <CardContent>
                              <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <Label className="font-semibold">
                                      {enrollment.planName}
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span>
                                        {formatDateForDisplay(
                                          enrollment.startDate
                                        )}{" "}
                                        -{" "}
                                        {formatDateForDisplay(
                                          enrollment.endDate
                                        )}
                                      </span>
                                    </div>
                                    <span className="capitalize">
                                      {enrollment.enrollmentType}
                                    </span>
                                  </div>
                                  {enrollment.rescheduleHours > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      Reschedule hours available:{" "}
                                      {enrollment.rescheduleHours}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Label className="text-sm text-muted-foreground">
                                    Available Balance
                                  </Label>
                                  <p className="text-2xl font-bold text-secondary">
                                    ${enrollment.amount.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Balance information not available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Active Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentInfo && studentInfo.enrollmentDetails.length > 0 ? (
                <div className="space-y-4">
                  {studentInfo.enrollmentDetails.map((enrollment) => (
                    <Card key={enrollment.enrollmentId}>
                      <CardContent className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-semibold">Plan</Label>
                              <p className="text-sm">{enrollment.planName}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">Type</Label>
                              <p className="text-sm capitalize">
                                {enrollment.enrollmentType}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">Start Date</Label>
                              <p className="text-sm flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDateForDisplay(enrollment.startDate)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">End Date</Label>
                              <p className="text-sm flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDateForDisplay(enrollment.endDate)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">
                                Available Balance
                              </Label>
                              <p className="text-sm font-semibold text-secondary">
                                ${enrollment.amount.toFixed(2)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">
                                Reschedule Hours Available
                              </Label>
                              <p className="text-sm">
                                {enrollment.rescheduleHours} hours
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end md:justify-start md:items-start pt-2 md:pt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/student/class-registry/${enrollment.enrollmentId}`
                                )
                              }
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Class Records
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {studentInfo
                    ? "No active enrollments found."
                    : "Enrollment information not available."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold">Name</Label>
                    <p className="text-sm">{student.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Email</Label>
                    <p className="text-sm">{student.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Phone</Label>
                    <p className="text-sm">{student.phone}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Date of Birth</Label>
                    <p className="text-sm">
                      {student.dob ? formatDateForDisplay(student.dob) : "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Gender</Label>
                    <p className="text-sm capitalize">{student.gender}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Occupation</Label>
                    <p className="text-sm">{student.occupation || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Status</Label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        student.isActive
                          ? "bg-secondary/20 text-secondary"
                          : "bg-accent-1/20 text-accent-1"
                      }`}
                    >
                      {student.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {student.representativeName && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Representative Name</Label>
                    <p className="text-sm">{student.representativeName}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-semibold">Address</Label>
                  <p className="text-sm">
                    {student.address}, {student.city}, {student.country}
                  </p>
                </div>

                {student.disenrollmentReason && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-accent-1">
                      Disenrollment Reason
                    </Label>
                    <p className="text-sm">{student.disenrollmentReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
