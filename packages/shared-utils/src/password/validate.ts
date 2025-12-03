export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const MIN_LENGTH = 12;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
const REQUIRE_SPECIAL = true;

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Şifre en az ${MIN_LENGTH} karakter olmalıdır.`);
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push("Şifre en az bir büyük harf içermelidir.");
  }

  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push("Şifre en az bir küçük harf içermelidir.");
  }

  if (REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push("Şifre en az bir rakam içermelidir.");
  }

  if (REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Şifre en az bir özel karakter içermelidir.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

