import type { Request, Response, NextFunction } from "express";

/**
 * API Version middleware
 *
 * Sets standard API versioning and deprecation headers on every response.
 * Following the Sunset header RFC (draft-wilde-sunset-header).
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Current API version
  res.setHeader("X-API-Version", "1.0.0");

  // Supported versions
  res.setHeader("X-API-Supported-Versions", "v1");

  // Deprecation headers for future use — currently not deprecated
  // When deprecating: res.setHeader("Deprecation", "true");
  // When sunsetting: res.setHeader("Sunset", "Sat, 01 Jan 2028 00:00:00 GMT");

  next();
}
