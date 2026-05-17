/**
 * Shared utilities for the enrichment pipeline.
 * Keep these dependency-free so they're easy to test.
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; delays?: number[]; label?: string } = {}
): Promise<T> {
  const { attempts = 3, delays = [0, 500, 1500], label = 'op' } = opts;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      // Don't retry 4xx errors — they won't suddenly succeed.
      const msg = e instanceof Error ? e.message : String(e);
      if (/\b4\d{2}\b/.test(msg)) break;
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function timed<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  return fn().then((result) => ({ result, durationMs: Date.now() - start }));
}

/**
 * Resolves a relative URL against a base. Returns null if unparseable.
 */
export function absoluteUrl(maybeRelative: string | null | undefined, base: string): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

/**
 * Normalizes whitespace and trims. Returns null if empty.
 */
export function cleanText(s: string | null | undefined, maxLen = 1000): string | null {
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}
