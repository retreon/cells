import type { Signal, Disposer, ChangeHandler, Watcher } from './types';
import { visitDependencies } from '../utils/dependencies';
import { addCellWatcher, removeCellWatcher } from './cell';
import { addSourceWatcher, removeSourceWatcher } from './source';
import { withWatcherContext } from '../utils/dependency-tracker';

const createWatcher = <T>(
  signal: Signal<T>,
  onChange: ChangeHandler,
): Watcher<T> => ({
  s: signal,
  c: onChange,
  d: new Set(),
});

export const updateWatcherDependencies = (
  watcher: Watcher<unknown>,
  emit = true,
): void => {
  const nextDependencies = withWatcherContext(() =>
    visitDependencies(watcher.s),
  );

  // Attach watchers to any new dependencies
  nextDependencies.forEach((dep) => {
    if (!watcher.d.has(dep)) {
      if (dep.t === 'c') {
        addCellWatcher(dep, watcher);
      } else if (dep.t === 's') {
        addSourceWatcher(dep, watcher);
      }
    }
  });

  // Remove watchers from dependencies that are no longer used
  watcher.d.forEach((dep) => {
    if (!nextDependencies.has(dep)) {
      if (dep.t === 'c') {
        removeCellWatcher(dep, watcher);
      } else if (dep.t === 's') {
        removeSourceWatcher(dep, watcher);
      }
    }
  });

  watcher.d = nextDependencies;

  if (emit) {
    // Invoke without `this` context.
    (0, watcher.c)();
  }
};

const disposeWatcher = (watcher: Watcher<unknown>): void => {
  watcher.d.forEach((dep) => {
    if (dep.t === 'c') {
      removeCellWatcher(dep, watcher);
    } else if (dep.t === 's') {
      removeSourceWatcher(dep, watcher);
    }
  });

  // Guards agianst double disposal
  watcher.d.clear();
};

/**
 * Watches a signal for changes and calls the handler when it updates.
 *
 * For cells and sources, the handler is called when their value changes.
 * For formulas, the handler is called when any of their dependencies change.
 *
 * @param signal - The signal to watch
 * @param onChange - Function to call when the signal changes
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
  onChange: ChangeHandler,
): Disposer => {
  const watcher = createWatcher(signal, onChange);
  updateWatcherDependencies(watcher, false);

  return () => disposeWatcher(watcher);
};
