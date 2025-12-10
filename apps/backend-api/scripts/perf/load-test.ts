/**
 * Basic Load Testing Script
 * 
 * This script performs simple load tests against key API endpoints
 * to establish performance baselines.
 * 
 * Usage:
 *   pnpm perf:test
 *   API_URL=http://localhost:3800 pnpm perf:test
 */

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Array<{ status: number; message: string; count: number }>;
}

interface RequestResult {
  success: boolean;
  duration: number;
  status?: number;
  error?: string;
}

const API_URL = process.env.API_URL || "http://localhost:3800";
const DURATION_SECONDS = parseInt(process.env.PERF_DURATION || "10", 10);
const CONCURRENCY = parseInt(process.env.PERF_CONCURRENCY || "10", 10);

// Test endpoints configuration
interface EndpointConfig {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  requiresAuth?: boolean;
  body?: () => unknown;
  description: string;
}

// Note: These endpoints require authentication in real scenarios
// For basic load testing, we'll test public endpoints or use mock tokens
const ENDPOINTS: EndpointConfig[] = [
  {
    path: "/health",
    method: "GET",
    description: "Health check endpoint",
  },
  {
    path: "/ready",
    method: "GET",
    description: "Readiness check endpoint",
  },
  // Add more endpoints as needed for testing
  // These would require proper authentication setup
];

async function makeRequest(
  endpoint: EndpointConfig,
  token?: string
): Promise<RequestResult> {
  const startTime = Date.now();
  const url = `${API_URL}${endpoint.path}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method: endpoint.method,
      headers,
    };

    if (endpoint.body && (endpoint.method === "POST" || endpoint.method === "PUT" || endpoint.method === "PATCH")) {
      options.body = JSON.stringify(endpoint.body());
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    // Read response body to ensure full request completion
    await response.text();

    return {
      success: response.ok,
      duration,
      status: response.status,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function runLoadTest(endpoint: EndpointConfig): Promise<TestResult> {
  console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
  console.log(`   ${endpoint.description}`);
  console.log(`   Duration: ${DURATION_SECONDS}s, Concurrency: ${CONCURRENCY}`);

  const results: RequestResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;

  // Run load test
  const promises: Promise<void>[] = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    const promise = (async () => {
      while (Date.now() < endTime) {
        const result = await makeRequest(endpoint);
        results.push(result);
        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    })();
    promises.push(promise);
  }

  await Promise.all(promises);

  // Calculate statistics
  const totalRequests = results.length;
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const totalDuration = Date.now() - startTime;
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);

  const avgLatency =
    durations.reduce((sum, d) => sum + d, 0) / durations.length || 0;
  const p95Latency = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99Latency = durations[Math.floor(durations.length * 0.99)] || 0;
  const minLatency = durations[0] || 0;
  const maxLatency = durations[durations.length - 1] || 0;
  const requestsPerSecond = (totalRequests / totalDuration) * 1000;
  const errorRate = (failedRequests / totalRequests) * 100;

  // Group errors
  const errorMap = new Map<string, { status?: number; message: string; count: number }>();
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      const key = r.status ? `status-${r.status}` : r.error || "unknown";
      const existing = errorMap.get(key) || { status: r.status, message: r.error || `HTTP ${r.status}`, count: 0 };
      existing.count++;
      errorMap.set(key, existing);
    });

  const errors = Array.from(errorMap.values());

  return {
    endpoint: endpoint.path,
    method: endpoint.method,
    totalRequests,
    successfulRequests,
    failedRequests,
    totalDuration,
    avgLatency: Math.round(avgLatency),
    p95Latency: Math.round(p95Latency),
    p99Latency: Math.round(p99Latency),
    minLatency,
    maxLatency,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    errors,
  };
}

function printResults(result: TestResult): void {
  console.log(`\n📊 Results for ${result.method} ${result.endpoint}:`);
  console.log(`   Total Requests: ${result.totalRequests}`);
  console.log(`   Successful: ${result.successfulRequests}`);
  console.log(`   Failed: ${result.failedRequests}`);
  console.log(`   Error Rate: ${result.errorRate}%`);
  console.log(`   Requests/sec: ${result.requestsPerSecond}`);
  console.log(`   Latency:`);
  console.log(`     Avg: ${result.avgLatency}ms`);
  console.log(`     Min: ${result.minLatency}ms`);
  console.log(`     Max: ${result.maxLatency}ms`);
  console.log(`     P95: ${result.p95Latency}ms`);
  console.log(`     P99: ${result.p99Latency}ms`);

  if (result.errors.length > 0) {
    console.log(`   Errors:`);
    result.errors.forEach((err) => {
      console.log(`     ${err.message}: ${err.count}`);
    });
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting Load Tests");
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Duration: ${DURATION_SECONDS}s`);
  console.log(`   Concurrency: ${CONCURRENCY}`);

  const allResults: TestResult[] = [];

  for (const endpoint of ENDPOINTS) {
    try {
      const result = await runLoadTest(endpoint);
      allResults.push(result);
      printResults(result);
    } catch (error: any) {
      console.error(`❌ Error testing ${endpoint.path}:`, error.message);
    }
  }

  // Save results to file
  const fs = await import("fs/promises");
  const resultsPath = `${__dirname}/results.json`;
  await fs.writeFile(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`\n✅ Results saved to: ${resultsPath}`);

  // Summary
  console.log("\n📈 Summary:");
  allResults.forEach((result) => {
    console.log(
      `   ${result.method} ${result.endpoint}: ${result.requestsPerSecond} req/s, ${result.avgLatency}ms avg, ${result.errorRate}% errors`
    );
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { runLoadTest, TestResult };



