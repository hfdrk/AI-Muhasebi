import jwt, { type SignOptions } from "jsonwebtoken";
import { getConfig } from "@repo/config";

export interface TokenPayload {
  userId: string;
  tenantId?: string;
  email: string;
  roles?: string[];
}

export function generateAccessToken(payload: TokenPayload): string {
  const config = getConfig();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_TOKEN_EXPIRY as string,
    issuer: "ai-muhasebi",
    audience: "ai-muhasebi-api",
  } as SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  const config = getConfig();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_TOKEN_EXPIRY as string,
    issuer: "ai-muhasebi",
    audience: "ai-muhasebi-api",
  } as SignOptions);
}

// Password reset tokens are now generated using crypto.randomBytes in the service layer

