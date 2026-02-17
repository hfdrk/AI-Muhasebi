import type { Request, Response, NextFunction } from "express";
import { verifyToken, logger } from "@repo/shared-utils";
import { AuthenticationError } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest, RequestContext } from "../types/request-context";
import { setUserContext } from "../lib/sentry";

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

    // Check if token has been revoked (logout blacklist)
    const { authService } = await import("../services/auth-service");
    if (await authService.isTokenBlacklisted(token)) {
      throw new AuthenticationError("Oturum sonlandırılmış. Lütfen tekrar giriş yapın.");
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
        logger.error("Auth middleware database error:", { error: error.message });
      }
      throw new AuthenticationError("Kullanıcı doğrulama hatası.");
    }

    if (!user || !user.isActive) {
      throw new AuthenticationError("Kullanıcı bulunamadı veya devre dışı.");
    }

    // Check account lockout status
    const { securityService } = await import("../services/security-service");
    const lockoutStatus = await securityService.getAccountLockoutStatus(user.id);
    if (lockoutStatus.locked) {
      throw new AuthenticationError(
        `Hesap geçici olarak kilitlendi. ${lockoutStatus.lockoutUntil ? `Kilit ${new Date(lockoutStatus.lockoutUntil).toLocaleString("tr-TR")} tarihine kadar sürecek.` : ""}`
      );
    }

    // Check IP whitelist (optional - can be enabled per tenant)
    const ipAddress = req.ip || req.socket.remoteAddress;
    if (decoded.tenantId && ipAddress) {
      const isWhitelisted = await securityService.isIPWhitelisted(decoded.tenantId, ipAddress, user.id);
      // IP whitelisting is optional - uncomment to enforce
      // if (!isWhitelisted) {
      //   throw new AuthenticationError("IP adresi izin listesinde değil.");
      // }
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
      platformRoles: user.platformRole ? [user.platformRole] : decoded.platformRoles,
      isImpersonating: decoded.isImpersonating ?? false,
      impersonatorId: decoded.impersonatorId,
      impersonatedUserId: decoded.impersonatedUserId,
    };

    // Set user context for Sentry
    setUserContext(user.id, decoded.tenantId, user.email);

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
      return;
    }
    // Log unexpected errors in test mode for debugging
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      logger.error("Auth middleware unexpected error:", { error });
    }
    next(new AuthenticationError("Geçersiz token."));
  }
}

