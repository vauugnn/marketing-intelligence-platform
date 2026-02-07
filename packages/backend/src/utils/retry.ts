import { logger } from './logger';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503],
};

/**
 * Executes a function with exponential backoff retry on transient errors.
 * Respects Retry-After headers for 429 responses.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const statusCode = error?.response?.status || error?.status;
      const isRetryable = opts.retryableStatusCodes.includes(statusCode);

      if (attempt >= opts.maxRetries || !isRetryable) {
        throw error;
      }

      // Check for Retry-After header (in seconds)
      const retryAfter = error?.response?.headers?.['retry-after'];
      let delay: number;

      if (retryAfter) {
        delay = parseInt(retryAfter, 10) * 1000;
      } else {
        // Exponential backoff with jitter
        const jitter = Math.random() * 500;
        delay = Math.min(opts.baseDelayMs * Math.pow(2, attempt) + jitter, opts.maxDelayMs);
      }

      logger.warn('Retry', `Attempt ${attempt + 1}/${opts.maxRetries} failed (status: ${statusCode}). Retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { sleep };
