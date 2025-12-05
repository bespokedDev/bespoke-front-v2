"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { dateStringToISO } from "@/lib/dateUtils";
import type { ClassRegistry } from "../types";

interface UseClassRegistriesReturn {
  classRegistries: ClassRegistry[];
  editingRegistryData: Record<string, {
    minutesViewed: string;
    classType: string[];
    contentType: string[];
    vocabularyContent: string;
    studentMood: string;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string;
    reschedule: number;
    classViewed: number;
  }>;
  registrySuccessMessage: string | null;
  registryErrorMessage: string | null;
  savingAllRegistries: boolean;
  rescheduleRegistryId: string | null;
  rescheduleDate: string;
  isCreatingReschedule: boolean;
  openPopovers: Record<string, { classType: boolean; contentType: boolean }>;
  editingNoteRegistryId: string | null;
  noteModalData: {
    content: string;
    visible: {
      admin: boolean;
      student: boolean;
      professor: boolean;
    };
  };
  editingRegistryDataRef: React.MutableRefObject<Record<string, {
    minutesViewed: string;
    classType: string[];
    contentType: string[];
    vocabularyContent: string;
    studentMood: string;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string;
    reschedule: number;
    classViewed: number;
  }>>;
  setEditingRegistryData: React.Dispatch<React.SetStateAction<Record<string, {
    minutesViewed: string;
    classType: string[];
    contentType: string[];
    vocabularyContent: string;
    studentMood: string;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string;
    reschedule: number;
    classViewed: number;
  }>>>;
  setRegistrySuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setRegistryErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setRescheduleRegistryId: React.Dispatch<React.SetStateAction<string | null>>;
  setRescheduleDate: React.Dispatch<React.SetStateAction<string>>;
  setOpenPopovers: React.Dispatch<React.SetStateAction<Record<string, { classType: boolean; contentType: boolean }>>>;
  setEditingNoteRegistryId: React.Dispatch<React.SetStateAction<string | null>>;
  setNoteModalData: React.Dispatch<React.SetStateAction<{
    content: string;
    visible: {
      admin: boolean;
      student: boolean;
      professor: boolean;
    };
  }>>;
  fetchClassRegistries: () => Promise<void>;
  handleUpdateRegistry: (registryId: string, data: {
    minutesViewed: number | null;
    classType: string[];
    contentType: string[];
    vocabularyContent: string | null;
    studentMood: string | null;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string | null;
    classViewed?: number;
  }) => Promise<void>;
  handleSaveAllRegistries: () => Promise<void>;
  handleCreateReschedule: (registryId: string, classDate: string) => Promise<void>;
  updateEvaluationCache: () => void;
}

export function useClassRegistries(
  enrollmentId: string
): UseClassRegistriesReturn {
  const [classRegistries, setClassRegistries] = useState<ClassRegistry[]>([]);
  const [editingRegistryData, setEditingRegistryData] = useState<Record<string, {
    minutesViewed: string;
    classType: string[];
    contentType: string[];
    vocabularyContent: string;
    studentMood: string;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string;
    reschedule: number;
    classViewed: number;
  }>>({});
  const [registrySuccessMessage, setRegistrySuccessMessage] = useState<string | null>(null);
  const [registryErrorMessage, setRegistryErrorMessage] = useState<string | null>(null);
  const [savingAllRegistries, setSavingAllRegistries] = useState(false);
  const [rescheduleRegistryId, setRescheduleRegistryId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [isCreatingReschedule, setIsCreatingReschedule] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<string, { classType: boolean; contentType: boolean }>>({});
  const [editingNoteRegistryId, setEditingNoteRegistryId] = useState<string | null>(null);
  const [noteModalData, setNoteModalData] = useState<{
    content: string;
    visible: {
      admin: boolean;
      student: boolean;
      professor: boolean;
    };
  }>({
    content: "",
    visible: {
      admin: true,
      student: false,
      professor: true,
    },
  });

  const editingRegistryDataRef = useRef<Record<string, {
    minutesViewed: string;
    classType: string[];
    contentType: string[];
    vocabularyContent: string;
    studentMood: string;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string;
    reschedule: number;
    classViewed: number;
  }>>({});

  // Fetch class registries
  const fetchClassRegistries = useCallback(async () => {
    try {
      const response = await apiClient(
        `api/class-registry?enrollmentId=${enrollmentId}`
      );
      const registries = response.classes || [];
      setClassRegistries(registries);
      
      // Update evaluation cache from the evaluations that come in the response
      const newCache: Record<string, boolean> = {};
      registries.forEach((registry: ClassRegistry) => {
        const hasEvaluation = !!(registry.evaluations && registry.evaluations.length > 0);
        newCache[registry._id] = hasEvaluation;
      });
    } catch (err: unknown) {
      console.error("Error fetching class registries:", err);
    }
  }, [enrollmentId]);

  // Inicializar editingRegistryData y ref cuando se cargan los registros
  useEffect(() => {
    if (classRegistries.length === 0) return;
    
    const initialData: Record<string, {
      minutesViewed: string;
      classType: string[];
      contentType: string[];
      vocabularyContent: string;
      studentMood: string;
      note: {
        content: string | null;
        visible: {
          admin: number;
          student: number;
          professor: number;
        };
      } | null;
      homework: string;
      reschedule: number;
      classViewed: number;
    }> = {};
    
    classRegistries.forEach((registry) => {
      const registryData = {
        minutesViewed: registry.minutesViewed?.toString() || "",
        classType: registry.classType.map((t) => t._id),
        contentType: registry.contentType.map((t) => t._id),
        vocabularyContent: registry.vocabularyContent || "",
        studentMood: registry.studentMood || "",
        note: registry.note || null,
        homework: registry.homework || "",
        reschedule: registry.reschedule,
        classViewed: registry.classViewed,
      };
      
      initialData[registry._id] = registryData;
      // También inicializar el ref
      editingRegistryDataRef.current[registry._id] = registryData;
    });
    
    setEditingRegistryData(initialData);
  }, [classRegistries]);

  // Auto-ocultar mensajes de éxito de registros después de 5 segundos
  useEffect(() => {
    if (registrySuccessMessage) {
      const timer = setTimeout(() => {
        setRegistrySuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [registrySuccessMessage]);

  // Update class registry (versión interna sin fetch automático)
  const updateRegistryInternal = async (registryId: string, data: {
    minutesViewed: number | null;
    classType: string[];
    contentType: string[];
    vocabularyContent: string | null;
    studentMood: string | null;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string | null;
    classViewed?: number;
  }) => {
    await apiClient(`api/class-registry/${registryId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      skipAutoRedirect: true,
    });
  };

  // Update class registry (para uso individual como en el modal de notas)
  const handleUpdateRegistry = useCallback(async (registryId: string, data: {
    minutesViewed: number | null;
    classType: string[];
    contentType: string[];
    vocabularyContent: string | null;
    studentMood: string | null;
    note: {
      content: string | null;
      visible: {
        admin: number;
        student: number;
        professor: number;
      };
    } | null;
    homework: string | null;
    classViewed?: number;
  }) => {
    try {
      await apiClient(`api/class-registry/${registryId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        skipAutoRedirect: true,
      });
      
      // Actualizar el estado local
      setEditingRegistryData((prev) => ({
        ...prev,
        [registryId]: {
          minutesViewed: data.minutesViewed?.toString() || "",
          classType: data.classType,
          contentType: data.contentType,
          vocabularyContent: data.vocabularyContent || "",
          studentMood: data.studentMood || "",
          note: data.note,
          homework: data.homework || "",
          reschedule: prev[registryId]?.reschedule ?? 0,
          classViewed: data.classViewed ?? prev[registryId]?.classViewed ?? 0,
        },
      }));
      
      await fetchClassRegistries();
    } catch (err: unknown) {
      const errorObj = err as Error & { statusCode?: number; apiMessage?: string };
      const errorMessageText = errorObj.message || errorObj.apiMessage || "";
      
      let errorMessage: string;
      if (
        errorObj.statusCode === 403 || 
        errorObj.statusCode === 401 || 
        errorMessageText.includes("Unauthorized") ||
        errorMessageText.includes("Forbidden")
      ) {
        errorMessage = "No tienes permisos para actualizar este registro de clase. Por favor, contacta a un administrador.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error al actualizar el registro de clase. Por favor, intenta nuevamente."
        );
      }
      
      alert(errorMessage);
      throw err;
    }
  }, [fetchClassRegistries]);

  // Guardar todos los registros modificados
  const handleSaveAllRegistries = useCallback(async () => {
    if (classRegistries.length === 0) return;
    
    setSavingAllRegistries(true);
    setRegistryErrorMessage(null);
    setRegistrySuccessMessage(null);
    
    try {
      const promises: Promise<void>[] = [];
      const errors: Array<{ registryId: string; error: string }> = [];
      
      // Guardar todos los registros que están en editingRegistryDataRef
      for (const registryId of Object.keys(editingRegistryDataRef.current)) {
        const editData = editingRegistryDataRef.current[registryId];
        const registry = classRegistries.find(r => r._id === registryId);
        
        if (!registry || !editData) continue;
        
        promises.push(
          updateRegistryInternal(registryId, {
            minutesViewed: editData.minutesViewed === "" ? null : Number(editData.minutesViewed),
            classType: editData.classType,
            contentType: editData.contentType,
            vocabularyContent: editData.vocabularyContent || null,
            studentMood: editData.studentMood || null,
            note: editData.note,
            homework: editData.homework || null,
            classViewed: editData.classViewed,
          }).catch((err: unknown) => {
            const errorObj = err as Error & { statusCode?: number; apiMessage?: string };
            const errorMessageText = errorObj.message || errorObj.apiMessage || "";
            errors.push({
              registryId,
              error: errorMessageText || "Error desconocido",
            });
          })
        );
      }
      
      await Promise.all(promises);
      
      // Si hay errores, mostrar el mensaje de error
      if (errors.length > 0) {
        const firstError = errors[0].error;
        let errorMessage: string;
        
        // Intentar extraer el mensaje de error
        if (typeof firstError === "string") {
          if (firstError.includes("Unauthorized") || firstError.includes("Forbidden")) {
            errorMessage = "No tienes permisos para actualizar los registros de clase. Por favor, contacta a un administrador.";
          } else {
            errorMessage = errors.length === 1
              ? `Error al guardar el registro: ${firstError}`
              : `Error al guardar ${errors.length} registros. Por favor, intenta nuevamente.`;
          }
        } else {
          const errorObj = firstError as Error & { statusCode?: number; apiMessage?: string };
          const errorMessageText = errorObj.message || errorObj.apiMessage || "";
          
          if (
            errorObj.statusCode === 403 || 
            errorObj.statusCode === 401 || 
            errorMessageText.includes("Unauthorized") ||
            errorMessageText.includes("Forbidden")
          ) {
            errorMessage = "No tienes permisos para actualizar los registros de clase. Por favor, contacta a un administrador.";
          } else {
            errorMessage = errors.length === 1
              ? `Error al guardar el registro: ${errorMessageText}`
              : `Error al guardar ${errors.length} registros. Por favor, intenta nuevamente.`;
          }
        }
        
        setRegistryErrorMessage(errorMessage);
      } else {
        // Recargar los datos después de guardar exitosamente
        await fetchClassRegistries();
        setRegistrySuccessMessage("Registros de clase guardados exitosamente");
      }
    } catch (err: unknown) {
      const errorObj = err as Error & { statusCode?: number; apiMessage?: string };
      const errorMessageText = errorObj.message || errorObj.apiMessage || "";
      
      let errorMessage: string;
      if (
        errorObj.statusCode === 403 || 
        errorObj.statusCode === 401 || 
        errorMessageText.includes("Unauthorized") ||
        errorMessageText.includes("Forbidden")
      ) {
        errorMessage = "No tienes permisos para actualizar los registros de clase. Por favor, contacta a un administrador.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error al guardar los registros de clase. Por favor, intenta nuevamente."
        );
      }
      
      setRegistryErrorMessage(errorMessage);
    } finally {
      setSavingAllRegistries(false);
    }
  }, [classRegistries, fetchClassRegistries]);

  // Create reschedule
  const handleCreateReschedule = useCallback(async (registryId: string, classDate: string) => {
    setIsCreatingReschedule(true);
    try {
      await apiClient(`api/class-registry/${registryId}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          classDate: dateStringToISO(classDate),
        }),
        skipAutoRedirect: true,
      });
      
      await fetchClassRegistries();
      setRescheduleRegistryId(null);
      setRescheduleDate("");
      setRegistrySuccessMessage("Reschedule created successfully");
    } catch (err: unknown) {
      const errorObj = err as Error & { statusCode?: number; apiMessage?: string };
      const errorMessageText = errorObj.message || errorObj.apiMessage || "";
      
      let errorMessage: string;
      if (
        errorObj.statusCode === 403 || 
        errorObj.statusCode === 401 || 
        errorMessageText.includes("Unauthorized") ||
        errorMessageText.includes("Forbidden")
      ) {
        errorMessage = "You don't have permission to create reschedules. Please contact an administrator.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error creating reschedule. Please try again."
        );
      }
      
      setRegistryErrorMessage(errorMessage);
    } finally {
      setIsCreatingReschedule(false);
    }
  }, [fetchClassRegistries]);

  const updateEvaluationCache = useCallback(() => {
    // This function is kept for API compatibility but is no longer needed
    // The evaluation cache is now managed directly in useEvaluations hook
  }, []);

  return {
    classRegistries,
    editingRegistryData,
    registrySuccessMessage,
    registryErrorMessage,
    savingAllRegistries,
    rescheduleRegistryId,
    rescheduleDate,
    isCreatingReschedule,
    openPopovers,
    editingNoteRegistryId,
    noteModalData,
    editingRegistryDataRef,
    setEditingRegistryData,
    setRegistrySuccessMessage,
    setRegistryErrorMessage,
    setRescheduleRegistryId,
    setRescheduleDate,
    setOpenPopovers,
    setEditingNoteRegistryId,
    setNoteModalData,
    fetchClassRegistries,
    handleUpdateRegistry,
    handleSaveAllRegistries,
    handleCreateReschedule,
    updateEvaluationCache,
  };
}

