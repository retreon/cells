import type { Cell, ChangeHandler } from './types';
import { nextVersion } from './version';

// Module-scoped state for tracking batch context
let isBatching = false;
const pendingNotifications = new Set<ChangeHandler>();

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
 *
 * @example
 * ```typescript
 * const x = cell(1);
 * const y = cell(2);
 *
 * batch((swap) => {
 *   swap(x, 10);
 *   swap(y, 20);
 * });
 * ```
 */
export function batch(fn: (swap: SwapFunction) => void): void {
  if (isBatching) {
    // Nested batch - just execute immediately
    fn(swap);
    return;
  }

  isBatching = true;
  pendingNotifications.clear();

  try {
    fn(swap);

    // Notify all watchers after batch completes
    for (const handler of pendingNotifications) {
      handler();
    }
  } finally {
    isBatching = false;
    pendingNotifications.clear();
  }
}

function swap<T>(cell: Cell<T>, newValue: T): void {
  if (!isBatching) {
    throw new Error('Cell mutations must occur within a batch()');
  }

  if (cell.value !== newValue) {
    cell.value = newValue;
    cell.version = nextVersion();

    // Queue notifications for after batch completes
    for (const watcher of cell.watchers) {
      pendingNotifications.add(watcher);
    }
  }
}

export function notifyWatchers(watchers: Set<ChangeHandler>): void {
  if (isBatching) {
    // Queue notifications for after batch completes
    for (const watcher of watchers) {
      pendingNotifications.add(watcher);
    }
  } else {
    // Not in a batch - notify immediately
    for (const watcher of watchers) {
      watcher();
    }
  }
}
