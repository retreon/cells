import type { Source, Watcher } from './types';
import { globalVersion, nextVersion } from './version';

/**
 * Adds a watcher to a source.
 */
export const addSourceWatcher = <T>(
  source: Source<T>,
  watcher: Watcher<unknown>,
): void => {
  source.watchers.add(watcher);

  // For sources, transition from volatile to cached mode
  if (source.watchers.size === 1) {
    // First watcher - transition to cached mode
    source.isVolatile = false;

    // If source has a subscribe function, set up the subscription
    if (source.subscribe) {
      source.subscriptionDisposer = source.subscribe(() => {
        // When source changes, update version and notify watchers
        source.cachedValue = undefined;
        source.hasCachedValue = false;
        source.version = nextVersion();

        // Notify all watchers
        for (const watcher of source.watchers) {
          watcher.onChange();
        }
      });
    }
  }
};

/**
 * Removes a watcher from a source.
 */
export const removeSourceWatcher = <T>(
  source: Source<T>,
  watcher: Watcher<unknown>,
): void => {
  source.watchers.delete(watcher);

  // For sources, transition back to volatile mode if no watchers
  if (source.watchers.size === 0) {
    source.isVolatile = true;

    // Clean up subscription
    if (source.subscriptionDisposer) {
      source.subscriptionDisposer();
      source.subscriptionDisposer = undefined;
    }

    // Clear cached value
    source.cachedValue = undefined;
    source.hasCachedValue = false;
  }
};

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
export const source = <T>(
  fetch: () => T,
  subscribe?: (onChange: () => void) => () => void,
): Source<T> => ({
  type: 'source',
  fetch,
  subscribe,
  cachedValue: undefined,
  version: globalVersion,
  watchers: new Set(),
  isVolatile: true,
  hasCachedValue: false,
  subscriptionDisposer: undefined,
});
