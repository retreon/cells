import type { Signal, Disposer, ChangeHandler, Cell, Source } from './types';
import { visitDependencies } from '../utils/dependencies';
import { addCellWatcher, removeCellWatcher } from './cell';
import { addSourceWatcher, removeSourceWatcher } from './source';

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
export const watch = <T>(
  signal: Signal<T>,
  handler: ChangeHandler,
): Disposer => {
  if (signal.type === 'cell') {
    addCellWatcher(signal, handler);
    return () => removeCellWatcher(signal, handler);
  } else if (signal.type === 'source') {
    addSourceWatcher(signal, handler);
    return () => removeSourceWatcher(signal, handler);
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
};
