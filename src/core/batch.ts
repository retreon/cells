import type { Cell, Watcher } from './types';
import { nextVersion } from '../utils/version';
import { updateWatcherDependencies } from './watcher';

// Module-scoped state for tracking batch context
let isBatching = false;
const pendingNotifications = new Set<Watcher<unknown>>();

export type SwapFunction = <T>(cell: Cell<T>, newValue: T) => void;

/**
 * Batches multiple cell updates into a single transaction.
 *
 * All cell mutations must occur within a batch. This ensures that:
 * - Multiple updates are applied atomically
 * - Watchers are notified only once after all updates
 * - No intermediate inconsistent states are observable
 *
 * @param fn - Function that receives a swap function for updating cells
 * @returns The return value of the provided function
 *
 * @example
 * ```typescript
 * const x = cell(1);
 * const y = cell(2);
 *
 * const result = batch((swap) => {
 *   swap(x, 10);
 *   swap(y, 20);
 *   return 'updated';
 * });
 * // result === 'updated'
 * ```
 */
export function batch<T>(fn: (swap: SwapFunction) => T): T {
  if (isBatching) {
    // Nested batch - just execute immediately
    return fn(swap);
  }

  isBatching = true;
  pendingNotifications.clear();

  try {
    const result = fn(swap);

    // Notify all watchers after batch completes
    for (const watcher of pendingNotifications) {
      updateWatcherDependencies(watcher);
    }

    return result;
  } finally {
    isBatching = false;
    pendingNotifications.clear();
  }
}

function swap<T>(cell: Cell<T>, newValue: T): void {
  if (!isBatching) {
    throw new Error('Cell mutations must occur within a batch()');
  }

  if (cell.c !== newValue) {
    cell.c = newValue;
    cell.v = nextVersion();

    // Queue notifications for after batch completes
    for (const watcher of cell.w) {
      pendingNotifications.add(watcher);
    }
  }
}

export const notifyWatchers = (watchers: Set<Watcher<unknown>>): void => {
  // Queue notifications for after batch completes
  for (const watcher of watchers) {
    pendingNotifications.add(watcher);
  }
};
