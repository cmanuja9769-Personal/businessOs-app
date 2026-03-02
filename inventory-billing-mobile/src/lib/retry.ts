const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000;

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('socket')
    );
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
