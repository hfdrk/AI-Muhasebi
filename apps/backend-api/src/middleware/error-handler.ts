import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
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

  // Default error
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "Bir hata oluştu." : err.message,
    },
  });
}

