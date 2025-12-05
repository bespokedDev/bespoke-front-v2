"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { convertToDDMMYYYY } from "@/lib/dateUtils";
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
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);

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
      // Build query parameters with enrollment date range
      const params = new URLSearchParams();
      params.append("enrollmentId", enrollmentId);
      
      // Add date filters using enrollment startDate and endDate
      if (enrollment.startDate) {
        const startDateDDMMYYYY = convertToDDMMYYYY(enrollment.startDate);
        if (startDateDDMMYYYY) {
          params.append("startDate", startDateDDMMYYYY);
        }
      }
      if (enrollment.endDate) {
        const endDateDDMMYYYY = convertToDDMMYYYY(enrollment.endDate);
        if (endDateDDMMYYYY) {
          params.append("endDate", endDateDDMMYYYY);
        }
      }
      console.log("params", params.toString());
      const response = await apiClient(
        `api/class-objectives?${params.toString()}`
      );
      console.log("response objectives", response);
      // Response structure: { message: "...", objectives: Array[], total: number }
      const objectivesData = response.objectives || [];
      setObjectives(objectivesData);
      setHasLoadedFromServer(true);
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

  // Asegurar que siempre haya exactamente 4 objetivos después de cargar los datos
  // Siempre mostrar 4 filas vacías si no hay objetivos del servidor
  useEffect(() => {
    if (!enrollment || contentClasses.length === 0) return;
    
    setObjectives((currentObjectives) => {
      // Contar objetivos reales (que no son temporales)
      const realObjectives = currentObjectives.filter(obj => !obj._id.startsWith("temp-"));
      const tempObjectives = currentObjectives.filter(obj => obj._id.startsWith("temp-"));
      
      // Si ya hay exactamente 4 objetivos, no hacer nada
      if (currentObjectives.length === 4) {
        return currentObjectives;
      }
      
      // Si no hay objetivos o hay menos de 4, asegurar que haya 4
      if (currentObjectives.length < 4) {
        const needed = 4 - currentObjectives.length;
        const additionalObjectives: ClassObjective[] = Array.from({ length: needed }, (_, index) => {
          const categoryIndex = currentObjectives.length + index;
          const category = contentClasses[categoryIndex] || contentClasses[0] || { _id: "", name: "" };
          return {
            _id: `temp-${Date.now()}-${index}-${Math.random()}`,
            enrollmentId: {
              _id: enrollmentId,
              language: enrollment.language || "",
              enrollmentType: enrollment.enrollmentType || "",
            },
            category: {
              _id: category._id,
              name: category.name,
            },
            teachersNote: null,
            objective: "",
            objectiveDate: new Date().toISOString().split("T")[0],
            objectiveAchieved: false,
            isActive: true,
          };
        });
        return [...currentObjectives, ...additionalObjectives];
      }
      
      // Si hay más de 4, tomar solo los primeros 4 (priorizar reales sobre temporales)
      if (currentObjectives.length > 4) {
        const sorted = [...realObjectives, ...tempObjectives].slice(0, 4);
        return sorted;
      }
      
      return currentObjectives;
    });
  }, [objectives.length, enrollment, contentClasses, enrollmentId, hasLoadedFromServer]);

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
      
      // Si es un objetivo temporal (empieza con "temp-"), crear uno nuevo
      if (objectiveId.startsWith("temp-")) {
        await apiClient("api/class-objectives", {
          method: "POST",
          body: JSON.stringify({
            ...data,
            enrollmentId: enrollmentId,
          }),
          skipAutoRedirect: true, // Evitar redirección automática en errores 403 (permisos)
        });
      } else {
        // Actualizar objetivo existente
        await apiClient(`api/class-objectives/${objectiveId}`, {
          method: "PUT",
          body: JSON.stringify(data),
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
  };
}

