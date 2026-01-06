/**
 * Type declarations for otplib
 * These will be overridden by the actual types from otplib when installed
 */

declare module "otplib" {
  export interface AuthenticatorOptions {
    window?: number;
    step?: number;
    digits?: number;
    algorithm?: string;
  }

  export interface Authenticator {
    generateSecret(length?: number): string;
    generate(secret: string): string;
    verify(opts: { token: string; secret: string }): boolean;
    keyuri(accountName: string, issuer: string, secret: string): string;
    options: AuthenticatorOptions;
  }

  export const authenticator: Authenticator;
}
