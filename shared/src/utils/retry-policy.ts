export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryableError extends Error {
  statusCode?: number;
  retryable?: boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: RetryableError;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as RetryableError;

      // Don't retry on client errors (4xx) unless explicitly marked as retryable
      if (
        lastError.statusCode &&
        lastError.statusCode >= 400 &&
        lastError.statusCode < 500 &&
        !lastError.retryable
      ) {
        throw error;
      }

      if (attempt < finalConfig.maxAttempts) {
        console.error(
          `Attempt ${attempt}/${finalConfig.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(
          delay * finalConfig.backoffMultiplier,
          finalConfig.maxDelay
        );
      }
    }
  }

  throw new Error(
    `Max retry attempts (${finalConfig.maxAttempts}) reached: ${lastError!.message}`
  );
}

