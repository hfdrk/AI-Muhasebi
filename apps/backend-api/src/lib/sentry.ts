import * as Sentry from "@sentry/node";
import { getConfig } from "@repo/config";

/**
 * Initialize Sentry for error tracking
 * Should be called early in the application lifecycle
 */
export function initSentry(): void {
  const config = getConfig();
  
  if (!config.SENTRY_DSN) {
    // Sentry is optional, skip initialization if DSN is not provided
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in production, 100% in dev
    profilesSampleRate: config.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Filter out health check endpoints
    beforeSend(event, hint) {
      // Don't send events for health checks
      if (event.request?.url?.includes("/healthz") || 
          event.request?.url?.includes("/readyz") ||
          event.request?.url?.includes("/health") ||
          event.request?.url?.includes("/ready")) {
        return null;
      }
      return event;
    },
    
    // Configure release tracking
    release: process.env.APP_VERSION || undefined,
    
    // Configure integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }), // Will be set in server.ts
    ],
  });
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as any);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, tenantId?: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email: email,
    tenantId: tenantId,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

