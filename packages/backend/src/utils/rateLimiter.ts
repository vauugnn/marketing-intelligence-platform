/**
 * Retry a function with exponential backoff
 * Useful for handling API rate limits
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if not a rate limit error
      const isRateLimitError =
        error.status === 429 ||
        error.code === 'RATE_LIMIT_EXCEEDED' ||
        error.message?.includes('rate limit');

      if (!isRateLimitError || attempt === maxRetries) {
        throw error;
      }

      // Wait with exponential backoff + jitter
      const jitter = Math.random() * 0.1 * delay;
      const waitTime = Math.min(delay + jitter, maxDelay);

      console.log(
        `Rate limited. Retrying in ${Math.round(waitTime)}ms (attempt ${attempt + 1}/${maxRetries})`
      );

      await sleep(waitTime);
      delay *= backoffFactor;
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
