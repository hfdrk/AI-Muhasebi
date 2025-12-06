import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@repo/shared-utils";
import { AuthenticationError } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest, RequestContext } from "../types/request-context";

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Yetkilendirme gerekli.");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error: any) {
      // verifyToken throws generic Error, convert to AuthenticationError
      throw new AuthenticationError(error.message || "Geçersiz token.");
    }

    // Load user from database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
    } catch (error: any) {
      // Database errors should be logged but converted to auth error
      // In test mode, log the error for debugging
      if (process.env.NODE_ENV === "test" || process.env.VITEST) {
        console.error("Auth middleware database error:", error.message);
      }
      throw new AuthenticationError("Kullanıcı doğrulama hatası.");
    }

    if (!user || !user.isActive) {
      throw new AuthenticationError("Kullanıcı bulunamadı veya devre dışı.");
    }

    // Attach user to request context
    req.context = {
      user: {
        id: user.id,
        email: user.email,
        hashedPassword: user.hashedPassword,
        fullName: user.fullName,
        locale: user.locale,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenantId: decoded.tenantId,
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
      return;
    }
    // Log unexpected errors in test mode for debugging
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      console.error("Auth middleware unexpected error:", error);
    }
    next(new AuthenticationError("Geçersiz token."));
  }
}

