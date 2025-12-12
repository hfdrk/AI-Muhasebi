/**
 * Email validation utility that supports Turkish characters
 * 
 * Standard email validators don't support internationalized domain names (IDN)
 * with Turkish characters like ş, ğ, ü, ö, ç, ı
 */

import { z } from "zod";

/**
 * Custom email validation regex that supports Turkish characters
 * Allows Turkish characters in both local and domain parts
 */
const emailRegex = /^[a-zA-Z0-9._%+-şğüöçıŞĞÜÖÇI]+@[a-zA-Z0-9.-şğüöçıŞĞÜÖÇI]+\.[a-zA-ZşğüöçıŞĞÜÖÇI]{2,}$/;

/**
 * Custom Zod email validator that supports Turkish characters
 */
export const emailValidator = z
  .string()
  .min(1, "E-posta adresi gerekli.")
  .refine(
    (email) => {
      // Basic format check
      if (!email.includes("@") || !email.includes(".")) {
        return false;
      }

      // Check for Turkish characters in domain
      const parts = email.split("@");
      if (parts.length !== 2) {
        return false;
      }

      const [localPart, domain] = parts;

      // Local part should not be empty
      if (!localPart || localPart.length === 0) {
        return false;
      }

      // Domain should have at least one dot and valid TLD
      if (!domain || !domain.includes(".")) {
        return false;
      }

      // Use regex for full validation (supports Turkish chars)
      return emailRegex.test(email);
    },
    {
      message: "Geçerli bir e-posta adresi giriniz.",
    }
  );

/**
 * Alternative: Use Zod's email validator with a custom refine for Turkish characters
 * This is more permissive and allows any characters that pass basic email format
 */
export const emailValidatorPermissive = z
  .string()
  .min(1, "E-posta adresi gerekli.")
  .refine(
    (email) => {
      // First check basic format
      const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!basicEmailRegex.test(email)) {
        return false;
      }

      // Then check for Turkish characters support
      // Allow Turkish characters in domain
      return emailRegex.test(email);
    },
    {
      message: "Geçerli bir e-posta adresi giriniz.",
    }
  );
