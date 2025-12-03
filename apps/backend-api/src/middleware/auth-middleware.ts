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
    const decoded = verifyToken(token);

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

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
    next(new AuthenticationError("Geçersiz token."));
  }
}

