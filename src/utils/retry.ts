import { logger } from './logger';

export async function withRetry<T>(operation: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const wait = Math.min(1000 * 2 ** (i - 1), 8000);
      logger.warn('Tentativa falhou; preparando retry', { label, attempt: i, attempts, wait, error });
      if (i < attempts) await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}
