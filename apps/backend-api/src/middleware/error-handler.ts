import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  logger.error("Request error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AuthenticationError) {
    res.status(401).json({
      error: {
        code: "AUTHENTICATION_ERROR",
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof AuthorizationError) {
    res.status(403).json({
      error: {
        code: "AUTHORIZATION_ERROR",
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
        field: err.field,
      },
    });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.errors[0]?.message || "Geçersiz bilgiler.",
        details: err.errors,
      },
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: err.message,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === "P2002") {
      const target = err.meta?.target as string[] | undefined;
      const field = target && target.length > 0 ? target[0] : "alan";
      let message = "Bu değer zaten kullanılıyor.";
      
      // Provide more specific messages for common fields
      if (field === "slug") {
        message = "Bu kısa ad zaten kullanılıyor.";
      } else if (field === "email") {
        message = "Bu e-posta adresi zaten kullanılıyor.";
      } else if (field === "taxNumber") {
        message = "Bu vergi numarası zaten kullanılıyor.";
      }
      
      res.status(409).json({
        error: {
          code: "DUPLICATE_ENTRY",
          message,
        },
      });
      return;
    }

    // P2003: Foreign key constraint violation
    if (err.code === "P2003") {
      res.status(400).json({
        error: {
          code: "FOREIGN_KEY_CONSTRAINT",
          message: "İlişkili kayıt bulunamadı.",
        },
      });
      return;
    }

    // P2025: Record not found
    if (err.code === "P2025") {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Kayıt bulunamadı.",
        },
      });
      return;
    }

    // Other Prisma errors - return generic error
    res.status(400).json({
      error: {
        code: "DATABASE_ERROR",
        message: process.env.NODE_ENV === "production" 
          ? "Veritabanı hatası oluştu." 
          : err.message,
      },
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Bir hata oluştu." : err.message,
    },
  });
}

