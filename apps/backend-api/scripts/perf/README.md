# Performance Testing Scripts

This directory contains scripts for basic performance and load testing of the backend API.

## Load Testing

The `load-test.ts` script performs simple load tests against key API endpoints to establish performance baselines.

### Usage

```bash
# Run with default settings (10s duration, 10 concurrent requests)
pnpm perf:test

# Customize settings via environment variables
API_URL=http://localhost:3800 PERF_DURATION=30 PERF_CONCURRENCY=20 pnpm perf:test
```

### Environment Variables

- `API_URL`: Base URL of the API (default: `http://localhost:3800`)
- `PERF_DURATION`: Test duration in seconds (default: `10`)
- `PERF_CONCURRENCY`: Number of concurrent requests (default: `10`)

### Output

The script outputs:
- Requests per second (RPS)
- Average, min, max, P95, and P99 latency
- Error rate
- Detailed error breakdown

Results are also saved to `results.json` in this directory.

### Notes

- This is a basic load testing tool for establishing baselines
- For production load testing, consider using specialized tools like `k6`, `autocannon`, or `artillery`
- The script tests public endpoints by default (health checks)
- To test authenticated endpoints, you'll need to modify the script to include authentication tokens






