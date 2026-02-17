import { logger } from "@repo/shared-utils";

/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN (default: 30000) */
  resetTimeout?: number;
  /** Maximum number of test requests allowed in HALF_OPEN state (default: 1) */
  halfOpenMaxAttempts?: number;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
}

/**
 * Lightweight Circuit Breaker (zero external dependencies)
 *
 * States:
 * - CLOSED: Normal operation. Requests pass through. Failures are counted.
 *   When failures reach the threshold, transitions to OPEN.
 * - OPEN: All requests are rejected immediately with an error.
 *   After resetTimeout elapses, transitions to HALF_OPEN.
 * - HALF_OPEN: A limited number of test requests are allowed through.
 *   If a test request succeeds, transitions to CLOSED.
 *   If a test request fails, transitions back to OPEN.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenAttempts = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30_000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 1;
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * - CLOSED: Run fn, track failures. If failures >= threshold, open the circuit.
   * - OPEN: Reject immediately. If resetTimeout has elapsed, transition to HALF_OPEN and retry.
   * - HALF_OPEN: Allow a limited number of test requests. Success -> CLOSED, Failure -> OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check for OPEN -> HALF_OPEN timeout transition
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    // In HALF_OPEN, enforce max attempts
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get the current circuit breaker state.
   */
  getState(): CircuitBreakerState {
    // Check for lazy OPEN -> HALF_OPEN transition on read
    if (this.state === CircuitBreakerState.OPEN && this.shouldTransitionToHalfOpen()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
      this.halfOpenAttempts = 0;
    }
    return this.state;
  }

  /**
   * Get circuit breaker statistics.
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  /**
   * Handle a successful execution.
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.successes++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Success in HALF_OPEN means the service has recovered
      this.failures = 0;
      this.halfOpenAttempts = 0;
      this.transitionTo(CircuitBreakerState.CLOSED);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failures = 0;
    }
  }

  /**
   * Handle a failed execution.
   */
  private onFailure(): void {
    this.lastFailure = new Date();
    this.failures++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in HALF_OPEN means the service is still down
      this.halfOpenAttempts = 0;
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failures >= this.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  /**
   * Check whether enough time has passed to transition from OPEN to HALF_OPEN.
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt.getTime() >= this.resetTimeout;
  }

  /**
   * Transition to a new state with logging.
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;

    if (newState === CircuitBreakerState.OPEN) {
      this.openedAt = new Date();
    }

    logger.info(
      `[CircuitBreaker:${this.name}] ${previousState} -> ${newState}` +
        (newState === CircuitBreakerState.OPEN
          ? ` (failures: ${this.failures}, threshold: ${this.failureThreshold})`
          : ""),
    );
  }
}

// ---------------------------------------------------------------------------
// Registry & Factory
// ---------------------------------------------------------------------------

/**
 * Global registry of all circuit breakers.
 * Useful for monitoring / health-check endpoints.
 */
export const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Get or create a circuit breaker by name.
 * If a breaker with the given name already exists it is returned as-is
 * (options are ignored on subsequent calls for the same name).
 */
export function getCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions,
): CircuitBreaker {
  let breaker = circuitBreakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    circuitBreakers.set(name, breaker);
  }
  return breaker;
}
