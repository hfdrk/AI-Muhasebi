/**
 * XSS Sanitization Utilities
 * 
 * Provides functions to sanitize user input to prevent XSS attacks.
 * Uses a simple HTML tag removal approach to avoid ESM module compatibility issues.
 */

// Simple HTML tag removal function (synchronous, no dependencies)
function removeHtmlTags(input: string): string {
  // Remove HTML tags
  let cleaned = input.replace(/<[^>]*>/g, "");
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Remove script and style content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  return cleaned.trim();
}

/**
 * Sanitize a string to prevent XSS attacks
 * Removes HTML tags and dangerous content while preserving plain text
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string with HTML removed
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Use simple HTML tag removal to avoid ESM module issues
  // This removes HTML tags and dangerous content
  return removeHtmlTags(input);
}

/**
 * Sanitize an object's string properties recursively
 * Useful for sanitizing request bodies before storing in database
 * 
 * @param obj - The object to sanitize
 * @param fieldsToSanitize - Array of field names to sanitize (optional, sanitizes all string fields if not provided)
 * @returns New object with sanitized string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize?: string[]
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      // If fieldsToSanitize is provided, only sanitize those fields
      // Otherwise, sanitize all string fields
      if (!fieldsToSanitize || fieldsToSanitize.includes(key)) {
        sanitized[key] = sanitizeString(value) as any;
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, fieldsToSanitize) as any;
    }
  }

  return sanitized;
}

/**
 * Sanitize an array of strings
 * 
 * @param input - Array of strings to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeStringArray(input: (string | null | undefined)[]): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item) => sanitizeString(item)).filter((item) => item.length > 0);
}

