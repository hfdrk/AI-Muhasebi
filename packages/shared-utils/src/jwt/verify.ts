import jwt from "jsonwebtoken";
import { getConfig } from "@repo/config";
import type { TokenPayload } from "./generate";

export interface VerifiedToken extends TokenPayload {
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export function verifyToken(token: string): VerifiedToken {
  const config = getConfig();
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: "ai-muhasebi",
      audience: "ai-muhasebi-api",
    }) as VerifiedToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token süresi dolmuş.");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Geçersiz token.");
    }
    throw error;
  }
}

export function verifyPasswordResetToken(token: string): boolean {
  const config = getConfig();
  try {
    jwt.verify(token, config.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

