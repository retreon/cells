import type { Cell } from './types';
import { currentVersion } from './version';

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
export function cell<T>(initialValue: T): Cell<T> {
  return {
    type: 'cell',
    value: initialValue,
    version: currentVersion(),
    watchers: new Set(),
  };
}
