/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility functions for consistent date handling across the application
 * Solves timezone issues and provides consistent date formatting
 */

/**
 * Extracts date part (YYYY-MM-DD) from date string to avoid timezone issues
 * Handles multiple formats:
 * - ISO format: "2025-09-07T00:00:00.000Z"
 * - Space-separated format: "2015-02-22 00:00:00"
 * - JavaScript Date string: "Fri Dec 31 2004 20:00:00 GMT-0400 (hora de Venezuela)"
 * - Already in YYYY-MM-DD format
 * @param dateString - Date string in various formats
 * @returns Date part as string "YYYY-MM-DD"
 */
export function extractDatePart(dateString: string): string {
  if (!dateString) return "";
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle ISO format with T separator (e.g., "2025-09-07T00:00:00.000Z")
  if (dateString.includes("T")) {
    return dateString.split("T")[0];
  }
  
  // Handle space-separated format (e.g., "2015-02-22 00:00:00")
  // Check if it starts with YYYY-MM-DD pattern
  const spaceSeparatedMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (spaceSeparatedMatch) {
    return spaceSeparatedMatch[1];
  }
  
  // Handle JavaScript Date string format (e.g., "Fri Dec 31 2004 20:00:00 GMT-0400")
  // Try to parse it as a Date object and extract YYYY-MM-DD
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    // If parsing fails, continue to return empty string
  }
  
  // If none of the formats match, return empty string
  return "";
}

/**
 * Formats a date string for display, avoiding timezone conversion issues
 * @param isoDateString - ISO date string like "2025-09-07T00:00:00.000Z"
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForDisplay(isoDateString: string): string {
  if (!isoDateString) return "N/A";
  return extractDatePart(isoDateString); // Returns "2025-09-07"
}

/**
 * Creates a sorting function for date columns that works correctly with both formats
 * @param dateField - The field name containing the date
 * @returns Sorting function for use in table columns
 */
export function createDateSortingFunction(dateField: string) {
  return (rowA: any, rowB: any) => {
    const dateA = extractDatePart(String(rowA.original[dateField] || ""));
    const dateB = extractDatePart(String(rowB.original[dateField] || ""));
    return dateA.localeCompare(dateB); // ISO format sorts correctly
  };
}

/**
 * Gets current date in YYYY-MM-DD format for form inputs
 * @returns Current date as string "YYYY-MM-DD"
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Converts a date string to ISO format for API calls
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns ISO date string
 */
export function dateStringToISO(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString();
}

/**
 * Adds days to a date string in YYYY-MM-DD format
 * @param dateString - Date string in YYYY-MM-DD format
 * @param days - Number of days to add (can be negative to subtract)
 * @returns Date string in YYYY-MM-DD format
 */
export function addDaysToDate(dateString: string, days: number): string {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a date from YYYY-MM-DD format to DD/MM/YYYY format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date string in DD/MM/YYYY format (e.g., "07/01/2025")
 */
export function convertToDDMMYYYY(dateString: string): string {
  if (!dateString) return "";
  // Extract date part if it's in ISO format
  const datePart = extractDatePart(dateString);
  if (!datePart) return "";
  
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converts a date from DD/MM/YYYY format to YYYY-MM-DD format
 * @param dateString - Date string in DD/MM/YYYY format (e.g., "07/01/2025")
 * @returns Date string in YYYY-MM-DD format
 */
export function convertDDMMYYYYToYYYYMMDD(dateString: string): string {
  if (!dateString) return "";
  
  // Check if it's already in DD/MM/YYYY format
  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  
  return "";
}