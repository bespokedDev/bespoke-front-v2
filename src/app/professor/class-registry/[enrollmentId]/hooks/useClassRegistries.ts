"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { extractDatePart, formatDateForDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";
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
    classTime: string;
    classDate?: string;
  }>;
  registrySuccessMessage: string | null;
  registryErrorMessage: string | null;
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
    classTime: string;
    classDate?: string;
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
    classTime: string;
    classDate?: string;
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
    classTime: string | null;
    classViewed?: number;
  }) => Promise<void>;
  handleCreateReschedule: (registryId: string, classDate: string) => Promise<void>;
  updateEvaluationCache: () => void;
}

export function useClassRegistries(
  enrollmentId: string,
  periodMode: "current" | "all" | "objectives-history" = "current",
  startDate?: string,
  endDate?: string
): UseClassRegistriesReturn {
  const { user } = useAuth();
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
    classTime: string;
  }>>({});
  const [registrySuccessMessage, setRegistrySuccessMessage] = useState<string | null>(null);
  const [registryErrorMessage, setRegistryErrorMessage] = useState<string | null>(null);
  const [rescheduleRegistryId, setRescheduleRegistryIdState] = useState<string | null>(null);
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
    classTime: string;
    classDate?: string;
  }>>({});

  // Ref para rastrear estados que deben preservarse después de crear reschedule
  const preservedStatesRef = useRef<Record<string, {
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
    classTime: string;
    classDate?: string;
  }>>({});

  // Wrapper para setRescheduleRegistryId que guarda el estado cuando se abre el diálogo
  const setRescheduleRegistryId = useCallback((registryId: string | null | ((prev: string | null) => string | null)) => {
    if (typeof registryId === "function") {
      // Si es una función, obtener el valor actual primero
      setRescheduleRegistryIdState((prev) => {
        const newValue = registryId(prev);
        // Si se está abriendo el diálogo (newValue no es null y prev era null), guardar el estado
        if (newValue !== null && prev === null) {
          const currentState = editingRegistryDataRef.current[newValue] || editingRegistryData[newValue];
          if (currentState) {
            preservedStatesRef.current[newValue] = currentState;
          }
        }
        return newValue;
      });
    } else {
      // Si es un valor directo
      if (registryId !== null) {
        // Se está abriendo el diálogo, guardar el estado actual del registro
        const currentState = editingRegistryDataRef.current[registryId] || editingRegistryData[registryId];
        if (currentState) {
          preservedStatesRef.current[registryId] = currentState;
        }
      }
      setRescheduleRegistryIdState(registryId);
    }
  }, [editingRegistryData, editingRegistryDataRef]);

  // Fetch class registries
  const fetchClassRegistries = useCallback(async () => {
    // Skip fetching if mode is "objectives-history" (only show objectives history)
    if (periodMode === "objectives-history") {
      return;
    }
    
    try {
      let response;
      if (periodMode === "current" && startDate && endDate) {
        // Use range endpoint for current period
        const fromDate = extractDatePart(startDate);
        const toDate = extractDatePart(endDate);
        response = await apiClient(
          `api/class-registry/range?enrollmentId=${enrollmentId}&from=${fromDate}&to=${toDate}`
        );
      } else if (periodMode === "all") {
        // Use regular endpoint for all history
        response = await apiClient(
        `api/class-registry?enrollmentId=${enrollmentId}`
      );
      }
      
      if (!response) {
        return;
      }
      
      console.log("response class registries", response);
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
  }, [enrollmentId, periodMode, startDate, endDate]);

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
      classTime: string;
      classDate?: string;
    }> = {};
    
    classRegistries.forEach((registry) => {
      // Si hay un estado preservado para este registro, usarlo en lugar del valor por defecto
      const preservedState = preservedStatesRef.current[registry._id];
      
      if (preservedState) {
        // Usar el estado preservado
        initialData[registry._id] = preservedState;
        editingRegistryDataRef.current[registry._id] = preservedState;
        // Limpiar el estado preservado después de usarlo
        delete preservedStatesRef.current[registry._id];
      } else {
        // Inicializar con valores por defecto del registro
        const isReschedule = registry.originalClassId !== null && registry.originalClassId !== undefined;
        const registryData: {
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
          classTime: string;
          classDate?: string;
        } = {
          minutesViewed: registry.minutesViewed?.toString() || "",
          classType: registry.classType.map((t) => t._id),
          contentType: registry.contentType.map((t) => t._id),
          vocabularyContent: registry.vocabularyContent || "",
          studentMood: registry.studentMood || "",
          note: registry.note || null,
          homework: registry.homework || "",
          reschedule: registry.reschedule,
          classViewed: registry.classViewed,
          classTime: registry.classTime || "",
        };
        
        // Solo agregar classDate para reschedules
        if (isReschedule) {
          registryData.classDate = extractDatePart(registry.classDate);
        }
        
        initialData[registry._id] = registryData;
        // También inicializar el ref
        editingRegistryDataRef.current[registry._id] = registryData;
      }
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
    classTime: string | null;
    classViewed?: number;
    classDate?: string;
  }) => {
    try {
      // Obtener professorId o userId según el rol del usuario
      const userRole = user?.role?.toLowerCase();
      const professorId = userRole === "professor" ? user?.id : undefined;
      const userId = userRole === "admin" ? user?.id : undefined;

      // Validar que al menos uno de los campos esté presente
      if (!professorId && !userId) {
        throw new Error("No se puede guardar el registro de clase: se requiere un profesor o un administrador.");
      }

      // Preparar el payload
      const payload: {
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
        classTime: string | null;
        classViewed?: number;
        classDate?: string;
        professorId?: string;
        userId?: string;
      } = {
        minutesViewed: data.minutesViewed,
        classType: data.classType,
        contentType: data.contentType,
        vocabularyContent: data.vocabularyContent,
        studentMood: data.studentMood,
        note: data.note,
        homework: data.homework,
        classTime: data.classTime,
      };
      
      if (data.classViewed !== undefined) {
        payload.classViewed = data.classViewed;
      }
      
      // Si hay classDate, asegurar formato YYYY-MM-DD para el backend
      if (data.classDate) {
        // Asegurar que esté en formato YYYY-MM-DD (convertir de YYYY/MM/DD si es necesario)
        payload.classDate = data.classDate.replace(/\//g, "-");
      }

      // Agregar professorId o userId según corresponda
      if (professorId) {
        payload.professorId = professorId;
      }
      if (userId) {
        payload.userId = userId;
      }
      
      await apiClient(`api/class-registry/${registryId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        skipAutoRedirect: true,
      });
      
      // Refrescar los datos desde el servidor primero
      await fetchClassRegistries();
      
      // Limpiar mensajes de error previos y mostrar mensaje de éxito con alert
      setRegistryErrorMessage(null);
      window.alert("Class registry saved successfully");
      
      // El useEffect (líneas 208-274) reinicializará editingRegistryData con los valores actualizados del servidor
      // incluyendo el nuevo classViewed, lo que hará que los campos dejen de ser editables
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
  }, [fetchClassRegistries, user]);

  // Create reschedule
  const handleCreateReschedule = useCallback(async (registryId: string, classDate: string) => {
    setIsCreatingReschedule(true);
    
    // Validar que la fecha no sea anterior a la fecha actual
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    const selectedDate = new Date(classDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setIsCreatingReschedule(false);
      window.alert(
        "The reschedule date cannot be before today's date. Please select today's date or a future date."
      );
      return;
    }

    // Obtener la información de la clase original para validaciones
    const originalRegistry = classRegistries.find(r => r._id === registryId);
    
    // Validar si la clase tiene más de 50 minutos y está guardada
    if (originalRegistry) {
      const minutesViewed = originalRegistry.minutesViewed ?? 0;
      const isSaved = originalRegistry.classViewed !== 0 && 
                     originalRegistry.classViewed !== null && 
                     originalRegistry.classViewed !== undefined;
      
      if (minutesViewed > 50 && isSaved) {
        setIsCreatingReschedule(false);
        window.alert(
          "You cannot create a reschedule for a class that has more than 50 minutes and is already saved."
        );
        return;
      }
    }

    // Obtener professorId o userId según el rol del usuario
    const userRole = user?.role?.toLowerCase();
    const professorId = userRole === "professor" ? user?.id : undefined;
    const userId = userRole === "admin" ? user?.id : undefined;

    // Validar que al menos uno de los campos esté presente
    if (!professorId && !userId) {
      setIsCreatingReschedule(false);
      window.alert("No se puede crear el reschedule: se requiere un profesor o un administrador.");
      return;
    }
    
    // El estado ya debería estar guardado cuando se abrió el diálogo (en setRescheduleRegistryId)
    // Si no está guardado, intentar obtenerlo ahora como fallback
    const savedState = preservedStatesRef.current[registryId] || editingRegistryDataRef.current[registryId] || editingRegistryData[registryId];
    
    // Obtener la fecha original para el mensaje
    const originalDate = originalRegistry?.classDate;
    
    try {
      // Preparar el payload del reschedule
      const reschedulePayload: {
        classDate: string;
        professorId?: string;
        userId?: string;
      } = {
        classDate,
      };

      // Agregar professorId o userId según corresponda
      if (professorId) {
        reschedulePayload.professorId = professorId;
      }
      if (userId) {
        reschedulePayload.userId = userId;
      }

      await apiClient(`api/class-registry/${registryId}/reschedule`, {
        method: "POST",
        body: JSON.stringify(reschedulePayload),
        skipAutoRedirect: true,
      });
      
      // Obtener los registros actualizados después de crear el reschedule
      let response;
      if (periodMode === "current" && startDate && endDate) {
        const fromDate = extractDatePart(startDate);
        const toDate = extractDatePart(endDate);
        response = await apiClient(
          `api/class-registry/range?enrollmentId=${enrollmentId}&from=${fromDate}&to=${toDate}`
        );
      } else if (periodMode === "all") {
        response = await apiClient(
          `api/class-registry?enrollmentId=${enrollmentId}`
        );
      }
      
      if (response) {
        const updatedRegistries = response.classes || [];
        
        // Si hay un estado guardado para la clase original, preservarlo
        if (savedState) {
          // Guardar el estado en el ref de preservación para que el useEffect lo restaure en la clase original
          preservedStatesRef.current[registryId] = savedState;
        }
        
        // Actualizar los registros (esto disparará el useEffect que restaurará el estado en la clase original)
        setClassRegistries(updatedRegistries);
      } else {
        // Si no hay respuesta, usar fetchClassRegistries como fallback
        await fetchClassRegistries();
      }
      
      setRescheduleRegistryIdState(null);
      setRescheduleDate("");
      
      // Mostrar alerta de éxito y recordando guardar la clase original
      if (originalDate) {
        window.alert(
          `Reschedule created successfully. Remember to save the information for the original class dated ${formatDateForDisplay(originalDate)}.`
        );
      } else {
        window.alert("Reschedule created successfully");
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
  }, [fetchClassRegistries, editingRegistryData, editingRegistryDataRef, enrollmentId, periodMode, startDate, endDate, classRegistries, user?.id, user?.role]);

  const updateEvaluationCache = useCallback(() => {
    // This function is kept for API compatibility but is no longer needed
    // The evaluation cache is now managed directly in useEvaluations hook
  }, []);

  return {
    classRegistries,
    editingRegistryData,
    registrySuccessMessage,
    registryErrorMessage,
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
    handleCreateReschedule,
    updateEvaluationCache,
  };
}

