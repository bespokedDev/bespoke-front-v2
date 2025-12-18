"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import type { ClassObjective, ContentClass, Enrollment } from "../types";

interface UseObjectivesReturn {
  objectives: ClassObjective[];
  objectiveSuccessMessage: string | null;
  objectiveErrorMessage: string | null;
  savingObjectiveId: string | null;
  editingObjectiveId: string | null;
  initialEditingData: Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>;
  editingDataRef: React.MutableRefObject<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>;
  setEditingObjectiveId: React.Dispatch<React.SetStateAction<string | null>>;
  setInitialEditingData: React.Dispatch<React.SetStateAction<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>>;
  setObjectiveSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setObjectiveErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  fetchObjectives: () => Promise<void>;
  handleUpdateObjective: (objectiveId: string, data: {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string | null;
    objectiveAchieved: boolean;
  }) => Promise<boolean>;
  addNewObjective: () => void;
}

export function useObjectives(
  enrollmentId: string,
  enrollment: Enrollment | null,
  contentClasses: ContentClass[]
): UseObjectivesReturn {
  const [objectives, setObjectives] = useState<ClassObjective[]>([]);
  const [objectiveSuccessMessage, setObjectiveSuccessMessage] = useState<string | null>(null);
  const [objectiveErrorMessage, setObjectiveErrorMessage] = useState<string | null>(null);
  const [savingObjectiveId, setSavingObjectiveId] = useState<string | null>(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [initialEditingData, setInitialEditingData] = useState<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>({});

  const editingDataRef = useRef<Record<string, {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string;
    objectiveAchieved: boolean;
  }>>({});

  // Fetch objectives
  const fetchObjectives = useCallback(async () => {
    if (!enrollment) return; // Wait for enrollment to be loaded
    
    try {
      const params = new URLSearchParams();
      params.append("enrollmentId", enrollmentId);
      console.log("params", params.toString());
      const response = await apiClient(
        `api/class-objectives?${params.toString()}`
      );
      console.log("response objectives", response);
      // Response structure: { message: "...", objectives: Array[], total: number }
      const objectivesData = response.objectives || [];
      setObjectives(objectivesData);
    } catch (err: unknown) {
      console.error("Error fetching objectives:", err);
    }
  }, [enrollmentId, enrollment]);

  // Fetch objectives after enrollment is loaded (needed for date filters)
  useEffect(() => {
    if (enrollment) {
      fetchObjectives();
    }
  }, [enrollment, fetchObjectives]);

  // Auto-ocultar mensajes de éxito después de 5 segundos
  useEffect(() => {
    if (objectiveSuccessMessage) {
      const timer = setTimeout(() => {
        setObjectiveSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [objectiveSuccessMessage]);

  // Validate objective data before saving
  const validateObjectiveData = (data: {
    category: string;
    objective: string;
    objectiveDate: string;
  }): string | null => {
    if (!data.category || data.category.trim() === "") {
      return "Category is required";
    }
    if (!data.objective || data.objective.trim() === "") {
      return "Objective is required";
    }
    if (!data.objectiveDate || data.objectiveDate.trim() === "") {
      return "Objective date is required";
    }
    return null;
  };

  // Update objective
  const handleUpdateObjective = useCallback(async (objectiveId: string, data: {
    category: string;
    objective: string;
    objectiveDate: string;
    teachersNote: string | null;
    objectiveAchieved: boolean;
  }) => {
    // Validate required fields
    const validationError = validateObjectiveData(data);
    if (validationError) {
      setObjectiveErrorMessage(validationError);
      return false;
    }

    try {
      setSavingObjectiveId(objectiveId);
      setObjectiveErrorMessage(null);

      // Asegurar que la fecha se envía en formato ISO, como espera el backend
      // data.objectiveDate viene del <input type="date"> en formato YYYY-MM-DD
      let objectiveDate = data.objectiveDate;
      // Si no incluye "T", asumimos que es YYYY-MM-DD y le agregamos hora UTC
      if (objectiveDate && !objectiveDate.includes("T")) {
        objectiveDate = `${objectiveDate}T00:00:00.000Z`;
      }
      const payload = {
        ...data,
        objectiveDate,
      };
      
      // Si es un objetivo temporal (empieza con "temp-"), crear uno nuevo
      if (objectiveId.startsWith("temp-")) {
        await apiClient("api/class-objectives", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            enrollmentId: enrollmentId,
          }),
          skipAutoRedirect: true, // Evitar redirección automática en errores 403 (permisos)
        });
      } else {
        // Actualizar objetivo existente
        await apiClient(`api/class-objectives/${objectiveId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          skipAutoRedirect: true, // Evitar redirección automática en errores 403 (permisos)
        });
      }
      
      await fetchObjectives();
      setObjectiveSuccessMessage("Objective saved successfully");
      return true;
    } catch (err: unknown) {
      // Detectar errores de permisos (403 Forbidden o 401 Unauthorized)
      const errorObj = err as Error & { statusCode?: number; apiMessage?: string };
      let errorMessage: string;
      
      // Verificar si el mensaje contiene "Unauthorized" o si el statusCode es 401/403
      const errorMessageText = errorObj.message || errorObj.apiMessage || "";
      if (
        errorObj.statusCode === 403 || 
        errorObj.statusCode === 401 || 
        errorMessageText.includes("Unauthorized") ||
        errorMessageText.includes("Forbidden")
      ) {
        errorMessage = "You don't have permission to save objectives. Please contact an administrator.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error saving objective. Please try again."
        );
      }
      
      setObjectiveErrorMessage(errorMessage);
      return false;
    } finally {
      setSavingObjectiveId(null);
    }
  }, [enrollmentId, fetchObjectives]);
  // Crear un nuevo objetivo temporal en blanco y ponerlo en modo edición
  const addNewObjective = useCallback(() => {
    if (!enrollment || contentClasses.length === 0) return;

    const defaultCategory = contentClasses[0];
    const today = new Date().toISOString().split("T")[0];
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const newObjective: ClassObjective = {
      _id: tempId,
      enrollmentId: {
        _id: enrollmentId,
        language: enrollment.language || "",
        enrollmentType: enrollment.enrollmentType || "",
      },
      category: {
        _id: defaultCategory._id,
        name: defaultCategory.name,
      },
      teachersNote: null,
      objective: "",
      objectiveDate: today,
      objectiveAchieved: false,
      isActive: true,
    };

    setObjectives((prev) => [...prev, newObjective]);

    const initialData = {
      category: defaultCategory._id,
      objective: "",
      objectiveDate: today,
      teachersNote: "",
      objectiveAchieved: false,
    };

    editingDataRef.current[tempId] = { ...initialData };
    setInitialEditingData((prev) => ({
      ...prev,
      [tempId]: initialData,
    }));
    setEditingObjectiveId(tempId);
  }, [contentClasses, enrollment, enrollmentId]);

  return {
    objectives,
    objectiveSuccessMessage,
    objectiveErrorMessage,
    savingObjectiveId,
    editingObjectiveId,
    initialEditingData,
    editingDataRef,
    setEditingObjectiveId,
    setInitialEditingData,
    setObjectiveSuccessMessage,
    setObjectiveErrorMessage,
    fetchObjectives,
    handleUpdateObjective,
    addNewObjective,
  };
}

