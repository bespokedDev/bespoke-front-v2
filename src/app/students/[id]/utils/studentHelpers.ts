/**
 * Helper functions for student-related operations
 */

/**
 * Get initials from a name string
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Convert image file to base64 string
 */
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validate that it's an image
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please select a valid image file." };
  }

  // Validate maximum size (300KB)
  const maxSize = 300 * 1024; // 300KB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: "Image size must be less than 300KB." };
  }

  return { valid: true };
}

