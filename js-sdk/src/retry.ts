/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for transient failures.
 */

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Base delay in milliseconds (default: 1000) */
    baseDelayMs: number;
    /** Maximum delay in milliseconds (default: 10000) */
    maxDelayMs: number;
    /** Whether to use exponential backoff (default: true) */
    exponentialBackoff: boolean;
    /** Optional function to determine if error is retryable */
    isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retry options.
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
};

/**
 * Default function to determine if an error is retryable.
 * Retries on network/transport errors, not on application-level errors.
 */
export function isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnreset') ||
            message.includes('econnrefused') ||
            message.includes('socket hang up') ||
            message.includes('fetch failed') ||
            message.includes('rate limit') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('504')
        );
    }
    return false;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(
    attempt: number,
    options: RetryOptions
): number {
    if (!options.exponentialBackoff) {
        return options.baseDelayMs;
    }

    // Exponential backoff with jitter
    const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, options.maxDelayMs);
}

/**
 * Execute a function with retry logic.
 *
 * @param fn - Async function to execute
 * @param options - Retry options (partial, merged with defaults)
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxRetries: 5, baseDelayMs: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
): Promise<T> {
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const isRetryable = opts.isRetryable ?? isTransientError;

    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt < opts.maxRetries && isRetryable(error)) {
                const delay = calculateDelay(attempt, opts);
                console.warn(
                    `[SDK] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${Math.round(delay)}ms...`
                );
                await sleep(delay);
            } else {
                // Don't retry - either max attempts reached or error is not retryable
                break;
            }
        }
    }

    throw lastError;
}
