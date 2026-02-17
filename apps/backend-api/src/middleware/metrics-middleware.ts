import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight Prometheus-compatible metrics collector.
 * No external dependencies — outputs text/plain in Prometheus exposition format.
 *
 * Tracks:
 * - HTTP request count by method, path, status
 * - HTTP request duration histogram
 * - Active connections gauge
 * - Error count by type
 */

interface RequestMetric {
  method: string;
  path: string;
  status: number;
  count: number;
  totalDurationMs: number;
}

// In-memory metrics store
const requestMetrics = new Map<string, RequestMetric>();
let activeConnections = 0;
let totalRequests = 0;
let totalErrors = 0;
const errorsByType = new Map<string, number>();
const startTime = Date.now();

// Duration buckets for histogram (ms)
const DURATION_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const durationHistogram = new Map<string, number[]>();

/**
 * Normalize path to avoid high-cardinality metrics.
 * Replaces UUIDs and IDs with :id placeholder.
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, "/:id") // UUID
    .replace(/\/c[a-z0-9]{20,30}/g, "/:id") // CUID
    .replace(/\/[0-9]+/g, "/:id") // Numeric IDs
    .replace(/\?.*/g, ""); // Strip query params
}

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  activeConnections++;
  totalRequests++;

  res.on("finish", () => {
    activeConnections--;
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const normalizedPath = normalizePath(req.path);
    const key = `${req.method}|${normalizedPath}|${res.statusCode}`;

    // Update request metrics
    const existing = requestMetrics.get(key);
    if (existing) {
      existing.count++;
      existing.totalDurationMs += durationMs;
    } else {
      requestMetrics.set(key, {
        method: req.method,
        path: normalizedPath,
        status: res.statusCode,
        count: 1,
        totalDurationMs: durationMs,
      });
    }

    // Update duration histogram
    const histKey = `${req.method}|${normalizedPath}`;
    if (!durationHistogram.has(histKey)) {
      durationHistogram.set(histKey, new Array(DURATION_BUCKETS.length + 1).fill(0));
    }
    const buckets = durationHistogram.get(histKey)!;
    for (let i = 0; i < DURATION_BUCKETS.length; i++) {
      if (durationMs <= DURATION_BUCKETS[i]) {
        buckets[i]++;
        break;
      }
      if (i === DURATION_BUCKETS.length - 1) {
        buckets[DURATION_BUCKETS.length]++; // +Inf bucket
      }
    }

    // Track errors
    if (res.statusCode >= 400) {
      totalErrors++;
      const errorType = res.statusCode >= 500 ? "5xx" : "4xx";
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
    }
  });

  next();
}

/**
 * Handler for GET /metrics endpoint
 * Returns Prometheus exposition format (text/plain)
 */
export function metricsHandler(req: Request, res: Response): void {
  const lines: string[] = [];
  const uptimeSeconds = (Date.now() - startTime) / 1000;

  // Process info
  lines.push("# HELP process_uptime_seconds Process uptime in seconds");
  lines.push("# TYPE process_uptime_seconds gauge");
  lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(1)}`);

  lines.push("# HELP nodejs_heap_size_bytes Node.js heap size");
  lines.push("# TYPE nodejs_heap_size_bytes gauge");
  const mem = process.memoryUsage();
  lines.push(`nodejs_heap_size_bytes{type="used"} ${mem.heapUsed}`);
  lines.push(`nodejs_heap_size_bytes{type="total"} ${mem.heapTotal}`);
  lines.push(`nodejs_heap_size_bytes{type="rss"} ${mem.rss}`);

  // HTTP request counter
  lines.push("# HELP http_requests_total Total HTTP requests");
  lines.push("# TYPE http_requests_total counter");
  lines.push(`http_requests_total ${totalRequests}`);

  // Active connections
  lines.push("# HELP http_active_connections Currently active HTTP connections");
  lines.push("# TYPE http_active_connections gauge");
  lines.push(`http_active_connections ${activeConnections}`);

  // Error counter
  lines.push("# HELP http_errors_total Total HTTP errors");
  lines.push("# TYPE http_errors_total counter");
  lines.push(`http_errors_total ${totalErrors}`);
  for (const [type, count] of errorsByType) {
    lines.push(`http_errors_by_type{type="${type}"} ${count}`);
  }

  // Request count by method/path/status
  lines.push("# HELP http_request_count_total HTTP requests by method, path, and status");
  lines.push("# TYPE http_request_count_total counter");
  for (const metric of requestMetrics.values()) {
    lines.push(
      `http_request_count_total{method="${metric.method}",path="${metric.path}",status="${metric.status}"} ${metric.count}`
    );
  }

  // Request duration
  lines.push("# HELP http_request_duration_ms_sum Total request duration in ms");
  lines.push("# TYPE http_request_duration_ms_sum counter");
  for (const metric of requestMetrics.values()) {
    lines.push(
      `http_request_duration_ms_sum{method="${metric.method}",path="${metric.path}",status="${metric.status}"} ${metric.totalDurationMs.toFixed(1)}`
    );
  }

  // Average latency per endpoint
  lines.push("# HELP http_request_duration_ms_avg Average request duration in ms");
  lines.push("# TYPE http_request_duration_ms_avg gauge");
  for (const metric of requestMetrics.values()) {
    const avg = metric.count > 0 ? metric.totalDurationMs / metric.count : 0;
    lines.push(
      `http_request_duration_ms_avg{method="${metric.method}",path="${metric.path}"} ${avg.toFixed(1)}`
    );
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(lines.join("\n") + "\n");
}
