import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "@repo/shared-utils";

// ─── Constants ───────────────────────────────────────────────────────

const CSRF_COOKIE_NAME = "__csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTE_LENGTH = 32;

/** HTTP methods that mutate state and therefore require CSRF validation. */
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Auth route path segments that are accessed before a session exists.
 * These are matched as suffixes so they work regardless of the API prefix.
 */
const EXEMPT_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/** Infrastructure / health-check paths that should never require a CSRF token. */
const EXEMPT_INFRA_PATHS = ["/health", "/healthz", "/ready", "/readyz", "/metrics"];

// ─── Helpers ─────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
}

/**
 * Returns `true` when the given request path should be exempt from
 * CSRF validation on mutation methods.
 */
function isExemptPath(path: string): boolean {
  const lowerPath = path.toLowerCase();

  // Health / infra endpoints
  if (EXEMPT_INFRA_PATHS.some((p) => lowerPath === p || lowerPath.endsWith(p))) {
    return true;
  }

  // Pre-session auth endpoints
  if (EXEMPT_AUTH_PATHS.some((p) => lowerPath.endsWith(p))) {
    return true;
  }

  // Webhook and callback endpoints (third-party integrations)
  if (lowerPath.includes("/webhook") || lowerPath.includes("/callback")) {
    return true;
  }

  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────

/**
 * Double Submit Cookie CSRF protection middleware.
 *
 * **How it works:**
 * 1. Every response sets (or refreshes) an `__csrf` cookie containing a
 *    cryptographically random token. The cookie is readable by frontend
 *    JavaScript (`httpOnly: false`) so the SPA can attach it to requests.
 * 2. On mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) the middleware
 *    compares the `X-CSRF-Token` header value with the cookie value.
 *    If they don't match, the request is rejected with **403**.
 * 3. Certain paths (auth, health, webhooks) are exempt because they are
 *    either stateless or invoked by external systems that can't set the header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // ── Always set / refresh the CSRF cookie ──────────────────────────
  const isProduction = process.env.NODE_ENV === "production";
  const newToken = generateToken();

  res.cookie(CSRF_COOKIE_NAME, newToken, {
    httpOnly: false, // frontend must read the cookie to send it back as a header
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });

  // ── Only validate on mutation methods ─────────────────────────────
  if (!MUTATION_METHODS.has(req.method)) {
    return next();
  }

  // ── Skip exempt paths ─────────────────────────────────────────────
  if (isExemptPath(req.path)) {
    return next();
  }

  // ── Validate: header token must match cookie token ────────────────
  const cookieToken: string | undefined = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken: string | undefined = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn("CSRF validation failed", {
      path: req.path,
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });

    res.status(403).json({
      error: {
        code: "CSRF_VALIDATION_FAILED",
        message:
          "CSRF doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin.",
      },
    });
    return;
  }

  next();
}
