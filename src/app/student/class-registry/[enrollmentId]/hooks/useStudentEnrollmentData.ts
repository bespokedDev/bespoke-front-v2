"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";
import type { Enrollment } from "@/app/professor/class-registry/[enrollmentId]/types";

interface UseStudentEnrollmentDataReturn {
  enrollment: Enrollment | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStudentEnrollmentData(enrollmentId: string): UseStudentEnrollmentDataReturn {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch enrollment data using the student-specific endpoint
  const fetchEnrollmentData = useCallback(async () => {
    if (!user?.id) {
      setError("User ID not found.");
      setIsLoading(false);
      return;
    }

    try {
      // Usar el endpoint específico para estudiantes que retorna el enrollment completo
      const response = await apiClient(
        `api/students/${user.id}/enrollment/${enrollmentId}`
      );
      
      // El endpoint retorna { enrollment, classes, statistics }
      // El enrollment ya viene completo con toda la información necesaria
      if (response.enrollment) {
        setEnrollment(response.enrollment);
      } else {
        setError("Enrollment not found or you don't have access to it.");
      }
    } catch (err: unknown) {
      const errorInfo = err as Error & { statusCode?: number };
      if (errorInfo.statusCode === 401 || errorInfo.statusCode === 403) {
        setError("You don't have permission to access this enrollment.");
      } else if (errorInfo.statusCode === 404) {
        setError("Enrollment not found or you don't have access to it.");
      } else {
        const errorMessage = getFriendlyErrorMessage(
          err,
          "Failed to load enrollment details."
        );
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId, user?.id]);

  // Load initial data
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await fetchEnrollmentData();
  }, [fetchEnrollmentData]);

  useEffect(() => {
    if (enrollmentId && user?.id) {
      refetch();
    }
  }, [enrollmentId, user?.id, refetch]);

  return {
    enrollment,
    isLoading,
    error,
    refetch,
  };
}

