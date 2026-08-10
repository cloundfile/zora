export function safeAsync<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R | null> {
  return async (...args: A): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch {
      return null;
    }
  };
}

export function safeAsyncWithError<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<{ ok: true; value: R } | { ok: false; error: unknown }> {
  return async (...args: A) => {
    try {
      return { ok: true as const, value: await fn(...args) };
    } catch (error) {
      return { ok: false as const, error };
    }
  };
}