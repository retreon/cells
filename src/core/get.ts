import type { Signal } from './types';
import { trackDependency } from '../utils/dependency-tracker';
import { evaluateFormula } from './formula';

/**
 * Reads the current value of a signal.
 *
 * When called inside a formula computation, automatically tracks
 * the signal as a dependency of that formula.
 *
 * @param signal - The signal to read from
 * @returns The current value of the signal
 *
 * @example
 * ```typescript
 * const count = cell(5);
 * console.log(get(count)); // 5
 *
 * const doubled = formula(() => get(count) * 2);
 * console.log(get(doubled)); // 10
 * ```
 */
export function get<T>(signal: Signal<T>): T {
  // Track this signal as a dependency of the current formula
  trackDependency(signal);

  switch (signal.type) {
    case 'cell':
      return signal.value;
    case 'formula':
      return evaluateFormula(signal);
    case 'source':
      if (signal.isVolatile) {
        // In volatile mode, always fetch fresh
        return signal.fetch();
      } else {
        // In cached mode, fetch if we haven't cached a value yet
        if (!signal.hasCachedValue) {
          signal.cachedValue = signal.fetch();
          signal.hasCachedValue = true;
        }
        return signal.cachedValue as T;
      }
  }
}
