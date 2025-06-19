import { STALE, type Source, type Watcher } from './types';
import { globalVersion, nextVersion } from '../utils/version';
import { isInWatcherContext } from '../utils/dependency-tracker';
import { updateWatcherDependencies } from './watcher';

/**
 * Evaluates a source signal, handling both volatile and cached modes.
 */
export const evaluateSource = <T>(source: Source<T>): T => {
  // Promote immediately if this is the first run in a watcher context.
  if (source.x && isInWatcherContext) {
    promoteSourceNonVolatileSource(source);
  }

  if (source.x) {
    // In volatile mode, always fetch fresh (without `this`).
    return (0, source.r)();
  } else {
    // In cached mode, fetch if we haven't cached a value yet
    if (source.c === STALE) {
      source.c = source.r();
    }
    return source.c as T;
  }
};

/**
 * Promotes a source from volatile to cached mode.
 * This is shared logic used by both watcher context promotion and first watcher addition.
 */
const promoteSourceNonVolatileSource = <T>(source: Source<T>): void => {
  if (!source.x) return; // Already cached

  // If source has a subscribe function, set up the subscription
  if (source.s) {
    source.x = false;
    source.d = source.s(() => {
      // When source changes, update version and notify watchers
      source.c = STALE;
      source.v = nextVersion();

      // Notify all watchers
      for (const watcher of source.w) {
        updateWatcherDependencies(watcher);
      }
    });
  }
};

/**
 * Adds a watcher to a source.
 */
export const addSourceWatcher = <T>(
  source: Source<T>,
  watcher: Watcher<unknown>,
): void => {
  source.w.add(watcher);

  // For sources, transition from volatile to cached mode when first watcher is added
  if (source.w.size === 1) {
    promoteSourceNonVolatileSource(source);
  }
};

/**
 * Removes a watcher from a source.
 */
export const removeSourceWatcher = <T>(
  source: Source<T>,
  watcher: Watcher<unknown>,
): void => {
  source.w.delete(watcher);

  // For sources, transition back to volatile mode if no watchers
  if (source.w.size === 0) {
    source.x = true;

    // Clean up subscription
    if (source.d) {
      source.d();
      source.d = undefined;
    }

    // Clear cached value
    source.c = STALE;
  }
};

/**
 * Creates a source signal that bridges external data into the reactive system.
 *
 * Sources have two modes:
 * - **Volatile**: When unwatched, always fetches fresh data
 * - **Cached**: When watched, caches the value and updates via subscription
 *
 * @param read - Function that retrieves the current value
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
  read: () => T,
  subscribe?: (onChange: () => void) => () => void,
): Source<T> => ({
  t: 's',
  r: read,
  s: subscribe,
  c: STALE,
  v: globalVersion,
  w: new Set(),
  x: true,
  d: undefined,
});
