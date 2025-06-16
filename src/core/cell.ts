import type { Cell, Watcher } from './types';
import { globalVersion } from '../utils/version';

/**
 * Adds a watcher to a cell.
 */
export const addCellWatcher = <T>(
  cell: Cell<T>,
  watcher: Watcher<unknown>,
): void => {
  cell.w.add(watcher);
};

/**
 * Removes a watcher from a cell.
 */
export const removeCellWatcher = <T>(
  cell: Cell<T>,
  watcher: Watcher<unknown>,
): void => {
  cell.w.delete(watcher);
};

/**
 * Creates a mutable cell that holds a value.
 *
 * @param initialValue - The initial value of the cell
 * @returns A cell signal that can be read with `get()` and updated with `batch()`
 *
 * @example
 * ```typescript
 * const count = cell(0);
 * console.log(get(count)); // 0
 *
 * batch((swap) => {
 *   swap(count, 5);
 * });
 * console.log(get(count)); // 5
 * ```
 */
export const cell = <T>(initialValue: T): Cell<T> => ({
  t: 'c',
  c: initialValue,
  v: globalVersion,
  w: new Set(),
});
