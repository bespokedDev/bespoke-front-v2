"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import type { Enrollment, ContentClass, ClassType } from "../types";

interface UseEnrollmentDataReturn {
  enrollment: Enrollment | null;
  contentClasses: ContentClass[];
  classTypes: ClassType[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnrollmentData(enrollmentId: string): UseEnrollmentDataReturn {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [contentClasses, setContentClasses] = useState<ContentClass[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch enrollment detail
  const fetchEnrollmentDetail = useCallback(async () => {
    try {
      const response = await apiClient(`api/enrollments/${enrollmentId}/detail`);
      setEnrollment(response.enrollments?.[0] || response);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load enrollment details."
      );
      setError(errorMessage);
    }
  }, [enrollmentId]);

  // Fetch content classes for objectives
  const fetchContentClasses = useCallback(async () => {
    try {
      const data = await apiClient("api/content-class");
      setContentClasses(data || []);
    } catch (err: unknown) {
      console.error("Error fetching content classes:", err);
    }
  }, []);

  // Fetch class types for registries
  const fetchClassTypes = useCallback(async () => {
    try {
      const data = await apiClient("api/class-types");
      setClassTypes(data || []);
    } catch (err: unknown) {
      console.error("Error fetching class types:", err);
    }
  }, []);

  // Load all initial data
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([
      fetchEnrollmentDetail(),
      fetchContentClasses(),
      fetchClassTypes(),
    ]);
    setIsLoading(false);
  }, [fetchEnrollmentDetail, fetchContentClasses, fetchClassTypes]);

  useEffect(() => {
    if (enrollmentId) {
      refetch();
    }
  }, [enrollmentId, refetch]);

  return {
    enrollment,
    contentClasses,
    classTypes,
    isLoading,
    error,
    refetch,
  };
}

