"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { convertToDDMMYYYY } from "@/lib/dateUtils";
import type { Evaluation, EvaluationWithClassDate, ClassRegistry } from "../types";

interface UseEvaluationsReturn {
  evaluations: EvaluationWithClassDate[];
  isLoadingEvaluations: boolean;
  evaluationCache: Record<string, boolean>;
  evaluationFormData: {
    fecha: string;
    temasEvaluados: string;
    skillEvaluada: string;
    linkMaterial: string;
    capturePrueba: string | null;
    puntuacion: string;
    comentario: string;
  };
  isSubmittingEvaluation: boolean;
  evaluationError: string | null;
  editingEvaluationId: string | null;
  openCreateEvaluationDialog: boolean;
  selectedClassRegistryForEvaluation: ClassRegistry | null;
  openMenuRegistryId: string | null;
  checkedEvaluationRegistryIds: Set<string>;
  evaluationCacheRef: React.MutableRefObject<Record<string, boolean>>;
  editingEvaluationDataRef: React.MutableRefObject<Record<string, Partial<Evaluation>>>;
  setEvaluationFormData: React.Dispatch<React.SetStateAction<{
    fecha: string;
    temasEvaluados: string;
    skillEvaluada: string;
    linkMaterial: string;
    capturePrueba: string | null;
    puntuacion: string;
    comentario: string;
  }>>;
  setEvaluationError: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingEvaluationId: React.Dispatch<React.SetStateAction<string | null>>;
  setOpenCreateEvaluationDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedClassRegistryForEvaluation: React.Dispatch<React.SetStateAction<ClassRegistry | null>>;
  setOpenMenuRegistryId: React.Dispatch<React.SetStateAction<string | null>>;
  setCheckedEvaluationRegistryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEvaluationCache: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  checkClassHasEvaluation: (classRegistryId: string) => boolean;
  fetchAllEvaluations: () => Promise<void>;
  handleCreateEvaluation: () => Promise<void>;
  handleUpdateEvaluation: (evaluationId: string, updateData: Partial<Evaluation>) => Promise<void>;
}

export function useEvaluations(
  enrollmentId: string,
  activeTab: string,
  onRegistrySuccessMessage: (message: string) => void,
  onRegistryErrorMessage: (message: string) => void,
  fetchClassRegistries: () => Promise<void>
): UseEvaluationsReturn {
  const [evaluations, setEvaluations] = useState<EvaluationWithClassDate[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [evaluationCache, setEvaluationCache] = useState<Record<string, boolean>>({});
  const [openCreateEvaluationDialog, setOpenCreateEvaluationDialog] = useState(false);
  const [selectedClassRegistryForEvaluation, setSelectedClassRegistryForEvaluation] = useState<ClassRegistry | null>(null);
  const [evaluationFormData, setEvaluationFormData] = useState<{
    fecha: string;
    temasEvaluados: string;
    skillEvaluada: string;
    linkMaterial: string;
    capturePrueba: string | null;
    puntuacion: string;
    comentario: string;
  }>({
    fecha: new Date().toISOString().split("T")[0],
    temasEvaluados: "",
    skillEvaluada: "",
    linkMaterial: "",
    capturePrueba: null,
    puntuacion: "",
    comentario: "",
  });
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [openMenuRegistryId, setOpenMenuRegistryId] = useState<string | null>(null);
  const [checkedEvaluationRegistryIds, setCheckedEvaluationRegistryIds] = useState<Set<string>>(new Set());

  // Ref para el cache de evaluaciones (para evitar dependencias en useCallback)
  const evaluationCacheRef = useRef<Record<string, boolean>>({});

  // Ref para almacenar datos de edición de evaluaciones
  const editingEvaluationDataRef = useRef<Record<string, Partial<Evaluation>>>({});

  // Verificar si una clase tiene evaluación (verificación ligera con cache)
  const checkClassHasEvaluation = useCallback((classRegistryId: string): boolean => {
    // Use the cache that is updated from the API response
    return evaluationCacheRef.current[classRegistryId] || false;
  }, []);

  // Load all evaluations from the enrollment using the dedicated endpoint
  const fetchAllEvaluations = useCallback(async () => {
    setIsLoadingEvaluations(true);
    try {
      const response = await apiClient(
        `api/evaluations/enrollment/${enrollmentId}`,
        { skipAutoRedirect: true }
      );
      
      const evaluationsList: Evaluation[] = response.evaluations || [];
      
      // Update evaluation cache based on the evaluations received
      const newCache: Record<string, boolean> = {};
      evaluationsList.forEach((evaluation) => {
        const classRegistryId = typeof evaluation.classRegistryId === 'string' 
          ? evaluation.classRegistryId 
          : evaluation.classRegistryId._id;
        newCache[classRegistryId] = true;
      });
      
      // Merge with existing cache (keep entries for classes without evaluations)
      evaluationCacheRef.current = {
        ...evaluationCacheRef.current,
        ...newCache,
      };
      setEvaluationCache((prev) => ({
        ...prev,
        ...newCache,
      }));
      
      // Transform evaluations to include classDate from populated classRegistryId
      const evaluationsWithClassDate: EvaluationWithClassDate[] = evaluationsList.map((evaluation) => {
        const classRegistryIdData = typeof evaluation.classRegistryId === 'string'
          ? null
          : evaluation.classRegistryId;
        
        return {
          ...evaluation,
          classDate: classRegistryIdData?.classDate || '',
        };
      });
      
      setEvaluations(evaluationsWithClassDate);
    } catch (err: unknown) {
      console.error("Error fetching evaluations:", err);
      setEvaluations([]);
    } finally {
      setIsLoadingEvaluations(false);
    }
  }, [enrollmentId]);

  // Load evaluations when switching to evaluations tab
  useEffect(() => {
    if (activeTab === "evaluations") {
      fetchAllEvaluations();
    }
  }, [activeTab, fetchAllEvaluations]);

  // Crear evaluación
  const handleCreateEvaluation = useCallback(async () => {
    if (!selectedClassRegistryForEvaluation) return;
    
    setIsSubmittingEvaluation(true);
    setEvaluationError(null);
    
    try {
      // Use classDate from the selected class registry (automatic, not editable)
      const classDateDDMMYYYY = convertToDDMMYYYY(selectedClassRegistryForEvaluation.classDate);
      
      const payload: {
        classRegistryId: string;
        fecha: string;
        temasEvaluados?: string;
        skillEvaluada?: string;
        linkMaterial?: string;
        capturePrueba?: string;
        puntuacion?: string;
        comentario?: string;
      } = {
        classRegistryId: selectedClassRegistryForEvaluation._id,
        fecha: classDateDDMMYYYY,
      };
      
      if (evaluationFormData.temasEvaluados) payload.temasEvaluados = evaluationFormData.temasEvaluados;
      if (evaluationFormData.skillEvaluada) payload.skillEvaluada = evaluationFormData.skillEvaluada;
      if (evaluationFormData.linkMaterial) payload.linkMaterial = evaluationFormData.linkMaterial;
      if (evaluationFormData.capturePrueba) payload.capturePrueba = evaluationFormData.capturePrueba;
      if (evaluationFormData.puntuacion) payload.puntuacion = evaluationFormData.puntuacion;
      if (evaluationFormData.comentario) payload.comentario = evaluationFormData.comentario;
      
      await apiClient("api/evaluations", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAutoRedirect: true,
      });
      
      // Reload class registries to get updated evaluations field from API
      await fetchClassRegistries();
      
      // Reload evaluations from updated classRegistries
      await fetchAllEvaluations();
      
      // Cerrar modal y resetear formulario
      setOpenCreateEvaluationDialog(false);
      setSelectedClassRegistryForEvaluation(null);
      setEvaluationFormData({
        fecha: new Date().toISOString().split("T")[0],
        temasEvaluados: "",
        skillEvaluada: "",
        linkMaterial: "",
        capturePrueba: null,
        puntuacion: "",
        comentario: "",
      });
      onRegistrySuccessMessage("Evaluation created successfully");
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
        errorMessage = "You don't have permission to create evaluations. Please contact an administrator.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error creating evaluation. Please try again."
        );
      }
      
      setEvaluationError(errorMessage);
    } finally {
      setIsSubmittingEvaluation(false);
    }
  }, [selectedClassRegistryForEvaluation, evaluationFormData, fetchAllEvaluations, fetchClassRegistries, onRegistrySuccessMessage]);

  // Actualizar evaluación
  const handleUpdateEvaluation = useCallback(async (evaluationId: string, updateData: Partial<Evaluation>) => {
    try {
      const payload: {
        temasEvaluados?: string | null;
        skillEvaluada?: string | null;
        linkMaterial?: string | null;
        capturePrueba?: string | null;
        puntuacion?: string | null;
        comentario?: string | null;
      } = {};
      
      // fecha is not editable - it always matches the class date
      // Do not include fecha in update payload
      if (updateData.temasEvaluados !== undefined) payload.temasEvaluados = updateData.temasEvaluados ?? null;
      if (updateData.skillEvaluada !== undefined) payload.skillEvaluada = updateData.skillEvaluada ?? null;
      if (updateData.linkMaterial !== undefined) payload.linkMaterial = updateData.linkMaterial ?? null;
      if (updateData.capturePrueba !== undefined) payload.capturePrueba = updateData.capturePrueba ?? null;
      if (updateData.puntuacion !== undefined) payload.puntuacion = updateData.puntuacion ?? null;
      if (updateData.comentario !== undefined) payload.comentario = updateData.comentario ?? null;
      
      await apiClient(`api/evaluations/${evaluationId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        skipAutoRedirect: true,
      });
      
      // Reload class registries to get updated evaluations field from API
      await fetchClassRegistries();
      
      // Reload evaluations from updated classRegistries
      await fetchAllEvaluations();
      onRegistrySuccessMessage("Evaluation updated successfully");
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
        errorMessage = "You don't have permission to update evaluations. Please contact an administrator.";
      } else {
        errorMessage = getFriendlyErrorMessage(
          err,
          "Error updating evaluation. Please try again."
        );
      }
      
      onRegistryErrorMessage(errorMessage);
      throw err;
    }
  }, [fetchAllEvaluations, fetchClassRegistries, onRegistrySuccessMessage, onRegistryErrorMessage]);

  return {
    evaluations,
    isLoadingEvaluations,
    evaluationCache,
    evaluationFormData,
    isSubmittingEvaluation,
    evaluationError,
    editingEvaluationId,
    openCreateEvaluationDialog,
    selectedClassRegistryForEvaluation,
    openMenuRegistryId,
    checkedEvaluationRegistryIds,
    evaluationCacheRef,
    editingEvaluationDataRef,
    setEvaluationFormData,
    setEvaluationError,
    setEditingEvaluationId,
    setOpenCreateEvaluationDialog,
    setSelectedClassRegistryForEvaluation,
    setOpenMenuRegistryId,
    setCheckedEvaluationRegistryIds,
    setEvaluationCache,
    checkClassHasEvaluation,
    fetchAllEvaluations,
    handleCreateEvaluation,
    handleUpdateEvaluation,
  };
}

