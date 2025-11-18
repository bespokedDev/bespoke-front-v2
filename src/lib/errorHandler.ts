/**
 * Utilidad para manejar errores de la API de manera consistente
 */

export interface ApiError extends Error {
  statusCode?: number;
  apiMessage?: string;
}

/**
 * Extrae el código de estado HTTP de un error
 */
export const getErrorStatusCode = (error: unknown): number | null => {
  if (error && typeof error === "object" && "statusCode" in error) {
    return (error as ApiError).statusCode || null;
  }
  return null;
};

/**
 * Extrae el mensaje de error de la API
 */
export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    // Si tiene apiMessage, usarlo (es el mensaje real de la API)
    if ("apiMessage" in error && (error as ApiError).apiMessage) {
      return (error as ApiError).apiMessage!;
    }
    // Si tiene message, usarlo
    if ("message" in error && typeof (error as Error).message === "string") {
      return (error as Error).message;
    }
  }
  return "An unexpected error occurred";
};

/**
 * Maneja errores de la API y retorna información estructurada
 */
export const handleApiError = (error: unknown): {
  statusCode: number | null;
  message: string;
  isValidationError: boolean;
  isConflictError: boolean;
  isNotFoundError: boolean;
  isServerError: boolean;
  isUnauthorizedError: boolean;
} => {
  const statusCode = getErrorStatusCode(error);
  const message = getErrorMessage(error);

  return {
    statusCode,
    message,
    isValidationError: statusCode === 400,
    isConflictError: statusCode === 409,
    isNotFoundError: statusCode === 404,
    isServerError: statusCode === 500 || statusCode === 502 || statusCode === 503,
    isUnauthorizedError: statusCode === 401 || statusCode === 403,
  };
};

/**
 * Obtiene un mensaje de error amigable para el usuario basado en el código de estado
 */
export const getFriendlyErrorMessage = (
  error: unknown,
  defaultMessage: string
): string => {
  const { statusCode, message, isValidationError, isConflictError, isNotFoundError, isServerError } =
    handleApiError(error);

  // Si tenemos un mensaje específico de la API, usarlo
  if (message && message !== "API request failed with status " + statusCode) {
    return message;
  }

  // Mensajes amigables según el código de estado
  if (isValidationError) {
    return "Please check all required fields and try again.";
  }
  if (isConflictError) {
    return "This record already exists. Please use a different name.";
  }
  if (isNotFoundError) {
    return "The requested resource was not found.";
  }
  if (isServerError) {
    return "Server error. Please try again later or contact support.";
  }
  if (statusCode === 401 || statusCode === 403) {
    return "You are not authorized to perform this action.";
  }

  return defaultMessage;
};

