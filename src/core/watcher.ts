import type { Signal, Disposer, ChangeHandler, Cell, Source } from './types';
import { nextVersion } from './version';
import { visitDependencies } from '../utils/dependencies';

/**
 * Watches a signal for changes and calls the handler when it updates.
 *
 * For cells and sources, the handler is called when their value changes.
 * For formulas, the handler is called when any of their dependencies change.
 *
 * @param signal - The signal to watch
 * @param handler - Function to call when the signal changes
 * @returns A disposer function that stops watching when called
 *
 * @example
 * ```typescript
 * const count = cell(0);
 *
 * const dispose = watch(count, () => {
 *   console.log('Count changed to:', get(count));
 * });
 *
 * batch((swap) => {
 *   swap(count, 5); // Logs: "Count changed to: 5"
 * });
 *
 * dispose(); // Stop watching
 * ```
 */
export function watch<T>(signal: Signal<T>, handler: ChangeHandler): Disposer {
  if (signal.type === 'cell' || signal.type === 'source') {
    // For cells and sources, directly add the handler
    signal.watchers.add(handler);

    // For sources, transition from volatile to cached mode
    if (signal.type === 'source' && signal.watchers.size === 1) {
      // First watcher - transition to cached mode
      signal.isVolatile = false;

      // If source has a subscribe function, set up the subscription
      if (signal.subscribe) {
        signal.subscriptionDisposer = signal.subscribe(() => {
          // When source changes, update version and notify watchers
          signal.cachedValue = undefined;
          signal.version = nextVersion();
          handler();
        });
      }
    }

    // Return a disposer function
    return () => {
      signal.watchers.delete(handler);

      // For sources, transition back to volatile mode if no watchers
      if (signal.type === 'source' && signal.watchers.size === 0) {
        signal.isVolatile = true;

        // Clean up subscription
        if (signal.subscriptionDisposer) {
          signal.subscriptionDisposer();
          signal.subscriptionDisposer = undefined;
        }

        // Clear cached value
        signal.cachedValue = undefined;
      }
    };
  } else {
    // For formulas, watch their dependencies instead
    const depWatchers = new Map<Cell<unknown> | Source<unknown>, Disposer>();

    // When dependencies change, update subscriptions and notify
    const wrappedHandler = (): void => {
      // Get current dependencies
      const currentDeps = new Set<Cell<unknown> | Source<unknown>>();
      visitDependencies(signal, (sig) => {
        if (sig.type === 'cell' || sig.type === 'source') {
          currentDeps.add(sig);
        }
      });

      // Remove watchers for dependencies that are no longer used
      for (const [dep, disposer] of depWatchers) {
        if (!currentDeps.has(dep)) {
          disposer();
          depWatchers.delete(dep);
        }
      }

      // Add watchers for new dependencies
      for (const dep of currentDeps) {
        if (!depWatchers.has(dep)) {
          const disposer = watch(dep, wrappedHandler);
          depWatchers.set(dep, disposer);
        }
      }

      // Notify the original handler
      handler();
    };

    // Set up initial dependencies
    const initialDeps = new Set<Cell<unknown> | Source<unknown>>();
    visitDependencies(signal, (sig) => {
      if (sig.type === 'cell' || sig.type === 'source') {
        initialDeps.add(sig);
      }
    });

    for (const dep of initialDeps) {
      const disposer = watch(dep, wrappedHandler);
      depWatchers.set(dep, disposer);
    }

    // Return a disposer that cleans up all dependency watchers
    return () => {
      for (const disposer of depWatchers.values()) {
        disposer();
      }
      depWatchers.clear();
    };
  }
}
