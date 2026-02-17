/**
 * XSS Sanitization Utilities
 *
 * Provides functions to sanitize user input to prevent XSS attacks.
 * Uses multi-pass HTML stripping: first removes dangerous blocks (script/style),
 * then strips all tags, then neutralizes any remaining dangerous patterns.
 * Does NOT decode HTML entities back to active characters to prevent re-injection.
 */

/**
 * Remove dangerous content from a string.
 * Order matters: strip dangerous blocks first, then all tags, then neutralize leftovers.
 */
function stripDangerousContent(input: string): string {
  let cleaned = input;

  // 1. Remove script/style blocks including their content (case-insensitive, multiline)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");

  // 2. Remove all HTML tags (including self-closing, malformed, and with attributes)
  cleaned = cleaned.replace(/<\/?[a-z][^>]*>/gi, "");
  // Also catch tags that use unusual whitespace or encoding
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // 3. Remove dangerous attribute patterns that might survive (e.g., event handlers)
  cleaned = cleaned.replace(/\bon\w+\s*=\s*['""][^'"]*['""]?/gi, "");
  cleaned = cleaned.replace(/\bon\w+\s*=/gi, "");

  // 4. Remove javascript: and data: URI schemes
  cleaned = cleaned.replace(/javascript\s*:/gi, "");
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, "");
  cleaned = cleaned.replace(/vbscript\s*:/gi, "");

  // 5. Neutralize HTML entities — do NOT decode &lt; back to < (prevents re-injection)
  // Only decode safe entities
  cleaned = cleaned.replace(/&nbsp;/g, " ");
  cleaned = cleaned.replace(/&amp;/g, "&");

  return cleaned.trim();
}

/**
 * Sanitize a string to prevent XSS attacks.
 * Removes all HTML tags, script content, event handlers, and dangerous URI schemes.
 *
 * @param input - The string to sanitize
 * @returns Sanitized plain-text string
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return stripDangerousContent(input);
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

  const sanitized: Record<string, any> = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      // If fieldsToSanitize is provided, only sanitize those fields
      // Otherwise, sanitize all string fields
      if (!fieldsToSanitize || fieldsToSanitize.includes(key)) {
        sanitized[key] = sanitizeString(value);
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, fieldsToSanitize);
    }
  }

  return sanitized as T;
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

