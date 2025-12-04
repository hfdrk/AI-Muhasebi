"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
const MIN_LENGTH = 12;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
const REQUIRE_SPECIAL = true;
function validatePassword(password) {
    const errors = [];
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
//# sourceMappingURL=validate.js.map