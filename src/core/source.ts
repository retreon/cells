import type { Source } from './types';
import { globalVersion } from './version';

/**
 * Creates a source signal that bridges external data into the reactive system.
 *
 * Sources have two modes:
 * - **Volatile**: When unwatched, always fetches fresh data
 * - **Cached**: When watched, caches the value and updates via subscription
 *
 * @param fetch - Function that retrieves the current value
 * @param subscribe - Optional function to subscribe to changes.
 *                   Receives a callback to notify of changes.
 *                   Returns a cleanup function.
 * @returns A source signal that can be read with `get()`
 *
 * @example
 * ```typescript
 * // Simple source without subscription
 * const random = source(() => Math.random());
 *
 * // Source with subscription
 * const timer = source(
 *   () => Date.now(),
 *   (onChange) => {
 *     const id = setInterval(onChange, 1000);
 *     return () => clearInterval(id);
 *   }
 * );
 * ```
 */
export function source<T>(
  fetch: () => T,
  subscribe?: (onChange: () => void) => () => void,
): Source<T> {
  return {
    type: 'source',
    fetch,
    subscribe,
    cachedValue: undefined,
    version: globalVersion,
    watchers: new Set(),
    isVolatile: true,
    subscriptionDisposer: undefined,
  };
}
